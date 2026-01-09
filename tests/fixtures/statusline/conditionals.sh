#!/bin/bash
# A statusline.sh with complex conditionals and multiple output paths

# Get git info
GIT_BRANCH=$(git branch --show-current 2>/dev/null)
GIT_DIRTY=""
if ! git diff --quiet 2>/dev/null; then
    GIT_DIRTY="*"
fi

# Check if in git repo
if [ -n "$GIT_BRANCH" ]; then
    # In a git repo
    if [ -n "$GIT_DIRTY" ]; then
        # Has uncommitted changes
        printf "\033[33m%s%s\033[0m" "$GIT_BRANCH" "$GIT_DIRTY"
    else
        # Clean working tree
        printf "\033[32m%s\033[0m" "$GIT_BRANCH"
    fi
else
    # Not in a git repo
    printf "\033[90mno-git\033[0m"
fi
