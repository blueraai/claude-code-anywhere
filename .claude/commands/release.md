# Release

Cut a release and monitor CI/CD. See @.claude/skills/release/skill.md for workflow details.

## Context

!`grep '"version"' package.json | head -1`

## Quick Release

```bash
bun run release:$1   # patch | minor | major
```

This bumps version, commits, tags, and pushes in one command.

## Monitor

After push, use `gh run list --limit 3` then `gh run watch <id>` to monitor CI.
