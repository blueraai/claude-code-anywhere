# Claude Code Anywhere

[![CI](https://github.com/chris-bluera/claude-code-anywhere/actions/workflows/ci.yml/badge.svg)](https://github.com/chris-bluera/claude-code-anywhere/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> **Stay connected to your Claude Code sessions from anywhere.** Get email notifications when tasks complete, approve operations remotely, and respond to prompts from any device.

## Table of Contents

<details>
<summary>Click to expand</summary>

- [Why Claude Code Anywhere?](#-why-claude-code-anywhere)
- [Features](#-features)
- [Requirements](#-requirements)
- [Quick Start](#-quick-start)
- [Quick Reference](#-quick-reference)
- [Usage](#-usage)
- [How It Works](#-how-it-works)
- [Email Format](#-email-format)
- [Hook Events](#-hook-events)
- [Configuration](#-configuration)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

</details>

---

## Why Claude Code Anywhere?

When Claude Code needs your input--a question, approval, or notification--you shouldn't have to be tethered to your terminal.

| Scenario | Without Claude Code Anywhere | With Claude Code Anywhere |
|----------|-------------------|-----------------|
| Task completes | Sit and wait, or miss it | Get email: "Task completed!" |
| Claude asks a question | Session blocks until you notice | Get email, reply from anywhere |
| Destructive operation | Must be at terminal to approve | Approve via email: "Y" |
| Long-running task | Keep checking back | Do other things, get notified |

**The result:** Run background tasks with confidence. Walk away. Your inbox keeps you connected.

---

## Features

- **Email Notifications** -- Get alerts when tasks complete or errors occur
- **Interactive Prompts** -- Respond to Claude's questions via email reply
- **Approval Requests** -- Approve or deny destructive operations remotely
- **Multi-Session** -- Track multiple Claude Code sessions independently
- **Easy Toggle** -- Enable/disable with `/notify on` or `/notify off`
- **Cross-Platform** -- Works on any OS with Node.js
- **Provider Flexible** -- Gmail by default, configurable SMTP/IMAP

---

## Requirements

- **Node.js 18+**
- **Email account with SMTP/IMAP access** (Gmail recommended)
- **App password** (for Gmail: 16-character app-specific password)

---

## Quick Start

### 1. Create Email Account for Claude

Set up a dedicated email account for Claude notifications (e.g., `claude-notify@gmail.com`).

For Gmail:
1. Enable 2-Factor Authentication on the account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Create a new app password (select "Mail" and your device)
4. Copy the 16-character password (no spaces)

### 2. Install the Plugin

```bash
claude /plugin add github.com/chris-bluera/claude-code-anywhere
```

### 3. Set Environment Variables

```bash
# Required
export EMAIL_USER=claude-notify@gmail.com   # Claude's email account
export EMAIL_PASS=xxxx-xxxx-xxxx-xxxx       # App password (no spaces)
export EMAIL_RECIPIENT=you@example.com      # Your email to receive notifications
```

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for persistence.

### 4. Start the Bridge Server

```bash
npx claude-code-anywhere server
```

### 5. Test the Setup

```bash
npx claude-code-anywhere test
```

Or in Claude Code:
```
/notify-test
```

---

## Quick Reference

### Plugin Commands

| Command | Description |
|---------|-------------|
| `/notify on` | Start server and enable notifications |
| `/notify off` | Stop server and disable notifications |
| `/notify status` | Show current status |
| `/notify-test` | Send a test email |

### CLI Commands

| Command | Description |
|---------|-------------|
| `npx claude-code-anywhere server` | Start bridge server |
| `npx claude-code-anywhere status` | Check server status |
| `npx claude-code-anywhere enable` | Enable notifications globally |
| `npx claude-code-anywhere disable` | Disable notifications globally |
| `npx claude-code-anywhere test` | Send test email |
| `npx claude-code-anywhere config` | Show configuration |

---

## Usage

### Enabling/Disabling Notifications

```bash
# In Claude Code
/notify on       # Start server and enable notifications
/notify off      # Stop server and disable notifications
/notify status   # Check current state
```

### From Command Line

```bash
npx claude-code-anywhere enable   # Enable globally
npx claude-code-anywhere disable  # Disable globally
npx claude-code-anywhere status   # Check server and settings
```

---

## How It Works

```
+-----------------+    Hook     +-----------------+   Email    +----------+
|  Claude Code    |--triggered->|  Bridge Server  |----------->|  Inbox   |
|                 |             |   (SMTP/IMAP)   |            |          |
|                 |<--response--|                 |<---reply---|          |
+-----------------+             +-----------------+            +----------+
```

1. Claude Code triggers a hook (notification, tool use, etc.)
2. Hook sends message to bridge server
3. Bridge server sends email via SMTP
4. User replies to the email
5. Bridge server reads reply via IMAP polling
6. Reply is deleted from inbox after processing
7. Hook retrieves response and returns it to Claude Code

---

## Email Format

### Outbound

Subject line includes session ID for threading:
```
[CC-abc123] Approve tool use?
```

Body:
```
Tool: Bash - Approve? (Y/N)

Reply to this email with your response.
```

### Inbound

Simply reply to the email. The session ID is extracted from the subject line automatically.

---

## Hook Events

| Event | Trigger | Email Sent |
|-------|---------|----------|
| `Notification` | Status updates, completions | Yes (by default) |
| `Stop` | Session ends | Yes (by default) |
| `PreToolUse` | Before Bash/Write/Edit | Yes (awaits approval) |

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_USER` | Yes | - | Email address for Claude (sending account) |
| `EMAIL_PASS` | Yes | - | Email app password |
| `EMAIL_RECIPIENT` | Yes | - | Your email to receive notifications |
| `SMTP_HOST` | No | smtp.gmail.com | SMTP server hostname |
| `SMTP_PORT` | No | 587 | SMTP server port |
| `IMAP_HOST` | No | imap.gmail.com | IMAP server hostname |
| `IMAP_PORT` | No | 993 | IMAP server port |
| `EMAIL_POLL_INTERVAL_MS` | No | 5000 | How often to check for replies (ms) |
| `BRIDGE_PORT` | No | 3847 | Bridge server port |
| `BRIDGE_URL` | No | http://localhost:3847 | Bridge server URL |

### Non-Gmail Providers

For other email providers, configure the SMTP/IMAP settings:

**Outlook/Office 365:**
```bash
export SMTP_HOST=smtp.office365.com
export SMTP_PORT=587
export IMAP_HOST=outlook.office365.com
export IMAP_PORT=993
```

**Yahoo:**
```bash
export SMTP_HOST=smtp.mail.yahoo.com
export SMTP_PORT=465
export IMAP_HOST=imap.mail.yahoo.com
export IMAP_PORT=993
```

### State File

Settings are stored in `~/.claude/claude-code-anywhere/state.json`:

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

---

## Logging

Server logs are written to both console and file:
- **Location:** `logs/MM-DD-YY.log` in the plugin directory
- **Format:** `[HH:MM:SS.mmm] [LEVEL] [component] message`
- **Components:** `email`, `server`, `sessions`

Logs include full email details (from, to, subject, body, messageId) for debugging.

---

## Security

- **App Passwords** -- Never use your main email password; use app-specific passwords
- **Dedicated Account** -- Use a separate email account for Claude notifications
- **Email Verification** -- Only responds to emails from your configured recipient
- **Session IDs** -- Prevent cross-session interference
- **Timeout** -- Sessions expire after 30 minutes of inactivity
- **No Secrets** -- Never sends credentials/secrets via email

---

## Troubleshooting

<details>
<summary><b>Email Not Sending</b></summary>

1. Verify environment variables are set:
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_PASS
   echo $EMAIL_RECIPIENT
   ```
2. Check that you're using an app password, not your main password
3. For Gmail, ensure 2FA is enabled and app password is correct
4. Check server logs for SMTP errors
</details>

<details>
<summary><b>Response Not Received</b></summary>

1. Check server logs for IMAP polling errors
2. Verify the reply was sent from the correct email address (EMAIL_RECIPIENT)
3. Make sure the subject line contains the session ID `[CC-xxxxx]`
4. Check spam folder for the original notification
</details>

<details>
<summary><b>Server Not Starting</b></summary>

1. Check if port 3847 is in use: `lsof -i :3847`
2. Verify all required environment variables are set
3. Try a different port: `npx claude-code-anywhere server -p 3848`
</details>

<details>
<summary><b>Gmail "Less Secure Apps" Error</b></summary>

Gmail no longer supports "less secure apps." You must:
1. Enable 2-Factor Authentication
2. Create an app-specific password at https://myaccount.google.com/apppasswords
3. Use the 16-character app password (without spaces)
</details>

---

## Plugin Structure

The plugin follows the Claude Code plugin convention:

```
claude-code-anywhere/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── commands/
│   ├── notify.md            # /notify command
│   └── notify-test.md       # /notify-test command
├── hooks/
│   ├── hooks.json           # Hook definitions
│   └── scripts/             # Hook scripts
├── src/                     # TypeScript source
├── dist/                    # Built JavaScript
└── package.json             # npm package
```

---

## Development

### Setup

```bash
git clone https://github.com/chris-bluera/claude-code-anywhere.git
cd claude-code-anywhere
bun install
bun run build
```

### Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Compile TypeScript to dist/ |
| `bun run test` | Run tests in watch mode |
| `bun run test:run` | Run tests once |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run precommit` | Full validation (lint, typecheck, tests, build) |
| `bun run version:patch` | Bump patch version + changelog |
| `bun run version:minor` | Bump minor version + changelog |
| `bun run version:major` | Bump major version + changelog |

### Claude Code Settings

For the best development experience, copy the example settings:

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

This provides:

**Pre-approved Commands:**
- `bun run build/lint/test/typecheck` - No permission prompts for common dev commands
- `bun install` - Dependency installation

**PostToolUse Hook:**
- Runs `.claude/hooks/post-edit-check.sh` after every file edit
- Catches lint and type errors immediately (fail-fast)
- Prevents committing broken code

**Notification Hook:**
- macOS desktop notifications when Claude needs input
- Plays "Glass" sound for permission prompts, idle prompts, etc.
- Lets you work on other things while Claude runs

> **Note:** The `.claude/settings.local.json` file is git-ignored. Each developer maintains their own copy with their preferred permissions.

### Dogfooding

You can develop this plugin while using it with Claude Code:

```bash
# Load plugin directly from your dev directory
claude --plugin-dir /path/to/claude-code-anywhere
```

Changes take effect on Claude Code restart (no reinstall needed).

**Safety:** All hook scripts check if the bridge server is running first (1 second timeout). If not running, they exit silently and don't block your workflow.

| Mode | Server | Behavior |
|------|--------|----------|
| **Develop** | Off | Hooks do nothing, develop normally |
| **Test** | Running + `/notify on` | Full email notification flow |
| **Pause** | Running + `/notify off` | Hooks check and exit early |

### Releasing

1. Make changes and commit
2. Bump version: `bun run version:patch`
3. Commit: `git commit -am "chore: bump version to X.Y.Z"`
4. Push: `git push`
5. **GitHub Actions automatically creates the release**

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests
4. Submit a pull request

---

## License

MIT -- See [LICENSE](./LICENSE) for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/chris-bluera/claude-code-anywhere/issues)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
