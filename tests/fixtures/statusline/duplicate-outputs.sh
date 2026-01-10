#!/bin/bash
# A statusline.sh with DUPLICATE status references (broken state)

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

# --- claude-code-anywhere status --- v3
CCA_STATUS=""
_CCA_PORT=$(cat ~/.config/claude-code-anywhere/port 2>/dev/null)
_SESSION_ID=$(cat ~/.config/claude-code-anywhere/current-session-id 2>/dev/null)
if [ -n "$_CCA_PORT" ] && [ -n "$_SESSION_ID" ]; then
    _ACTIVE=$(curl -s --max-time 0.3 "http://localhost:$_CCA_PORT/api/active?sessionId=$_SESSION_ID" 2>/dev/null | grep -o '"active":true')
    if [ -n "$_ACTIVE" ]; then
        CCA_STATUS=$(printf " │ \033[32mCCA\033[0m")
    else
        CCA_STATUS=$(printf " │ \033[38;5;244mcca\033[0m")
    fi
else
    CCA_STATUS=$(printf " │ \033[38;5;244mcca\033[0m")
fi
# --- end cca status ---

# Output - DUPLICATE references!
printf "%s" "$STATUS$CCA_STATUS$CCA_STATUS"
