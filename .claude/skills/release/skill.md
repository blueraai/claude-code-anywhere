---
name: release
description: Release workflow using package.json scripts and GitHub Actions monitoring
version: 1.0.0
---

# Release Workflow

## Package.json Scripts

**IMPORTANT:** All release commands MUST be prefixed with `__SKILL__=release` to bypass the manual-release hook.

| Script | What it does |
|--------|--------------|
| `__SKILL__=release bun run release` | **Auto-detect** bump from commits, commit, push (tag created by CI) |
| `__SKILL__=release bun run release:patch` | Force patch (0.0.x) |
| `__SKILL__=release bun run release:minor` | Force minor (0.x.0) |
| `__SKILL__=release bun run release:major` | Force major (x.0.0) |

**Note:** Tags are NOT pushed locally. The Auto Release workflow waits for CI to pass, then creates and pushes the tag. This prevents releasing with failing tests.

## Pre-flight Checks

Before running any release command, you MUST:

1. Run `git status` to check for uncommitted changes
2. If there are uncommitted changes:
   - Run `/commit` to commit all pending changes
   - Verify the commit succeeded before proceeding
3. Only proceed with release after working directory is clean

## Auto-Detection Rules

When using `bun run release` (recommended), the version bump is determined by commit messages since the last tag:

| Commit Type | Version Bump |
|-------------|--------------|
| `fix(scope): ...` | patch |
| `feat(scope): ...` | minor |
| `feat!: ...` or `BREAKING CHANGE:` in body | major |

Other types (`docs:`, `chore:`, `refactor:`, `test:`, `style:`, `ci:`, `build:`, `perf:`) trigger a patch bump if present alongside fix/feat commits.

Use explicit scripts (`release:patch`, `release:minor`, `release:major`) only when you need to override auto-detection.

## GitHub Actions Flow

After push, three workflows run automatically:

1. **CI** - lint, typecheck, tests, build
2. **Auto Release** - waits for CI, creates/pushes tag
3. **Release** - creates GitHub release from tag

## Required Workflow

After running the release command, you MUST monitor workflows until ALL complete successfully:

1. Wait ~20 seconds for workflows to start and complete
2. Run `gh run list --limit 5` to check all workflow statuses
3. If any still `in_progress`, wait and re-check
4. Verify release: `gh release view v<version>`
5. Report final status table + release URL

**Do NOT consider the release complete until:**
- All workflows show `completed` with `success` status
- The GitHub release is published and accessible

If any workflow fails:
- Run `gh run view <run-id> --log-failed` to see error details
- Report the failure to the user with actionable next steps

## Monitoring Commands

```bash
# Efficient (minimal output):
sleep 20 && gh run list --limit 5  # Wait then check all statuses
gh release view v<version>          # Verify release exists

# If workflows still running:
gh run list --limit 5               # Re-check statuses

# Only if failure - get details:
gh run view <run-id> --log-failed   # See failure logs
```

**AVOID:** `gh run watch` - outputs excessive progress updates that waste context.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CI failed | Fix issue, run release again |
| Tag exists | Delete tag: `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z` |
| Workflow stuck | `gh run cancel <id>` then re-push |
| Re-run workflow | `gh run rerun <run-id>` |
| Wrong version detected | Use explicit `:patch`, `:minor`, or `:major` variant |
