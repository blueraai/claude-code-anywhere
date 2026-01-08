---
description: Toggle email notifications on/off or check status
argument-hint: "[on|off|status]"
allowed-tools:
  - Bash
---

# /notify Command

Control email notifications for Claude Code.

## Usage

- `/notify on` - Start the server and enable notifications
- `/notify off` - Stop the server and disable notifications
- `/notify status` - Show current notification status

## Implementation

Parse the user's argument and execute the appropriate action:

### For `on`:

1. Check if server is already running:
```bash
curl -s http://localhost:3847/api/status
```

2. If not running, start it in the background:
```bash
cd "${CLAUDE_PLUGIN_ROOT}" && nohup bun run server > /tmp/claude-code-anywhere-server.log 2>&1 &
```

**Note:** Server logs are written to `logs/MM-DD-YY.log` in the plugin directory.

3. Wait for server to be ready (up to 5 seconds):
```bash
for i in 1 2 3 4 5; do curl -s http://localhost:3847/api/status >/dev/null 2>&1 && break || sleep 1; done
```

4. Enable for this session:
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/enable
```

Then confirm: "Email notifications enabled. Server is running."

### For `off`:

1. Disable for this session:
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/disable 2>/dev/null || true
```

2. Stop the server:
```bash
kill $(lsof -t -i:3847) 2>/dev/null || true
```

Then confirm: "Email notifications disabled. Server stopped."

### For `status`:
```bash
curl -s http://localhost:3847/api/status
```

Display the server status including:
- Whether the server is running
- Whether notifications are enabled globally
- Number of active sessions

If the server is not running, report: "Server is not running. Use `/notify on` to start."
