#!/bin/bash
# Hook script for Stop events
# Notifies email bridge that session ended
#
# Safe for dogfooding: exits silently if server isn't running

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

# Extract session_id from JSON input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

curl -s -X POST "$BRIDGE_URL/api/send" \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\": \"$SESSION_ID\", \"event\": \"Stop\", \"message\": \"Session ended\"}"
