---
description: Manage terminal status indicator in Claude Code statusline
argument-hint: "[add|remove]"
allowed-tools:
  - Read(~/.claude/statusline.sh)
  - Edit(~/.claude/statusline.sh)
  - Bash(head ~/.claude/statusline.sh *)
---

# /cca-statusline

Add, update, or remove the CCA status indicator from your Claude Code statusline.

**Action requested:** `$1`

## Current Statusline

Check via: `head -30 ~/.claude/statusline.sh 2>/dev/null || echo "NOT_FOUND"`

## Usage

- `/cca-statusline add` - Add or update status indicator
- `/cca-statusline remove` - Remove status indicator

## What It Shows

Once added, your statusline will display:
- **CCA** (green) - Notifications active (global enabled OR session enabled)
- **cca** (dim gray) - Notifications inactive for this session

## Workflow

See @skills/statusline-setup/skill.md for implementation details.

### `add` (Idempotent - safe to run multiple times)

1. Check if ~/.claude/statusline.sh exists (see context above)
2. If "NOT_FOUND": inform user they need a statusline first
3. Read the entire file with Read tool
4. Check for markers:
   - START: `# --- claude-code-anywhere status ---`
   - END: `# --- end cca status ---`
5. Check for version marker (e.g., `--- v1`)

**CASE A: No markers found**
- Inject the code block from skill.md
- Append `$CCA_STATUS` to all output lines (printf/echo)

**CASE B: Both markers found with current version (v1)**
- Check if `$CCA_STATUS` is in output lines
- If missing: append to output lines
- If present (exactly once): report "already up to date"
- If duplicates: remove duplicates, keep one

**CASE C: Markers found with old/no version**
- REPLACE entire block (from start marker to end marker, inclusive) with new version
- Ensure `$CCA_STATUS` is in output lines (add if missing, don't duplicate)

**CASE D: Partial markers (only start or only end)**
- Remove the partial marker line
- Inject fresh block as in Case A

6. Confirm success with summary of actions taken

### `remove`

1. Check if ~/.claude/statusline.sh exists
2. If "NOT_FOUND": inform user - nothing to remove
3. Read the entire file with Read tool
4. Check if markers exist
5. If no markers: report "not currently enabled"
6. Remove everything between markers (inclusive of marker lines)
7. Remove ALL `$CCA_STATUS` references from output lines:
   - `"$CCA_STATUS"` (quoted)
   - `$CCA_STATUS` (unquoted)
8. Confirm removal
