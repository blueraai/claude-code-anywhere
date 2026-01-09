#!/bin/bash
# A fresh statusline.sh with no claude-code-anywhere block

# Get git info
GIT_BRANCH=$(git branch --show-current 2>/dev/null)
GIT_STATUS=""
if [ -n "$GIT_BRANCH" ]; then
    if git diff --quiet 2>/dev/null; then
        GIT_STATUS="$GIT_BRANCH"
    else
        GIT_STATUS="$GIT_BRANCH*"
    fi
fi

# Build status line
STATUS="$GIT_STATUS"

# Output
printf "%s" "$STATUS"
