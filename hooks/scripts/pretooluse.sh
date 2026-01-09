#!/bin/bash
# Hook script for PreToolUse events
# Requests user approval via email for Bash/Write/Edit tools
#
# Safe for dogfooding: exits 0 (allow) if server isn't running

# Read JSON input from stdin
INPUT=$(cat)

# Get port from port file (written by server on startup)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_FILE="$SCRIPT_DIR/../../port"
PORT=$(cat "$PORT_FILE" 2>/dev/null)

# No port file = server not running
if [ -z "$PORT" ]; then
  exit 0
fi

BRIDGE_URL="http://localhost:$PORT"

# Fast check: is server running? (1 second timeout)
if ! curl -s --connect-timeout 1 "$BRIDGE_URL/api/status" > /dev/null 2>&1; then
  exit 0
fi

# Extract session_id and tool_name from JSON input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {}')

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Check if session is enabled
ENABLED=$(curl -s -X GET "$BRIDGE_URL/api/session/${SESSION_ID}/enabled" 2>/dev/null)
if ! echo "$ENABLED" | grep -q '"enabled":true'; then
  # Session not enabled, allow the tool
  exit 0
fi

# Build approval message with tool details
MESSAGE="Tool: $TOOL_NAME - Approve? (Y/N)"

# Register session and send approval request
curl -s -X POST "$BRIDGE_URL/api/session" \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\": \"$SESSION_ID\", \"event\": \"PreToolUse\", \"prompt\": $(echo "$MESSAGE" | jq -Rs .)}" > /dev/null

# Poll for response (60 attempts, 5 seconds each = 5 minutes timeout)
for i in $(seq 1 60); do
  RESP=$(curl -s "$BRIDGE_URL/api/response/${SESSION_ID}" 2>/dev/null)

  if echo "$RESP" | grep -q '"response"'; then
    ANSWER=$(echo "$RESP" | grep -o '"response":"[^"]*"' | cut -d'"' -f4)

    if echo "$ANSWER" | grep -qi '^y'; then
      # Approved
      exit 0
    else
      # Denied
      echo '{"decision": "block", "reason": "User denied via email"}'
      exit 0
    fi
  fi

  sleep 5
done

# Timeout
echo '{"decision": "block", "reason": "Email approval timeout"}'
