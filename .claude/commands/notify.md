---
description: Toggle email notifications on/off or check status
argument-hint: "[on|off|status] [--all]"
allowed-tools:
  - Bash
---

# /notify Command

Control email notifications for Claude Code.

## Usage

- `/notify on` - Enable notifications for this session
- `/notify on --all` - Enable notifications globally (all sessions)
- `/notify off` - Disable notifications for this session
- `/notify off --all` - Disable notifications globally (all sessions)
- `/notify status` - Show current notification status

## Implementation

Parse the user's argument and execute the appropriate action:

### For `on`:
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/enable
```
Then confirm: "Email notifications enabled for this session."

### For `on --all`:
```bash
curl -s -X POST http://localhost:3847/api/enable
```
Then confirm: "Email notifications enabled globally."

### For `off`:
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/disable
```
Then confirm: "Email notifications disabled for this session."

### For `off --all`:
```bash
curl -s -X POST http://localhost:3847/api/disable
```
Then confirm: "Email notifications disabled globally."

### For `status`:
```bash
curl -s http://localhost:3847/api/status
```
Display the server status including:
- Whether notifications are enabled globally
- Number of active sessions

If the server is not running, inform the user:
"Bridge server is not running. Start it with: bun run server"
