#!/bin/bash
# A statusline.sh with OLD version of claude-code-anywhere block (no version marker, old logic)

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

# --- claude-code-anywhere status ---
CCA_STATUS=""
_CCA_PORT=$(cat ~/.claude-code-anywhere/plugins/claude-code-anywhere/port 2>/dev/null)
if [ -n "$_CCA_PORT" ] && curl -s --max-time 0.3 "http://localhost:$_CCA_PORT/api/status" >/dev/null 2>&1; then
    CCA_STATUS=$(printf " │ \033[32mCCA\033[0m")
else
    CCA_STATUS=$(printf " │ \033[90mcca\033[0m")
fi
# --- end cca status ---

# Output
printf "%s" "$STATUS$CCA_STATUS"
