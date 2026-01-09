# THIS IS .claude/CLAUDE.md - PLUGIN DEVELOPMENT CONTEXT

**STOP. READ THIS FIRST.**

This file is for **developing** the claude-code-anywhere plugin. It is NOT for end users.

---

## Development Mode

Run Claude Code with this plugin:
```bash
claude --plugin-dir .
```

## Plugin Structure

| Directory | Purpose |
|-----------|---------|
| `.claude-plugin/` | Plugin manifest (`plugin.json`) |
| `commands/` | Slash commands (cca.md, cca-test.md, etc.) |
| `hooks/` | Hook definitions and scripts |
| `skills/` | Skills for complex workflows |
| `scripts/` | Shell scripts (cpr.sh, server-status.sh, install.sh, uninstall.sh) |
| `src/` | TypeScript source code |
| `dist/` | Compiled JavaScript (committed for plugin distribution) |
| `tests/` | Vitest test files |

## Live Testing

**Start server:**
```bash
bun run server
```

**Check status:**
```bash
./scripts/server-status.sh
```

## Environment Variables

In hooks context:
- `CLAUDE_PLUGIN_ROOT` - Plugin installation path
- `CLAUDE_SESSION_ID` - Current session ID

## Common Issues

**"NOT_CONFIGURED":** Ensure running with `--plugin-dir .` or plugin is installed via `/plugin add`.

**Server not responding:** Start with `bun run server`.
