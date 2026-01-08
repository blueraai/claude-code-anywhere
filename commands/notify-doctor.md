---
description: Diagnose Claude Code Anywhere installation and configuration
allowed-tools:
  - Bash(which -a claude)
  - Bash(curl * http://localhost:*/api/*)
  - Bash(cat */port)
  - Bash(launchctl list * com.claude.code-anywhere *)
  - Bash(systemctl --user is-active claude-code-anywhere.service *)
  - Bash(test -f ~/.claude-code-anywhere/*)
  - Read(~/.claude-code-anywhere/manifest.json)
  - Read(~/.claude-code-anywhere/plugins/claude-code-anywhere/.env)
  - Read(~/.claude-code-anywhere/plugins/claude-code-anywhere/plugin.json)
---

# /notify-doctor

Diagnose installation status and configuration of Claude Code Anywhere.

## Installation Modes

First, detect which installation mode is active:

1. **Global Install**: `~/.claude-code-anywhere/bin/claude` shim exists
2. **Plugin Install**: Installed via `claude /plugin add`
3. **Dogfooding**: Running via `--plugin-dir .` (development mode)

Detection order:
1. Check if `~/.claude-code-anywhere/bin/claude` exists → Global Install
2. Check if server is running via API → Some mode is active
3. If server running but no global install → Dogfooding/Plugin mode

## Diagnostic Checks

### 1. Detect Installation Mode

```bash
# Check for global install
test -f ~/.claude-code-anywhere/bin/claude && echo "global" || echo "not-global"
```

```bash
# Check server status
curl -s --max-time 2 http://localhost:3847/api/status 2>/dev/null || echo '{"running": false}'
```

Based on results:
- Global install exists → Mode: **Global Install**
- No global install + server running → Mode: **Dogfooding/Plugin**
- No global install + server not running → Mode: **Not Installed**

### 2. Mode-Specific Checks

**For Global Install mode:**
- ✅/❌ Shim is first in PATH
- ✅/❌ Daemon service running (launchd/systemd)
- ✅/❌ Plugin files exist

**For Dogfooding/Plugin mode:**
- ✅ Server running (this is what matters!)
- ℹ️ "Global install not configured (optional)"
- ℹ️ "Using plugin via --plugin-dir or /plugin add"

**For Not Installed mode:**
- ❌ Server not running
- Suggest: Run `/notify on` or `bash scripts/install.sh`

### 3. Channel Configuration (all modes)

Get channel info from server status API response:
- Check `channels` array in status response
- For each channel, show: name, enabled, connected, config

### 4. PATH Shim Check (Global Install only)

```bash
which -a claude 2>/dev/null | head -5
```

Only show ❌ if global install exists but shim not first in PATH.

### 5. Service Status (Global Install only)

**macOS:**
```bash
launchctl list | grep com.claude.notify 2>/dev/null || echo "not found"
```

**Linux:**
```bash
systemctl --user is-active claude-code-anywhere.service 2>/dev/null || echo "not found"
```

## Output Format

**Global Install Mode:**
```
╭─────────────────────────────────────────╮
│  Claude Code Anywhere - Diagnostics    │
╰─────────────────────────────────────────╯

## Installation Mode
✅ Global Install (all sessions get notifications)

## PATH Check
✅ Shim is first in PATH: ~/.claude-code-anywhere/bin/claude
   Real claude: /opt/homebrew/bin/claude

## Service Status
✅ Daemon running (launchd: com.claude.notify)

## Server Status
✅ API responding: http://localhost:3847
   Uptime: 91 minutes
   Active sessions: 1

## Channels
✅ Email: sender@gmail.com → you@example.com
✅ Telegram: Chat ID 123456789
```

**Dogfooding/Plugin Mode:**
```
╭─────────────────────────────────────────╮
│  Claude Code Anywhere - Diagnostics    │
╰─────────────────────────────────────────╯

## Installation Mode
✅ Dogfooding/Plugin Mode (this session only)
   ℹ️ For all sessions, run: bash scripts/install.sh

## Server Status
✅ API responding: http://localhost:3847
   Uptime: 91 minutes
   Active sessions: 1

## Channels
✅ Email: sender@gmail.com → you@example.com
✅ Telegram: Chat ID 123456789

---
All systems operational for this session.
```

**Not Running:**
```
╭─────────────────────────────────────────╮
│  Claude Code Anywhere - Diagnostics    │
╰─────────────────────────────────────────╯

## Installation Mode
❌ Not running

## Server Status
❌ Server not responding

## Next Steps
- Start notifications: `/notify on`
- Or install globally: `bash scripts/install.sh`
```

## Troubleshooting (Global Install issues only)

| Issue | Fix |
|-------|-----|
| Shim not first in PATH | `source ~/.zshrc` or restart terminal |
| Daemon not running | `launchctl load ~/Library/LaunchAgents/com.claude.notify.plist` |
| Plugin not found | Re-run: `bash scripts/install.sh` |

## IDE Notes (Global Install only)

If shim not first in PATH:

**VS Code / Cursor:**
```json
"terminal.integrated.env.osx": {
  "PATH": "${env:HOME}/.claude-code-anywhere/bin:${env:PATH}"
}
```

**tmux:**
```
set-option -g default-command "exec $SHELL -l"
```
