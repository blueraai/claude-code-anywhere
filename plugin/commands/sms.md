---
description: Toggle SMS notifications on/off or check status
argument-hint: "[on|off|status] [--all]"
allowed-tools:
  - Bash
---

# /sms Command

Control SMS notifications for Claude Code.

## Usage

- `/sms on` - Enable SMS for this session
- `/sms on --all` - Enable SMS globally (all sessions)
- `/sms off` - Disable SMS for this session
- `/sms off --all` - Disable SMS globally (all sessions)
- `/sms status` - Show current SMS status

## Implementation

Parse the user's argument and execute the appropriate action:

### For `on`:
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/enable
```
Then confirm: "SMS notifications enabled for this session."

### For `on --all`:
```bash
curl -s -X POST http://localhost:3847/api/enable
```
Then confirm: "SMS notifications enabled globally."

### For `off`:
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/disable
```
Then confirm: "SMS notifications disabled for this session."

### For `off --all`:
```bash
curl -s -X POST http://localhost:3847/api/disable
```
Then confirm: "SMS notifications disabled globally."

### For `status`:
```bash
curl -s http://localhost:3847/api/status
```
Display the server status including:
- Whether SMS is enabled globally
- Number of active sessions
- Tunnel URL if available

If the server is not running, inform the user:
"SMS bridge server is not running. Start it with: npx claude-sms server --tunnel"
