# /notify

Toggle notifications on/off or check status. See @skills/notify-server/skill.md for implementation details.

## Context

!`curl -s http://localhost:3847/api/status 2>/dev/null || echo '{"running": false}'`

## Usage

- `/notify on` - Start server and enable notifications
- `/notify off` - Stop server and disable notifications
- `/notify status` - Show current status

## Workflow

### `on`
1. Check if server running (see context above)
2. If not running, start it (see skill)
3. Wait for ready, then enable session
4. Confirm: "Notifications enabled. Server running."

### `off`
1. Disable session
2. Stop server
3. Confirm: "Notifications disabled. Server stopped."

### `status`
Report from context above:
- Server running/stopped
- Notifications enabled/disabled
- Active sessions count
