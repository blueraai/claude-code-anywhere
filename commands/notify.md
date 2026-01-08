---
description: Toggle notifications on/off or check status
argument-hint: on | off | status | install | uninstall
allowed-tools:
  - Bash(.claude/cpr.sh *)
  - Bash(curl * http://localhost:*/api/*)
  - Bash(test -x ~/.claude-notify/*)
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/install.sh)
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/uninstall.sh)
  - Bash(launchctl *)
  - Bash(systemctl *)
  - Bash(kill *)
  - Bash(rm -f *)
---

# /notify

Toggle notifications on/off, check status, or manage global installation.

See @skills/notify-server/skill.md for implementation details.

**Action requested:** `$1`

## Plugin Root

!`.claude/cpr.sh 2>/dev/null || echo "NOT_CONFIGURED"`

## Server Status

!`curl -s http://localhost:3847/api/status 2>/dev/null || echo '{"running": false}'`

## Installation Status

!`test -x ~/.claude-notify/bin/claude && echo "GLOBAL" || echo "SESSION_ONLY"`

## Usage

### Basic Commands
- `/notify on` - Start server and enable notifications (this session)
- `/notify off` - Stop server and disable notifications (this session)
- `/notify status` - Show current status

### Global Installation
- `/notify install` - Install global mode (all sessions get notifications)
- `/notify uninstall` - Remove global installation
- `/notify on --global` - Alias for `/notify install`
- `/notify off --global` - Stop global daemon (keeps shim installed)

## Workflow

### `on`
1. Check plugin root (see context above)
2. If "NOT_CONFIGURED": Run `@skills/bootstrap/skill.md` first, then retry
3. Check if server running
4. If not running, start it: `cd "<plugin-root>" && nohup bun run server > /tmp/claude-code-anywhere-server.log 2>&1 &`
5. Wait for ready, then enable session
6. Confirm with channel status (see `status` workflow below for format)

### `on --global`
Same as `/notify install` - see below.

### `off`
1. Disable session
2. Stop server
3. Confirm with final channel status before stopping (see `status` workflow below for format)

### `off --global`
1. Stop the global daemon:
   - macOS: `launchctl unload ~/Library/LaunchAgents/com.claude.notify.plist`
   - Linux: `systemctl --user stop claude-notify.service`
2. Note: This keeps the shim installed for easy re-enable
3. To fully remove, use `/notify uninstall`

### `status`
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
> "ℹ️ Running in session-only mode. Run `/notify install` for global notifications."

### `install`
1. Explain what will be installed (see @commands/notify-install.md)
2. Run `${CLAUDE_PLUGIN_ROOT}/scripts/install.sh`
3. Clear the "shown" marker: `rm -f ~/.config/claude-code-anywhere/shown-install-message`
4. Report success, remind to restart shell

### `uninstall`
1. Confirm user wants to uninstall
2. Run `${CLAUDE_PLUGIN_ROOT}/scripts/uninstall.sh`
3. Report success
