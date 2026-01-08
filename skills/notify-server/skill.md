---
name: notify-server
description: Bridge server management for Claude Code Anywhere notifications
version: 1.0.0
---

# Notify Server Management

Implementation details for managing the notification bridge server.

## Server Commands

### Check Status
```bash
curl -s http://localhost:3847/api/status
```

### Start Server
```bash
cd "${CLAUDE_PLUGIN_ROOT}" && nohup bun run server > /tmp/claude-code-anywhere-server.log 2>&1 &
```

Wait for ready (up to 5 seconds):
```bash
for i in 1 2 3 4 5; do curl -s http://localhost:3847/api/status >/dev/null 2>&1 && break || sleep 1; done
```

### Stop Server
```bash
kill $(lsof -t -i:3847) 2>/dev/null || true
```

## Session Management

### Enable Session
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/enable
```

### Disable Session
```bash
curl -s -X POST http://localhost:3847/api/session/$CLAUDE_SESSION_ID/disable 2>/dev/null || true
```

## Send Test Message
```bash
curl -s -X POST http://localhost:3847/api/send \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "'$CLAUDE_SESSION_ID'", "event": "Notification", "message": "Test message from Claude Code. Your notification setup is working!"}'
```

## Logs

Server logs: `logs/MM-DD-YY.log` in plugin directory.

## Troubleshooting

If notifications fail:
1. Check environment variables: `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_RECIPIENT` (or `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
2. For Gmail: Verify app password is correct (16-character), 2FA is enabled
3. Check server logs for SMTP/API errors
4. Ensure at least one channel is configured
