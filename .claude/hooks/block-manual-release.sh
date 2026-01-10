#!/bin/bash
# Block manual release commands - must use /release skill
#
# Exit codes:
# 0 = allow (not a release command)
# 2 = block with message (manual release attempt)

# Read tool input from stdin
INPUT=$(cat)

# Extract the command from Bash tool input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# If no command, allow
[ -z "$COMMAND" ] && exit 0

# Block patterns for manual release commands
if echo "$COMMAND" | grep -qE '(bun run (release|version:(patch|minor|major)))|(git tag v[0-9])|(gh release create)'; then
  echo "Manual release commands are blocked. Use /release instead." >&2
  exit 2
fi

exit 0
