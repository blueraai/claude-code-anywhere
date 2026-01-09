---
description: Send a test notification to verify setup
allowed-tools:
  - Bash(curl * http://localhost:*/api/*)
  - Bash(cat */port)
---

# /notify-test

Send a test notification to verify setup. See @skills/notify-server/skill.md for troubleshooting.

## Server Status

!`PORT=$(cat ~/.claude-code-anywhere/plugins/claude-code-anywhere/port 2>/dev/null || cat "${CLAUDE_PLUGIN_ROOT:-./}"/port 2>/dev/null) && curl -s http://localhost:$PORT/api/status 2>/dev/null || echo '{"running": false, "error": "no port file - server not started"}'`

## Workflow

1. Check server status (see context above)
2. If not running: "Server not running. Use `/notify on` first."
3. If running: Send test message (see skill)
4. Report result:
   - Success: "Test sent! Check your inbox/Telegram."
   - Failure: Show error, suggest troubleshooting (see skill)
