---
name: statusline-setup
description: Configure Claude Code status line to show notify status
version: 1.0.0
---

# Statusline Setup

Intelligently inject notify on/off indicator into any user's statusline.sh.

## Indicator Format

- `NOTIFY` (green \033[32m) when notify server is running
- `notify` (dim gray \033[90m) when notify server is off

## Code Block to Inject

This exact block must be inserted:

```bash
# --- claude-code-anywhere notify status ---
NOTIFY_STATUS=""
_NOTIFY_PORT=$(cat ~/.claude-code-anywhere/plugins/claude-code-anywhere/port 2>/dev/null)
if [ -n "$_NOTIFY_PORT" ] && curl -s --max-time 0.3 "http://localhost:$_NOTIFY_PORT/api/status" >/dev/null 2>&1; then
    NOTIFY_STATUS=$(printf " │ \033[32mNOTIFY\033[0m")
else
    NOTIFY_STATUS=$(printf " │ \033[90mnotify\033[0m")
fi
# --- end notify status ---
```

## Marker Comments

- Start: `# --- claude-code-anywhere notify status ---`
- End: `# --- end notify status ---`

These markers enable clean identification and removal.

## Intelligent Injection Strategy

Every statusline.sh is different. Analyze the file structure carefully.

### Step 1: Read and Understand

Read the entire ~/.claude/statusline.sh. Identify:
- Where variables are defined (usually top section)
- Where logic/computation happens (middle section)
- Where output happens (printf/echo at the end)
- The output method used (printf, echo, or other)

### Step 2: Insert the Code Block

Insert the notify code block:
- AFTER all variable definitions and existing logic
- BEFORE the final output statement(s)
- Look for patterns like comments preceding output, or the first printf/echo

Use Edit tool to insert the block at the correct location.

### Step 3: Append to Output

Find ALL lines that produce output and append `"$NOTIFY_STATUS"`:

**Pattern A - printf with format string:**
```bash
# Before:
printf "...format..." "$VAR1" "$VAR2"
# After:
printf "...format..." "$VAR1" "$VAR2""$NOTIFY_STATUS"
```

**Pattern B - echo:**
```bash
# Before:
echo "$STATUS_LINE"
# After:
echo "$STATUS_LINE$NOTIFY_STATUS"
```

**Pattern C - Multiple conditional outputs:**
If the file has if/elif/else with different printf/echo calls, append to EACH output line.

**Pattern D - Here documents or complex output:**
Find the final output mechanism and append appropriately.

### Step 4: Verify

After edits, the file should:
1. Contain the marker comments with code block
2. Have `$NOTIFY_STATUS` appended to all output paths

## Removal Strategy

### Step 1: Find and Remove Block

Locate everything from `# --- claude-code-anywhere notify status ---` through `# --- end notify status ---` (inclusive) and delete those lines.

### Step 2: Remove $NOTIFY_STATUS References

Find and remove all occurrences of:
- `"$NOTIFY_STATUS"`
- `$NOTIFY_STATUS`

from output lines. Be careful to preserve the rest of the line.

## Edge Cases

| Case | Action |
|------|--------|
| No statusline.sh | Tell user to set up a statusline first |
| Already has markers | Report "already enabled" for `on` |
| No markers found | Report "not currently enabled" for `off` |
| Complex conditionals | Append to every output path |
| Non-printf output | Adapt to echo, cat, or other methods |
| Multiple output lines | Append to ALL of them |
