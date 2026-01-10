#!/bin/bash
# SessionStart hook - auto-register session with server, show install guidance
#
# This script runs on every session start. It:
# 1. Persists session ID for use by bash commands
# 2. Auto-registers session with server if running (enables automatic notifications)
# 3. Shows a one-time explanation of SESSION-ONLY vs GLOBAL modes
# 4. Does NOT auto-install anything - user must explicitly run /cca-install
#
# Opt-out: export CLAUDE_CCA_AUTO=0

set -e

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/claude-code-anywhere"
DISABLE_FILE="$CONFIG_DIR/disable-autoinstall"
SHOWN_FILE="$CONFIG_DIR/shown-install-message"
SHIM_PATH="$HOME/.claude-code-anywhere/bin/claude"
SESSION_FILE="$CONFIG_DIR/current-session-id"

mkdir -p "$CONFIG_DIR"

# Read hook input from stdin (JSON with session_id)
# Claude Code passes hook data via stdin, not environment variables
HOOK_INPUT=$(cat)
SESSION_ID=$(echo "$HOOK_INPUT" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4 2>/dev/null || true)

# Persist session ID for bash commands
if [ -n "$SESSION_ID" ]; then
  echo "$SESSION_ID" > "$SESSION_FILE"

  # Auto-register with server if running (non-blocking)
  # Find port from either local dev or installed plugin
  PORT_FILE=""
  if [ -f "${CLAUDE_PLUGIN_ROOT:-}/port" ]; then
    PORT_FILE="${CLAUDE_PLUGIN_ROOT}/port"
  elif [ -f "$HOME/.config/claude-code-anywhere/port" ]; then
    PORT_FILE="$HOME/.config/claude-code-anywhere/port"
  fi

  if [ -n "$PORT_FILE" ] && [ -f "$PORT_FILE" ]; then
    PORT=$(cat "$PORT_FILE" 2>/dev/null || true)
    if [ -n "$PORT" ]; then
      # Check for version mismatch - restart server if plugin was updated
      SERVER_VERSION=$(curl -s --max-time 1 "http://localhost:${PORT}/" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || true)
      if [ -n "$SERVER_VERSION" ] && [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
        PLUGIN_VERSION=$(cat "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json" 2>/dev/null | grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4 || true)
        if [ -n "$PLUGIN_VERSION" ] && [ "$SERVER_VERSION" != "$PLUGIN_VERSION" ]; then
          # Version mismatch - kill old server and start new one
          pkill -f "bun run server" 2>/dev/null || true
          sleep 1
          # Start new server in background from plugin root
          cd "${CLAUDE_PLUGIN_ROOT}" && nohup bun run server > /tmp/claude-code-anywhere-server.log 2>&1 &
          sleep 2
          # Update PORT from new server
          PORT=$(cat "$PORT_FILE" 2>/dev/null || true)
        fi
      fi

      # Synchronous registration with short timeout - enables session for notifications
      # Using synchronous curl (no &) to ensure registration completes before hook exits
      if [ -n "$PORT" ]; then
        curl -s -X POST "http://localhost:${PORT}/api/session/${SESSION_ID}/enable" \
          --max-time 1 >/dev/null 2>&1 || true
      fi
    fi
  fi
fi

# Opt-out via environment variable
if [ "${CLAUDE_CCA_AUTO:-1}" = "0" ]; then
  exit 0
fi

# Opt-out via sentinel file
if [ -f "$DISABLE_FILE" ]; then
  exit 0
fi

# Already installed globally - exit silently
if [ -x "$SHIM_PATH" ]; then
  exit 0
fi

# Already shown message - don't nag every session
if [ -f "$SHOWN_FILE" ]; then
  exit 0
fi

# Mark as shown (one-time message)
touch "$SHOWN_FILE"

# Print guidance message
cat <<'EOF'

╭─────────────────────────────────────────────────────────────────╮
│  claude-code-anywhere: Choose Your Notification Mode            │
╰─────────────────────────────────────────────────────────────────╯

You have two options for how notifications work:

┌─────────────────────────────────────────────────────────────────┐
│  SESSION-ONLY (current default)                                 │
├─────────────────────────────────────────────────────────────────┤
│  • Notifications work in sessions where you run `/cca on`    │
│  • Each terminal/IDE needs its own `/cca on`                 │
│  • Server stops when you close the session                      │
│                                                                 │
│  Multiple sessions?                                             │
│    Only sessions with `/cca on` get notifications.           │
│    Others are silent.                                           │
│                                                                 │
│  Good for: Trying it out, occasional use, single-project work   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  GLOBAL (recommended for daily use)                             │
├─────────────────────────────────────────────────────────────────┤
│  • Notifications work in ALL Claude sessions automatically      │
│  • Background daemon runs persistently (survives reboots)       │
│  • No setup needed per-session - just works                     │
│                                                                 │
│  Multiple sessions?                                             │
│    ALL sessions automatically connect to the shared daemon.     │
│    Reply from your phone → routes to the correct session.       │
│                                                                 │
│  Good for: Daily use, multiple projects, power users            │
│                                                                 │
│  What it installs:                                              │
│    • PATH shim at ~/.claude-code-anywhere/bin/claude                   │
│    • Background service (launchd on macOS, systemd on Linux)    │
│    • Adds one line to your .zshrc/.bashrc                       │
└─────────────────────────────────────────────────────────────────┘

To enable GLOBAL mode:    /cca-install
To suppress this message: export CLAUDE_CCA_AUTO=0

EOF

exit 0
