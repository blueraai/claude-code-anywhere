#!/bin/bash
# SessionStart hook - check if global install exists, show guidance if not
#
# This script runs on every session start. It:
# 1. Checks if global installation is complete
# 2. Shows a one-time explanation of SESSION-ONLY vs GLOBAL modes
# 3. Does NOT auto-install anything - user must explicitly run /notify install
#
# Opt-out: export CLAUDE_NOTIFY_AUTO=0

set -e

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/claude-code-anywhere"
DISABLE_FILE="$CONFIG_DIR/disable-autoinstall"
SHOWN_FILE="$CONFIG_DIR/shown-install-message"
SHIM_PATH="$HOME/.claude-notify/bin/claude"

mkdir -p "$CONFIG_DIR"

# Opt-out via environment variable
if [ "${CLAUDE_NOTIFY_AUTO:-1}" = "0" ]; then
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
│  • Notifications work in sessions where you run `/notify on`    │
│  • Each terminal/IDE needs its own `/notify on`                 │
│  • Server stops when you close the session                      │
│                                                                 │
│  Multiple sessions?                                             │
│    Only sessions with `/notify on` get notifications.           │
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
│    • PATH shim at ~/.claude-notify/bin/claude                   │
│    • Background service (launchd on macOS, systemd on Linux)    │
│    • Adds one line to your .zshrc/.bashrc                       │
└─────────────────────────────────────────────────────────────────┘

To enable GLOBAL mode:    /notify install
To suppress this message: export CLAUDE_NOTIFY_AUTO=0

EOF

exit 0
