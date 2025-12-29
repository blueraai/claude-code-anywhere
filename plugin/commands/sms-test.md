---
description: Send a test SMS to verify the setup is working
allowed-tools:
  - Bash
---

# /sms-test Command

Send a test SMS message to verify the Claude SMS setup is working correctly.

## Implementation

1. First check if the server is running:
```bash
curl -s http://localhost:3847/api/status
```

If the server is not reachable, inform the user:
"SMS bridge server is not running. Start it with: npx claude-sms server --tunnel"

2. If the server is running, send a test message:
```bash
curl -s -X POST http://localhost:3847/api/send \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "'$CLAUDE_SESSION_ID'", "event": "Notification", "message": "Test message from Claude Code. Your SMS setup is working!"}'
```

3. Report the result to the user:
- If successful: "Test SMS sent! Check your phone."
- If failed: Show the error message and suggest troubleshooting steps.

## Troubleshooting Tips

If the test fails, suggest:
1. Check that environment variables are set (TWILIO_ACCOUNT_SID, etc.)
2. Verify the Twilio phone number is SMS-capable
3. Check the server logs for errors
4. Ensure the tunnel is running if webhook responses are needed
