---
description: Cut a release and monitor CI/CD
argument-hint: patch | minor | major
allowed-tools:
  - Bash(bun run version:*)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git push *)
  - Bash(git status *)
  - Bash(git log *)
  - Bash(git diff *)
  - Bash(cat package.json)
  - Bash(gh run list *)
  - Bash(gh run watch *)
  - Bash(gh run view *)
  - Bash(gh release view *)
---

# /release

Cut a new release using package.json scripts and monitor GitHub Actions.

**Release type:** `$1`

## Current Version

!`grep '"version"' package.json | head -1`

## Workflow

1. **Bump version**: `bun run version:$1` (updates package.json, plugin.json, CHANGELOG.md)
2. **Stage changes**: `git add -A`
3. **Commit**: `git commit -m "chore(release): <new-version>"`
4. **Push**: `git push`
5. **Monitor CI**: `gh run watch` on the triggered workflow

## Post-Push Monitoring

After push, GitHub Actions automatically:
1. Runs CI workflow (lint, typecheck, tests, build)
2. Auto Release workflow creates and pushes tag
3. Release workflow creates GitHub release

Use `gh run list --limit 5` to see recent runs, then `gh run watch <run-id>` to monitor.

## Troubleshooting

| Issue | Command |
|-------|---------|
| View latest release | `gh release view --json tagName,publishedAt` |
| Check workflow logs | `gh run view <run-id> --log-failed` |
| Re-run failed workflow | `gh run rerun <run-id>` |
