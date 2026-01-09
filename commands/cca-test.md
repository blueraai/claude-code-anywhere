---
description: Send a test notification to verify setup
allowed-tools:
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/server-status.sh *)
  - Bash(curl * http://localhost:*/api/*)
  - Bash(cat */port)
---

# /cca-test

Send a test notification to verify setup. See @skills/cca-server/skill.md for troubleshooting.

## Server Status

!`${CLAUDE_PLUGIN_ROOT}/scripts/server-status.sh 2>/dev/null || echo '{"running": false, "error": "server not started"}'`

## Workflow

1. Check server status (see context above)
2. If not running: "Server not running. Use `/cca on` first."
3. If running: Send test message (see skill)
4. Report result:
   - Success: "Test sent! Check your inbox/Telegram."
   - Failure: Show error, suggest troubleshooting (see skill)
