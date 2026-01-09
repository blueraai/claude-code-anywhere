---
description: Install global notification support for all Claude sessions
allowed-tools:
  - Bash(${CLAUDE_PLUGIN_ROOT}/scripts/install.sh)
  - Bash(rm -f ~/.config/claude-code-anywhere/*)
---

# /cca install

Install global notification support so ALL Claude Code sessions get notifications automatically.

## What This Installs

1. **PATH shim** at `~/.claude-code-anywhere/bin/claude`
   - Intercepts `claude` commands and auto-loads the plugin
2. **Background daemon** (launchd on macOS, systemd on Linux)
   - Runs persistently, survives reboots
3. **Plugin files** at `~/.claude-code-anywhere/plugins/claude-code-anywhere/`
4. **One line** added to your `.zshrc`/`.bashrc` for PATH

## Before vs After

| Aspect | Before (Session-Only) | After (Global) |
|--------|----------------------|----------------|
| New terminal | Need `/cca on` | Just works |
| Multiple sessions | Each needs setup | All connected |
| Daemon | Stops with session | Always running |
| Reboots | Need restart | Auto-starts |

## Workflow

1. Confirm the user wants to proceed
2. Run the installer: `${CLAUDE_PLUGIN_ROOT}/scripts/install.sh`
3. Clear the "shown install message" marker so updates show fresh messages
4. Report success and remind to restart shell

## Post-Install Steps

After running this command, tell the user:

1. **Restart your shell**: `exec $SHELL` or open a new terminal
2. **Verify**: `which claude` should show `~/.claude-code-anywhere/bin/claude`
3. **Test**: Start a new Claude session and run `/cca-test`
4. **Diagnose**: Run `/cca-doctor` if anything seems wrong

## To Uninstall Later

```
/cca uninstall
```

Or manually: `bash ~/.claude-code-anywhere/plugins/claude-code-anywhere/scripts/uninstall.sh`
