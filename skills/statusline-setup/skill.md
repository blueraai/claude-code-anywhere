---
name: statusline-setup
description: Configure Claude Code status line to show notification status
version: 1.0.0
---

# Statusline Setup

Intelligently inject, update, or remove the notification status indicator in the user's statusline.sh.

## Indicator Format

- `CCA` (green \033[32m) when notifications are active (global enabled OR session enabled)
- `cca` (gray \033[38;5;244m) when notifications are inactive for this session

## Code Block to Inject

Current version: **v2**

This exact block must be inserted:

```bash
# --- claude-code-anywhere status --- v2
CCA_STATUS=""
_CCA_PORT=$(cat ~/.claude-code-anywhere/plugins/claude-code-anywhere/port 2>/dev/null)
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
```

## Marker Comments

- Start: `# --- claude-code-anywhere status ---` (optionally followed by version like `v1`)
- End: `# --- end cca status ---`

These markers enable clean identification, update, and removal.

## Version Detection

The start marker may include a version suffix:
- `# --- claude-code-anywhere status --- v2` (current version)
- `# --- claude-code-anywhere status --- v1` (old version - invisible gray on dark terminals)
- `# --- claude-code-anywhere status ---` (old version, no suffix)

When updating, ALWAYS use the versioned marker (`v2`).

## Idempotent Update Strategy

The `/statusline on` command is idempotent - safe to run multiple times:

### Detection Phase

1. Read entire ~/.claude/statusline.sh
2. Check for start marker (`# --- claude-code-anywhere status ---`)
3. Check for end marker (`# --- end cca status ---`)
4. Check for version in start marker (look for `v1` or similar)
5. Count `$CCA_STATUS` references in output lines (outside the block)

### Decision Matrix

| Has Block | Version | Output Refs | Action |
|-----------|---------|-------------|--------|
| No | - | 0 | Fresh install: inject block + append to outputs |
| No | - | 1+ | Partial: inject block, don't duplicate outputs |
| Yes | v2 | 1 | Up to date: report "already up to date" |
| Yes | v2 | 0 | Repair: add $CCA_STATUS to outputs |
| Yes | v2 | 2+ | Repair: remove duplicate refs, keep one |
| Yes | v1/old/none | any | Update: replace block with v2, fix outputs |
| Partial | - | any | Cleanup: remove partial, fresh install |

### Injection Strategy

Every statusline.sh is different. Analyze the file structure carefully.

#### Step 1: Read and Understand

Identify:
- Where variables are defined (usually top section)
- Where logic/computation happens (middle section)
- Where output happens (printf/echo at the end)
- The output method used (printf, echo, or other)

#### Step 2: Insert the Code Block

Insert the CCA code block:
- AFTER all variable definitions and existing logic
- BEFORE the final output statement(s)
- Look for patterns like comments preceding output, or the first printf/echo

Use Edit tool to insert the block at the correct location.

#### Step 3: Append to Output

Find ALL lines that produce output and append `$CCA_STATUS`:

**Pattern A - printf with format string:**
```bash
# Before:
printf "...format..." "$VAR1" "$VAR2"
# After:
printf "...format..." "$VAR1" "$VAR2""$CCA_STATUS"
```

**Pattern B - echo:**
```bash
# Before:
echo "$STATUS_LINE"
# After:
echo "$STATUS_LINE$CCA_STATUS"
```

**Pattern C - Multiple conditional outputs:**
If the file has if/elif/else with different printf/echo calls, append to EACH output line.

**Pattern D - Here documents or complex output:**
Find the final output mechanism and append appropriately.

#### Step 4: Verify

After edits, the file should:
1. Contain the marker comments with code block (versioned)
2. Have exactly ONE `$CCA_STATUS` appended to each output path

## Update Strategy

When updating an existing installation:

### Step 1: Locate Existing Block

Find everything from the start marker through the end marker (inclusive).

### Step 2: Replace Block

Use Edit tool to replace the entire old block with the new versioned block.

### Step 3: Fix Output References

- If 0 refs: append to all output lines
- If 1 ref: keep as-is
- If 2+ refs: remove duplicates (keep the first occurrence only)

## Removal Strategy

### Step 1: Find and Remove Block

Locate everything from `# --- claude-code-anywhere status ---` through `# --- end cca status ---` (inclusive) and delete those lines.

### Step 2: Remove $CCA_STATUS References

Find and remove ALL occurrences of:
- `"$CCA_STATUS"`
- `$CCA_STATUS`

from output lines. Be careful to preserve the rest of the line.

## Edge Cases

| Case | Action |
|------|--------|
| No statusline.sh | Tell user to set up a statusline first |
| Already current version | Report "already up to date" |
| Old version | Update to current version |
| Partial block | Clean up and fresh install |
| Missing output ref | Add to output lines |
| Duplicate output refs | Remove duplicates |
| Complex conditionals | Append to every output path |
| Non-printf output | Adapt to echo, cat, or other methods |
| Multiple output lines | Append to ALL of them |
