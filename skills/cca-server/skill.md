---
name: cca-server
description: Bridge server management for Claude Code Anywhere notifications
version: 1.0.0
---

# CCA Server Management

Implementation details for managing the notification bridge server.

**Important**: The `Plugin Root` path from command context must be used for server commands.
`${CLAUDE_PLUGIN_ROOT}` is only available in hooks, not skill/command execution.
See [GitHub #9354](https://github.com/anthropics/claude-code/issues/9354).

## Server Commands

All commands use the port from the `port` file (written by server on startup):
```bash
PORT=$(cat "<plugin-root>/port" 2>/dev/null)
[ -z "$PORT" ] && { echo "Server not started (no port file)"; exit 1; }
```

### Check Status
```bash
curl -s "http://localhost:$PORT/api/status"
```

### Start Server
Use the plugin root path from command context:
```bash
cd "<plugin-root>" && nohup bun run server >> logs/server.log 2>&1 &
```

Wait for ready (up to 5 seconds):
```bash
for i in 1 2 3 4 5; do curl -s "http://localhost:$PORT/api/status" >/dev/null 2>&1 && break || sleep 1; done
```

### Stop Server
```bash
pkill -f "bun run server" 2>/dev/null || true
```

## Global Enable/Disable

### Enable Notifications Globally
```bash
curl -s -X POST "http://localhost:$PORT/api/enable"
```

### Disable Notifications Globally
```bash
curl -s -X POST "http://localhost:$PORT/api/disable"
```

## Session-Specific Enable/Disable

Session ID is persisted by SessionStart hook to `~/.config/claude-code-anywhere/current-session-id`.

### Enable for Current Session Only
```bash
SESSION_ID=$(cat ~/.config/claude-code-anywhere/current-session-id)
curl -s -X POST "http://localhost:$PORT/api/session/$SESSION_ID/enable"
```

### Disable for Current Session Only
```bash
SESSION_ID=$(cat ~/.config/claude-code-anywhere/current-session-id)
curl -s -X POST "http://localhost:$PORT/api/session/$SESSION_ID/disable"
```

## Send Test Message
```bash
SESSION_ID=$(cat ~/.config/claude-code-anywhere/current-session-id)
curl -s -X POST "http://localhost:$PORT/api/send" \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "'"$SESSION_ID"'", "event": "Notification", "message": "Test message from Claude Code. Your notification setup is working!"}'
```

## Logs

Server logs: `logs/YY-MM-DD.log` in plugin directory.

## Troubleshooting

If notifications fail:
1. Check environment variables: `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_RECIPIENT` (or `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
2. For Gmail: Verify app password is correct (16-character), 2FA is enabled
3. Check server logs for SMTP/API errors
4. Ensure at least one channel is configured
