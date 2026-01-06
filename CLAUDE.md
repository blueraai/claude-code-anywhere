# THIS IS CLAUDE.md - YOUR MEMORY FILE

**STOP. READ THIS FIRST.**

This file is YOUR (Claude's) project memory. It is NOT user documentation. It is NOT a README.

| File | Purpose | Audience |
|------|---------|----------|
| **CLAUDE.md** (this file) | Claude Code's memory - scripts, workflows, coding rules | YOU (Claude) |
| **README.md** | User-facing documentation - features, installation, API | HUMANS (users) |

**When to update this file:** When scripts, CI/CD workflows, build processes, or coding conventions change.

**Keep this file LEAN.** This entire file loads into your context every session. Be concise. No prose. No redundancy. Every line must earn its place.

---

## Scripts

**Development:**
- `bun run build` - Compile TypeScript
- `bun run test:run` - Run tests once
- `bun run precommit` - Full validation (lint, typecheck, tests, build)

**Versioning (after code changes):**
- `bun run version:patch` - Bump patch version (updates package.json, plugin/plugin.json, CHANGELOG.md)
- `bun run version:minor` - Bump minor version
- `bun run version:major` - Bump major version

**Releasing (Fully Automated):**
1. Bump version: `bun run version:patch` (or minor/major)
2. Commit: `git commit -am "chore: bump version to X.Y.Z"`
3. Push: `git push`
4. **Done!** GitHub Actions handles the rest automatically

**What happens automatically:**
- `CI` workflow runs (lint, typecheck, tests, build)
- `Auto Release` workflow waits for CI, then creates & pushes tag
- `Release` workflow creates GitHub release

## Distribution Requirements

**`dist/` MUST be committed to git** - This is intentional, not an oversight:

1. **Claude Code plugins are copied to a cache during installation** - no build step runs
   - Plugins need pre-built files ready to execute immediately

2. **npm publishing also uses committed dist/** - No `files` array in package.json, so npm includes whatever isn't in `.gitignore`

**After any code change:**
1. Run `bun run build` (or `bun run precommit` which includes build)
2. Commit both source AND dist/ changes together

## ALWAYS

* use the `bun run version:*` commands after changes
    * without this, the changes would not be detected by Claude Code
* push to master after version bump - releases happen automatically (no manual tagging needed)
* fail early and fast
  * our code is expected to *work* as-designed
    * use "throw" when state is unexpected or for any error condition
    * use 100% strict typing; no "any" no "as", unless completely unavoidable and considered best practice

## NEVER

* use `--no-verify` on Git commits; this anti-pattern completely circumvents the code protections we have in place
* write "fallback code" or "graceful degradation" code or implement "defaults" *unless* it's part of the specification
* leave commented code, nor reference outdated/deprecated implementations
