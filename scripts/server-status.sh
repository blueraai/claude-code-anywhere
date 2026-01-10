#!/bin/bash
# Server status checker for claude-code-anywhere
#
# Uses canonical port file location (~/.config/claude-code-anywhere/port)
# so status works regardless of which plugin context is running

# Canonical port file location (same as hooks use)
PORT_FILE="$HOME/.config/claude-code-anywhere/port"

if [ ! -f "$PORT_FILE" ]; then
    echo '{"running": false, "error": "no port file - server not started"}'
    exit 0
fi

PORT=$(cat "$PORT_FILE" 2>/dev/null)
if [ -z "$PORT" ]; then
    echo '{"running": false, "error": "empty port file"}'
    exit 0
fi

# Query server status
curl -s --max-time 2 "http://localhost:${PORT}/api/status" 2>/dev/null || echo '{"running": false, "error": "server not responding"}'
