---
description: Send a test email to verify the setup is working
allowed-tools:
  - Bash
---

# /notify-test Command

Send a test email to verify the Claude Code notification setup is working correctly.

## Implementation

1. First check if the server is running:
```bash
curl -s http://localhost:3847/api/status
```

If the server is not reachable, inform the user:
"Bridge server is not running. Start it with: bun run server"

2. If the server is running, send a test message:
```bash
curl -s -X POST http://localhost:3847/api/send \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "'$CLAUDE_SESSION_ID'", "event": "Notification", "message": "Test message from Claude Code. Your email notification setup is working!"}'
```

3. Report the result to the user:
- If successful: "Test email sent! Check your inbox."
- If failed: Show the error message and suggest troubleshooting steps.

## Troubleshooting Tips

If the test fails, suggest:
1. Check that environment variables are set (EMAIL_USER, EMAIL_PASS, EMAIL_RECIPIENT)
2. Verify the app password is correct (16-character Google app password)
3. Check the server logs for SMTP errors
4. Ensure 2FA is enabled on the Gmail account (required for app passwords)
