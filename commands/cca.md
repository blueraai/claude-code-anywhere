---
description: Toggle notifications on/off or check status
argument-hint: "[on|off] [--all]"
allowed-tools:
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/cpr.sh *)
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/server-status.sh *)
  - Bash(curl * http://localhost:*/api/*)
  - Bash(test -x ~/.claude-code-anywhere/*)
  - Bash(cat */port)
  - Bash(cat ~/.config/claude-code-anywhere/current-session-id)
  - Bash(pkill -f "bun run server" *)
---

# /cca

Toggle notifications on/off or check status.

See @skills/cca-server/skill.md for implementation details.

**Action requested:** `$1`

## Plugin Root

!`${CLAUDE_PLUGIN_ROOT}/scripts/cpr.sh 2>/dev/null || echo "NOT_CONFIGURED"`

## Server Status

!`${CLAUDE_PLUGIN_ROOT}/scripts/server-status.sh 2>/dev/null || echo '{"running": false, "error": "server not started"}'`

## Installation Status

Check via: `test -x ~/.claude-code-anywhere/bin/claude && echo "GLOBAL" || echo "SESSION_ONLY"`

## Current Session ID

Read via: `cat ~/.config/claude-code-anywhere/current-session-id`

## Usage

- `/cca` - Show current status
- `/cca on` - Enable notifications for **this session**
- `/cca off` - Disable notifications for **this session**
- `/cca on --all` - Enable notifications for **all sessions**
- `/cca off --all` - Disable notifications for **all sessions**

**Related commands:**
- `/cca-install` - Install global mode (daemon + auto-start)
- `/cca-uninstall` - Remove global installation
- `/cca-statusline` - Add/remove terminal status indicator
- `/cca-test` - Send a test notification
- `/cca-doctor` - Diagnose configuration issues

## Workflow

### (no args) - Status
Report from context above:
- **Installation mode**: Global or Session-only
- Server running/stopped
- Notifications enabled/disabled
- Active sessions count
- For each channel in `channels` array:
  - Name (Email/Telegram)
  - Config details from `config` object:
    - Email: `from` and `to` addresses
    - Telegram: `chatId`
  - Enabled status
  - Connected status
  - Last activity (formatted as relative time if available)
  - Any error message

If Installation Status is "SESSION_ONLY", include:
> "ℹ️ Running in session-only mode. Run `/cca-install` for global notifications."

### `on` (this session)
1. Check plugin root (see context above)
2. If "NOT_CONFIGURED": Run `@skills/bootstrap/skill.md` first, then retry
3. Get session ID from "Current Session ID" context above
4. If "NO_SESSION": inform user to restart Claude Code (session ID is set on SessionStart)
5. Check if server running (from Server Status context above)
6. If not running, start it: `cd "<plugin-root>" && nohup bun run server > /tmp/claude-code-anywhere-server.log 2>&1 &`
7. Wait for server to be ready (poll `/api/status` until it responds)
8. Enable this session only: `curl -X POST http://localhost:$PORT/api/session/<session-id>/enable`
9. Confirm with channel status

### `on --all` (all sessions)
1. Check plugin root (same as `on` steps 1-2)
2. Check if server running, start if needed (same as `on` steps 5-7)
3. Enable globally: `curl -X POST http://localhost:$PORT/api/enable`
4. Confirm with channel status

### `off` (this session)
1. Get session ID from "Current Session ID" context above
2. If "NO_SESSION": inform user to restart Claude Code (session ID is set on SessionStart)
3. Disable this session only: `curl -X POST http://localhost:$PORT/api/session/<session-id>/disable`
4. **Do NOT stop the server** (other sessions may still be active)
5. Confirm with status showing session disabled

### `off --all` (all sessions)
1. Disable globally: `curl -X POST http://localhost:$PORT/api/disable`
2. Stop server: `pkill -f "bun run server"`
3. Confirm server stopped
