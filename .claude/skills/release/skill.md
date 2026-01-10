---
name: release
description: Release workflow using package.json scripts and GitHub Actions monitoring
version: 1.0.0
---

# Release Workflow

## Package.json Scripts

| Script | What it does |
|--------|--------------|
| `bun run release:patch` | Bump 0.0.x, commit, tag, push |
| `bun run release:minor` | Bump 0.x.0, commit, tag, push |
| `bun run release:major` | Bump x.0.0, commit, tag, push |

These use `commit-and-tag-version` under the hood.

## When to Use Each

| Change Type | Version |
|-------------|---------|
| Bug fixes, docs, minor tweaks | `patch` |
| New features, non-breaking | `minor` |
| Breaking changes, renames | `major` |

## GitHub Actions Flow

After push, three workflows run automatically:

1. **CI** - lint, typecheck, tests, build
2. **Auto Release** - waits for CI, creates/pushes tag
3. **Release** - creates GitHub release from tag

## Monitoring Commands

```bash
gh run list --limit 5              # See recent runs
gh run watch <run-id>              # Watch live
gh run view <run-id>               # View completed
gh run view <run-id> --log-failed  # See failure logs
gh release view                    # View latest release
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CI failed | Fix issue, `bun run release:patch` again |
| Tag exists | Delete tag: `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z` |
| Workflow stuck | `gh run cancel <id>` then re-push |
| Re-run workflow | `gh run rerun <run-id>` |
