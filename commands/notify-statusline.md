---
description: Add notify status indicator to Claude Code statusline
argument-hint: on | off
allowed-tools:
  - Read(~/.claude/statusline.sh)
  - Edit(~/.claude/statusline.sh)
  - Bash(head ~/.claude/statusline.sh *)
---

# /notify-statusline

Add or remove the notify status indicator from your Claude Code statusline.

**Action requested:** `$1`

## Current Statusline

!`head -20 ~/.claude/statusline.sh 2>/dev/null || echo "NOT_FOUND"`

## Usage

- `/notify-statusline on` - Add notify indicator to statusline
- `/notify-statusline off` - Remove notify indicator from statusline

## Workflow

See @skills/statusline-setup/skill.md for implementation.

### `on`
1. Check if ~/.claude/statusline.sh exists (see context above)
2. If "NOT_FOUND": inform user they need a statusline first
3. Read the entire file with Read tool
4. Check if notify indicator already present (look for marker comment `# --- claude-code-anywhere notify status ---`)
5. If already present: report "already enabled"
6. If not present: use Edit tool to inject code block and append $NOTIFY_STATUS to output
7. Confirm success

### `off`
1. Check if ~/.claude/statusline.sh exists
2. Read the entire file with Read tool
3. Check if markers exist
4. If not present: report "not currently enabled"
5. Remove notify indicator code (between marker comments, inclusive)
6. Remove `"$NOTIFY_STATUS"` or `$NOTIFY_STATUS` from output lines
7. Confirm removal
