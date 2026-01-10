# Claude Code Anywhere

[![CI](https://github.com/blueraai/claude-code-anywhere/actions/workflows/ci.yml/badge.svg)](https://github.com/blueraai/claude-code-anywhere/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](https://github.com/blueraai/claude-code-anywhere)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

> **Stay connected to your Claude Code sessions from anywhere.** Get notifications via Email or Telegram when tasks complete, approve operations remotely, and respond to prompts from any device.

---

## Why Claude Code Anywhere?

When Claude Code needs your input—a question, approval, or notification—you shouldn't have to be tethered to your terminal.

| Scenario | Without | With Claude Code Anywhere |
|----------|---------|---------------------------|
| Task completes | Sit and wait, or miss it | Get notified instantly |
| Claude asks a question | Session blocks until you notice | Reply from your phone |
| Destructive operation | Must be at terminal to approve | Approve via email: "Y" |
| Long-running task | Keep checking back | Do other things, get pinged |

**The result:** Run background tasks with confidence. Walk away. Stay connected.

---

## Table of Contents

<details>
<summary>Click to expand</summary>

- [Why Claude Code Anywhere?](#why-claude-code-anywhere)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Channel Setup](#channel-setup)
  - [Email Channel](#email-channel)
  - [Telegram Channel](#telegram-channel)
- [Commands](#commands)
- [Configuration](#configuration)
- [Hook Events](#hook-events)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Comparison with Claude Code Remote](#comparison-with-claude-code-remote)
- [Development](#development)
  - [Setup](#setup)
  - [Scripts](#scripts)
  - [Project Structure](#project-structure)
  - [Dogfooding](#dogfooding)
  - [Releasing](#releasing)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

</details>

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Channel** | Email, Telegram, or both simultaneously |
| **Bidirectional** | Send notifications AND receive replies |
| **Multi-Session** | Track multiple Claude Code sessions independently |
| **Easy Toggle** | `/cca on`/`off` (per-session) or `/cca on --all`/`off --all` (global) |
| **Provider Flexible** | Any SMTP/IMAP email provider |
| **85% Test Coverage** | Production-ready with comprehensive tests |

---

## Architecture

```mermaid
%%{init: {'theme': 'default'}}%%
flowchart LR
    subgraph Claude Code
        CC[Claude Code] --> Hook[Hook Event]
    end

    subgraph Bridge Server
        Hook --> |HTTP POST| Server[Bridge Server]
        Server --> CM[Channel Manager]
        CM --> Email[Email Channel]
        CM --> TG[Telegram Channel]
    end

    subgraph User Devices
        Email --> |SMTP| Inbox[Email Inbox]
        TG --> |Bot API| Phone[Telegram App]
        Inbox --> |Reply| Email
        Phone --> |Reply| TG
    end

    Email --> |IMAP Poll| Server
    TG --> |Long Poll| Server
    Server --> |Response| CC
```

### Message Flow

```mermaid
%%{init: {'theme': 'dark'}}%%
sequenceDiagram
    participant CC as Claude Code
    participant BS as Bridge Server
    participant CH as Channel (Email/Telegram)
    participant U as User

    CC->>BS: Hook triggered (notification/approval)
    BS->>CH: Send via all enabled channels
    CH->>U: Notification delivered

    Note over U: User reads and replies

    U->>CH: Reply message
    CH->>BS: Poll detects reply
    BS->>CC: Return response to hook

    Note over CC: Claude continues with user input
```

---

## Quick Start

### 1. Install the Plugin

```bash
claude /plugin add github.com/blueraai/claude-code-anywhere
```

### 2. Choose Your Mode

On first session, you'll see a one-time message explaining the two notification modes:

| Mode | Description | Best For |
|------|-------------|----------|
| **Session-Only** | Run `/cca on` in each terminal | Trying it out, occasional use |
| **Global** | All sessions automatically connected | Daily use, multiple projects |

<details>
<summary><b>What's the difference?</b></summary>

**Session-Only (default):**
- `/cca on` enables notifications for the current session only
- `/cca off` disables only the current session (server keeps running for others)
- Use `/cca on --all` or `/cca off --all` for global enable/disable
- Server can be shared across multiple sessions

**Global:**
- Notifications work in ALL Claude sessions automatically
- Background daemon runs persistently (survives reboots)
- Reply from your phone → routes to the correct session
- Installs: PATH shim + background service + one line in .zshrc/.bashrc

</details>

To enable global mode:
```bash
/cca-install
```

### 3. Configure Channels

Copy `.env.example` to `.env` and configure:
- **Session-only mode**: In the plugin directory (where `/plugin add` installed it)
- **Global mode**: `~/.claude-code-anywhere/plugins/claude-code-anywhere/.env`

**Email:**
```env
EMAIL_USER=claude-cca@gmail.com       # Dedicated sending account
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx        # App password (not your main password!)
EMAIL_RECIPIENT=you@example.com       # Where YOU receive notifications
```

**Telegram:**
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdef...  # From @BotFather
TELEGRAM_CHAT_ID=123456789              # Your chat ID
```

You can configure one or both channels.

### 4. Enable and Test

```bash
/cca on      # Starts server (session-only mode)
/cca-test    # Sends test message to all configured channels
/cca-doctor  # Diagnose installation and show current mode
```

---

## Channel Setup

### Email Channel

<details>
<summary><b>Gmail Setup</b></summary>

**Step 1: Create a Dedicated Account**

Create a new Gmail account for Claude (e.g., `my-claude-cca@gmail.com`). Using a dedicated account keeps your personal inbox clean and is more secure.

**Step 2: Enable 2-Factor Authentication**

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification

**Step 3: Create App Password**

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and your device
3. Copy the 16-character password (no spaces)

**Step 4: Add to `.env`**

```env
EMAIL_USER=my-claude-cca@gmail.com
EMAIL_PASS=abcdefghijklmnop  # The app password (no spaces)
EMAIL_RECIPIENT=your-real-email@example.com
```

</details>

<details>
<summary><b>Other Email Providers</b></summary>

**Outlook/Office 365:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=465
IMAP_HOST=imap.mail.yahoo.com
IMAP_PORT=993
```

**Custom SMTP/IMAP:**
```env
SMTP_HOST=mail.example.com
SMTP_PORT=587
IMAP_HOST=mail.example.com
IMAP_PORT=993
```

</details>

### Telegram Channel

<details>
<summary><b>Telegram Setup Guide</b></summary>

**Step 1: Create a Bot**

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts:
   - Choose a display name (e.g., "Claude Code Anywhere")
   - Choose a username ending in `bot` (e.g., `my_claude_cca_bot`)
3. BotFather will reply with your bot token:
   ```
   Use this token to access the HTTP API:
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
4. Copy the entire token (including the colon)

**Step 2: Get Your Chat ID**

1. Search for [@userinfobot](https://t.me/userinfobot) and start a chat
2. It will immediately reply with your user info:
   ```
   Id: 123456789
   ```
3. Copy the numeric ID

**Step 3: Start Your Bot**

1. Search for your new bot by its username
2. Click "Start" or send `/start` — **required before the bot can message you**

**Step 4: Add to `.env`**

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

**Replying to Notifications**

**Approval requests** (`PreToolUse` events): Tap the **YES** or **NO** button directly — no typing needed! The buttons encode the session ID, so they always target the correct session even with multiple concurrent sessions.

**Other notifications**: Send a text message to respond.
- **Single session**: Just send a message — it links to the most recent notification.
- **Multiple concurrent sessions**: Use Telegram's **reply feature** (swipe left on mobile, or right-click → Reply on desktop) to target the correct session. Without explicit reply, your message goes to whichever session sent the most recent notification.

> **Why the difference from Email?** Email automatically threads via subject line (`[CC-xxx]`) and In-Reply-To headers. Telegram doesn't have threading for regular messages, so it relies on inline keyboard buttons for approvals, or explicit replies / `[CC-xxx]` prefix for text responses.

</details>

---

## Commands

### `/cca`

Show current server and channel status, or toggle notifications.

<details open>
<summary><b>Example output</b></summary>

**Notification Status**

| | Status |
|---|---|
| Server | ✅ Running |
| Uptime | ~8 minutes |
| Active sessions | 1 |
| Pending responses | 0 |

**Channels**

| Channel | Config | Enabled | Connected | Last Activity | Error |
|---------|--------|---------|-----------|---------------|-------|
| Email | `claudecode@gmail.com` → `you@example.com` | ✅ | ✅ | - | - |
| Telegram | Chat ID: `123456789` | ✅ | ✅ | - | - |

</details>

---

### `/cca on`

Enable notifications for the **current session**. Starts the server if not already running.

Use `/cca on --all` to enable notifications for **all sessions**.

<details>
<summary><b>Example output</b></summary>

Notifications enabled for this session.

**Notification Status**

| | Status |
|---|---|
| Server | ✅ Running |
| Uptime | just started |
| Active sessions | 1 |
| Pending responses | 0 |

**Channels**

| Channel | Config | Enabled | Connected | Last Activity | Error |
|---------|--------|---------|-----------|---------------|-------|
| Email | `claudecode@gmail.com` → `you@example.com` | ✅ | ✅ | - | - |
| Telegram | Chat ID: `123456789` | ✅ | ✅ | - | - |

</details>

---

### `/cca off`

Disable notifications for the **current session**. The server keeps running for other sessions.

Use `/cca off --all` to disable notifications for **all sessions** and stop the server.

<details>
<summary><b>Example output</b></summary>

Notifications disabled for this session. Server still running for other sessions.

</details>

---

### `/cca-install`

Install global notification support for all Claude sessions.

<details>
<summary><b>What it does</b></summary>

1. Creates a PATH shim at `~/.claude-code-anywhere/bin/claude`
2. Adds the shim to your PATH (in .zshrc/.bashrc)
3. Installs the plugin to `~/.claude-code-anywhere/plugins/`
4. Sets up a background daemon (launchd on macOS, systemd on Linux)

After installation, restart your shell. All future `claude` sessions will automatically have notifications enabled.

**macOS Note:** You'll see a system notification: *"Software from 'Jarred Sumner' can run in the background."* This is expected — Jarred Sumner is the creator of [Bun](https://bun.sh), the JavaScript runtime we use. Allow it in System Settings → Login Items to keep the daemon running.

**Windows:** Global installation is not yet supported. Use session-only mode with `/cca on`.

</details>

---

### `/cca-uninstall`

Remove global installation and revert to session-only mode.

<details>
<summary><b>What it removes</b></summary>

- PATH shim at `~/.claude-code-anywhere/bin/claude`
- PATH entry from .zshrc/.bashrc
- Background daemon (launchd/systemd)
- Plugin copy at `~/.claude-code-anywhere/plugins/`

Your `.env` configuration is preserved as a backup.

</details>

---

### `/cca-test`

Send a test message to all configured channels.

<details>
<summary><b>Example output</b></summary>

Test notification sent!

Sent to 2 channels:
- ✅ Email
- ✅ Telegram

Check your inbox/Telegram for the test message.

</details>

---

### `/cca-statusline`

Add or remove the CCA status indicator from your Claude Code statusline.

```
/cca-statusline add     # Add indicator to statusline
/cca-statusline remove  # Remove indicator from statusline
```

<details>
<summary><b>Example output</b></summary>

CCA indicator added to statusline.

Your statusline will now show:
- **CCA** (green) when notifications are active (global enabled OR session enabled)
- **cca** (dim gray) when notifications are inactive for this session

Restart Claude Code or wait for statusline refresh to see the change.

</details>

---

### `/cca-doctor`

Diagnose installation and configuration issues. Especially useful after global installation.

<details>
<summary><b>Example output</b></summary>

```
╭─────────────────────────────────────────╮
│  Claude Code Anywhere - Diagnostics    │
╰─────────────────────────────────────────╯

## PATH Check
✅ Shim is first in PATH: ~/.claude-code-anywhere/bin/claude
   Real claude: ~/.local/bin/claude

## Service Status
✅ Daemon running (launchd: com.claude.code-anywhere)
   API: http://localhost:<dynamic-port>

## Plugin Installation
✅ Plugin installed: vX.Y.Z
   Path: ~/.claude-code-anywhere/plugins/claude-code-anywhere

## Channels
✅ Email: you@example.com
✅ Telegram: Chat ID 123456789
```

</details>

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **Email Channel** | | | |
| `EMAIL_USER` | † | - | Sending account (Claude's email) |
| `EMAIL_PASS` | † | - | App password |
| `EMAIL_RECIPIENT` | † | - | Your email for notifications |
| `SMTP_HOST` | No | smtp.gmail.com | SMTP server |
| `SMTP_PORT` | No | 587 | SMTP port |
| `IMAP_HOST` | No | imap.gmail.com | IMAP server |
| `IMAP_PORT` | No | 993 | IMAP port |
| `EMAIL_POLL_INTERVAL_MS` | No | 5000 | Reply check interval |
| **Telegram Channel** | | | |
| `TELEGRAM_BOT_TOKEN` | † | - | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | † | - | Your chat ID |
| **Server** | | | |
| `BRIDGE_PORT` | No | dynamic | Bridge server port (auto-selects available) |
| `BRIDGE_URL` | No | auto | Bridge URL (derived from port) |
| **Logging** | | | |
| `LOG_MAX_SIZE_MB` | Yes | - | Max log file size before rotation |
| `LOG_MAX_ROTATED_FILES` | Yes | - | Number of rotated logs to keep |

† At least one channel must be fully configured (all † vars for that channel).

### State File

Settings persist in `~/.claude/claude-code-anywhere/state.json`:

```json
{
  "enabled": true,
  "hooks": {
    "Notification": true,
    "Stop": true,
    "PreToolUse": true,
    "UserPromptSubmit": false
  }
}
```

### Suppressing the Mode Selection Prompt

On first session, a one-time message explains SESSION-ONLY vs GLOBAL modes. To suppress this:

| Method | How | Persists |
|--------|-----|----------|
| Environment variable | `export CLAUDE_CCA_AUTO=0` | Per-shell |
| Sentinel file | `touch ~/.config/claude-code-anywhere/disable-autoinstall` | Permanent |

---

## Hook Events

| Event | When It Fires | Notification |
|-------|---------------|--------------|
| `Notification` | Status updates, info messages | Sent immediately |
| `Stop` | Session/task ends | Sent immediately |
| `PreToolUse` | Before Bash/Write/Edit | **Waits for your approval** |
| `UserPromptSubmit` | Claude needs input | **Waits for your response** |

---

## Security

| Measure | Description |
|---------|-------------|
| **App Passwords** | Never use your main email password |
| **Dedicated Account** | Use a separate email for Claude |
| **Sender Verification** | Only processes replies from `EMAIL_RECIPIENT` |
| **Session Isolation** | Session IDs prevent cross-session interference |
| **Auto-Expiry** | Sessions timeout after 30 minutes |
| **No Secrets** | Never sends credentials via notification |

---

## Troubleshooting

<details>
<summary><b>Email Not Sending</b></summary>

1. Verify environment variables:
   ```bash
   echo $EMAIL_USER $EMAIL_RECIPIENT
   ```
2. Ensure you're using an **app password**, not your main password
3. For Gmail, verify 2FA is enabled
4. Check logs: `tail -f logs/*.log`

</details>

<details>
<summary><b>Telegram Not Working</b></summary>

1. Did you click "Start" on your bot? (Required!)
2. Verify bot token and chat ID are correct
3. Check logs for API errors
4. Try `/cca-test` to diagnose

</details>

<details>
<summary><b>Response Not Received</b></summary>

1. For email: Reply from the correct address (`EMAIL_RECIPIENT`)
2. For Telegram: Send a message in the bot chat (or use explicit reply)
3. Check server logs for polling errors
4. Ensure session hasn't expired (30 min timeout)

</details>

<details>
<summary><b>Server Won't Start</b></summary>

1. Check if another instance is running: `lsof -i :$(cat ~/.claude-code-anywhere/plugins/claude-code-anywhere/port 2>/dev/null)`
2. Server auto-selects available ports; check `port` file for actual port
3. Verify at least one channel is configured

</details>

<details>
<summary><b>PreToolUse Hook Blocking (Can't Type Commands)</b></summary>

If the PreToolUse approval hook is blocking and you can't interact with Claude (waiting for approval that never comes), use one of these fixes **from a separate terminal**:

**Option 1: Enable global notifications**
```bash
PORT=$(cat ~/.config/claude-code-anywhere/port) && curl -s -X POST "http://localhost:$PORT/api/enable"
```

**Option 2: Edit state file directly**
```bash
# Enable global notifications
sed -i '' 's/"enabled": false/"enabled": true/' ~/.claude/claude-code-anywhere/state.json
```

**Option 3: Kill the server (disables all hooks)**
```bash
pkill -f "bun run server"
```

**Why this happens:** If global notifications are disabled but session is enabled, and the notification channels (Email/Telegram) aren't working, the hook waits for approval that never arrives. This was fixed in v0.6.22 but may occur if channels are misconfigured.

</details>

<details>
<summary><b>Global Installation Issues</b></summary>

1. **Daemon not starting:**
   - macOS: `launchctl list | grep claude`
   - Check logs: `ls ~/.claude-code-anywhere/plugins/claude-code-anywhere/logs/`
   - View latest: `cat ~/.claude-code-anywhere/plugins/claude-code-anywhere/logs/*.log | tail -50`

2. **Shim not first in PATH:**
   - Run `which claude` — should show `~/.claude-code-anywhere/bin/claude`
   - Restart shell: `exec $SHELL`
   - Verify PATH: `echo $PATH | tr ':' '\n' | head -5`

3. **Service won't load (macOS):**
   ```bash
   launchctl load ~/Library/LaunchAgents/com.claude.code-anywhere.plist
   launchctl print gui/$(id -u)/com.claude.code-anywhere
   ```

4. **Run diagnostics:**
   ```bash
   /cca-doctor
   ```

</details>

---

## Comparison with Claude Code Remote

[Claude Code Remote](https://github.com/JessyTsui/Claude-Code-Remote) is a feature-rich notification system that inspired some of our design. Here's how they compare:

| Feature | Claude Code Anywhere | Claude Code Remote |
|---------|---------------------|-------------------|
| **Channels** | Email, Telegram | Email, Telegram, LINE, Desktop |
| **Integration** | Native hooks + HTTP | PTY relay + scripts |
| **Setup** | `.env` file | Interactive wizard |
| **Codebase** | TypeScript, 85% tested | JavaScript |
| **Telegram mode** | Polling (simpler) | Webhook |
| **Public URL needed** | No | Yes (for webhooks) |
| **Group support** | 1:1 only | Groups supported |
| **Focus** | Clean, minimal, reliable | Feature-rich, flexible |

Both projects solve the same problem. We use Claude Code's native hook system; Claude Code Remote uses terminal injection for more direct control.

**When to use Claude Code Anywhere:**
- You want simple `.env` configuration
- Email and/or Telegram are sufficient
- You don't want to set up a public URL for webhooks
- You prefer a typed, tested codebase
- Plugin-based installation is preferred

**When to use Claude Code Remote:**
- You need LINE or desktop notifications
- You need group/team notifications
- You have a public URL for webhooks
- You want direct terminal control
- You prefer interactive setup wizards

---

## Development

### Setup

```bash
git clone https://github.com/blueraai/claude-code-anywhere.git
cd claude-code-anywhere
bun install
bun run build
```

### Scripts

| Command | Description | When to Use |
|---------|-------------|-------------|
| `bun run build` | Compile TypeScript to dist/ | After code changes |
| `bun run dev` | Watch mode compilation | During active development |
| `bun run test` | Run tests in watch mode | During TDD/development |
| `bun run test:run` | Run tests once | Quick verification |
| `bun run test:coverage` | Run tests with coverage | Before committing |
| `bun run lint` | Run ESLint | Check code style |
| `bun run typecheck` | TypeScript type checking | Verify type safety |
| `bun run precommit` | Full validation (lint, types, tests, build) | Runs automatically on commit |
| `bun run version:patch` | Bump patch version (0.0.x) | Bug fixes |
| `bun run version:minor` | Bump minor version (0.x.0) | New features |
| `bun run version:major` | Bump major version (x.0.0) | Breaking changes |
| `bun run release` | Auto-detect version + tag + push | Release (recommended) |
| `bun run release:patch` | Force patch + tag + push | Override: bug fixes |
| `bun run release:minor` | Force minor + tag + push | Override: new features |
| `bun run release:major` | Force major + tag + push | Override: breaking changes |

### Project Structure

```
claude-code-anywhere/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest (canonical location)
├── commands/
│   ├── cca.md                # /cca - toggle notifications
│   ├── cca-install.md        # /cca-install - global mode setup
│   ├── cca-uninstall.md      # /cca-uninstall - remove global mode
│   ├── cca-statusline.md     # /cca-statusline - terminal indicator
│   ├── cca-test.md           # /cca-test - send test notification
│   └── cca-doctor.md         # /cca-doctor - diagnostics
├── hooks/
│   ├── hooks.json            # Hook definitions
│   └── check-install.sh      # SessionStart guidance hook
├── scripts/
│   ├── install.sh            # Global installation script
│   └── uninstall.sh          # Global uninstallation script
├── src/
│   ├── server/
│   │   ├── index.ts          # Server entry
│   │   ├── channels.ts       # Channel manager
│   │   ├── email.ts          # Email channel
│   │   ├── telegram.ts       # Telegram channel
│   │   ├── routes.ts         # HTTP routes
│   │   └── sessions.ts       # Session management
│   ├── shared/
│   │   ├── channel.ts        # Channel interface
│   │   ├── config.ts         # Configuration
│   │   └── types.ts          # Type definitions
│   └── cli.ts                # CLI entry
├── tests/                    # Test files (85% coverage)
└── dist/                     # Compiled output
```

### Dogfooding

Develop this plugin while using it with Claude Code:

```bash
claude --plugin-dir .  # assumes running from repo root
```

Changes take effect on Claude Code restart (no reinstall needed).

**Safety:** Hook scripts check if the bridge server is running first (1 second timeout). If not running, they exit silently and don't block your workflow.

| Mode | Server | Behavior |
|------|--------|----------|
| **Develop** | Off | Hooks do nothing, develop normally |
| **Test** | Running + `/cca on` | Full notification flow |
| **Pause** | Running + `/cca off` | Hooks check and exit early |

### Known Limitation: Plugin Root Path

`${CLAUDE_PLUGIN_ROOT}` is NOT available in most command contexts. This is a known Claude Code limitation ([#9354](https://github.com/anthropics/claude-code/issues/9354), [#12541](https://github.com/anthropics/claude-code/issues/12541)).

| Context | `CLAUDE_PLUGIN_ROOT` Available |
|---------|-------------------------------|
| Hook scripts (directly invoked) | Yes |
| Dynamic context (`!` backtick) | **No** (tested) |
| Plugin frontmatter (`allowed-tools`) | Yes (v2.1.0+) |
| Bash commands from skill instructions | **No** |

**Workaround**: Bootstrap resolver script ([community solution](https://github.com/anthropics/claude-code/issues/9354)).

On first use in a project, Claude will run the bootstrap skill to create `.claude/cpr.sh`:
```bash
# The resolver script finds the plugin via:
# 1. CLAUDE_PLUGIN_ROOT (if available)
# 2. ~/.claude/plugins/installed_plugins.json lookup
# 3. Python fallback

# Commands then use:
PLUGIN_ROOT=$(.claude/cpr.sh)
cd "$PLUGIN_ROOT" && bun run server
```

### Releasing

```bash
# Auto-detect version from conventional commits (recommended)
bun run release

# Or force a specific version bump
bun run release:patch   # Force 0.0.x
bun run release:minor   # Force 0.x.0
bun run release:major   # Force x.0.0
```

Auto-detection uses conventional commits: `fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major.

**What happens automatically:**
1. Version bumped in package.json, plugin.json
2. CHANGELOG.md generated from commits
3. Git tag created and pushed
4. GitHub Actions creates release
5. Marketplace updated with new version

**Note:** The `dist/` directory must be committed (plugins have no build step during installation).

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests (maintain 80%+ coverage)
4. Submit a pull request

---

## License

MIT — See [LICENSE](./LICENSE) for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/blueraai/claude-code-anywhere/issues)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
