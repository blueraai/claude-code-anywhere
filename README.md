# Claude SMS

[![CI](https://github.com/chris-bluera/claude-sms/actions/workflows/ci.yml/badge.svg)](https://github.com/chris-bluera/claude-sms/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![macOS](https://img.shields.io/badge/macOS-only-blue)

> **Stay connected to your Claude Code sessions from anywhere.** Get SMS notifications when tasks complete, approve operations remotely, and respond to prompts—all from your phone.

## Table of Contents

<details>
<summary>Click to expand</summary>

- [Why Claude SMS?](#-why-claude-sms)
- [Features](#-features)
- [Requirements](#-requirements)
- [Quick Start](#-quick-start)
- [Quick Reference](#-quick-reference)
- [Usage](#-usage)
- [How It Works](#-how-it-works)
- [SMS Format](#-sms-format)
- [Hook Events](#-hook-events)
- [Configuration](#-configuration)
- [Why macOS Messages?](#why-macos-messages-instead-of-twiliotelnyx)
- [Known Limitations](#known-limitations)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

</details>

---

## Why Claude SMS?

When Claude Code needs your input—a question, approval, or notification—you shouldn't have to be tethered to your terminal.

| Scenario | Without Claude SMS | With Claude SMS |
|----------|-------------------|-----------------|
| Task completes | Sit and wait, or miss it | Get SMS: "Task completed!" |
| Claude asks a question | Session blocks until you notice | Get SMS, reply from anywhere |
| Destructive operation | Must be at terminal to approve | Approve via text: "Y" |
| Long-running task | Keep checking back | Do other things, get notified |

**The result:** Run background tasks with confidence. Walk away. Your phone keeps you connected.

---

## Features

- **SMS Notifications** — Get SMS alerts when tasks complete or errors occur
- **Interactive Prompts** — Respond to Claude's questions via text
- **Approval Requests** — Approve or deny destructive operations remotely
- **Multi-Session** — Track multiple Claude Code sessions independently
- **Easy Toggle** — Enable/disable SMS with `/sms on` or `/sms off`
- **No Third-Party Services** — Uses macOS Messages.app directly
- **Free** — No SMS provider costs, no carrier registration

---

## Requirements

- **macOS only** — Uses native Messages.app
- **iPhone** — Messages must be set up for SMS relay
- **Node.js 18+**
- **imsg CLI tool** — `brew install steipete/tap/imsg`
- **Full Disk Access** — Required for reading incoming messages

---

## Quick Start

### 1. Install Prerequisites

```bash
# Install imsg CLI
brew install steipete/tap/imsg

# Grant Full Disk Access to your terminal app
# System Settings > Privacy & Security > Full Disk Access > Add Terminal/iTerm/VS Code
```

### 2. Install the Plugin

```bash
claude /plugin add github.com/chris-bluera/claude-sms
```

### 3. Set Environment Variable

```bash
export SMS_USER_PHONE=+1987654321  # Your phone number
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for persistence.

### 4. Start the Bridge Server

```bash
npx claude-sms server
```

### 5. Test the Setup

```bash
npx claude-sms test
```

Or in Claude Code:
```
/sms-test
```

---

## Quick Reference

### Plugin Commands

| Command | Description |
|---------|-------------|
| `/sms on` | Enable SMS for current session |
| `/sms on --all` | Enable SMS globally |
| `/sms off` | Disable SMS for current session |
| `/sms off --all` | Disable SMS globally |
| `/sms status` | Show current status |
| `/sms-test` | Send a test SMS |

### CLI Commands

| Command | Description |
|---------|-------------|
| `npx claude-sms server` | Start bridge server |
| `npx claude-sms status` | Check server status |
| `npx claude-sms enable` | Enable SMS globally |
| `npx claude-sms disable` | Disable SMS globally |
| `npx claude-sms test` | Send test SMS |
| `npx claude-sms config` | Show configuration |

---

## Usage

### Enabling/Disabling SMS

```bash
# In Claude Code
/sms on          # Enable for this session
/sms off         # Disable for this session
/sms off --all   # Disable globally
/sms status      # Check current state
```

### From Command Line

```bash
npx claude-sms enable   # Enable globally
npx claude-sms disable  # Disable globally
npx claude-sms status   # Check server and settings
```

---

## How It Works

```
┌─────────────────┐    Hook     ┌─────────────────┐    SMS     ┌──────────┐
│  Claude Code    │───triggered─▶│  Bridge Server  │───────────▶│  Phone   │
│                 │             │    (imsg CLI)   │            │          │
│                 │◀──response──│                 │◀───reply───│          │
└─────────────────┘             └─────────────────┘            └──────────┘
```

1. Claude Code triggers a hook (notification, tool use, etc.)
2. Hook sends message to bridge server
3. Bridge server sends SMS via macOS Messages.app
4. User replies via SMS
5. Bridge server reads reply from Messages.app
6. Hook retrieves response and returns it to Claude Code

---

## SMS Format

### Outbound

```
[CC-abc123] ⚠️ Approve tool use?

Tool: Bash - Approve? (Y/N)

Reply with your response
```

### Inbound

Simple reply (single active session):
```
Yes
```

With session ID (multiple sessions):
```
[CC-abc123] Yes
```

---

## Hook Events

| Event | Trigger | SMS Sent |
|-------|---------|----------|
| `Notification` | Status updates, completions | Yes (by default) |
| `Stop` | Session ends | Yes (by default) |
| `PreToolUse` | Before Bash/Write/Edit | Yes (awaits approval) |

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SMS_USER_PHONE` | Yes | Your mobile in E.164 format (e.g., `+15559876543`) |
| `SMS_BRIDGE_URL` | No | Bridge server URL (default: localhost:3847) |
| `SMS_BRIDGE_PORT` | No | Server port (default: 3847) |

### State File

Settings are stored in `~/.claude/claude-sms/state.json`:

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

## Why macOS Messages Instead of Twilio/Telnyx?

We considered cloud SMS providers (Twilio, Telnyx) but chose native macOS Messages.app integration for several reasons:

| Consideration | Cloud Providers (Twilio/Telnyx) | macOS Messages |
|--------------|--------------------------------|----------------|
| **Cost** | $0.01-0.05 per SMS | Free |
| **Carrier Registration** | 10DLC registration required (~$15/mo + weeks of approval) | None |
| **Toll-Free Verification** | 3-5 business days, compliance paperwork | None |
| **Data Privacy** | Messages routed through third-party servers | All local |
| **Setup Complexity** | API keys, webhooks, tunneling | Just `brew install` |
| **Platform Support** | Any platform | macOS only |

**The trade-off:** This only works on macOS with an iPhone for SMS relay. If you need cross-platform support, consider contributing a Twilio/Telnyx backend.

---

## Known Limitations

<details>
<summary><b>Double Message Display (Self-Messaging)</b></summary>

When sending SMS to your own phone number (which is the typical setup), each message appears twice in the Messages.app conversation:
1. Once as the sent message
2. Once as the received "echo"

This is a macOS Messages.app behavior when texting yourself. The bridge server uses hash-based deduplication to ignore these echoes, but you'll still see both copies in the Messages UI.

**Why it happens:** SMS relay sends the message to your carrier, which delivers it back to your phone, creating the duplicate.

**Impact:** Visual clutter only. The bridge correctly processes only genuine replies.
</details>

<details>
<summary><b>macOS Only</b></summary>

This tool requires:
- macOS with Messages.app
- An iPhone with "Text Message Forwarding" enabled
- Both devices signed into the same Apple ID

If you need cross-platform support, consider implementing a cloud SMS backend (PRs welcome!).
</details>

---

## Security

- **Local Only** — Messages never leave your Mac (no third-party services)
- **Phone Verification** — Only responds to your configured phone number
- **Session IDs** — Prevent cross-session interference
- **Timeout** — Sessions expire after 30 minutes of inactivity
- **No Secrets** — Never sends credentials/secrets via SMS

---

## Troubleshooting

<details>
<summary><b>SMS Not Sending</b></summary>

1. Check imsg is installed: `which imsg`
2. Verify environment variable: `echo $SMS_USER_PHONE`
3. Ensure Messages.app is set up for SMS relay with your iPhone
4. Test manually: `imsg send --to "+1234567890" --text "test" --service sms`
</details>

<details>
<summary><b>Response Not Received</b></summary>

1. Grant Full Disk Access to your terminal app in System Settings
2. Restart your terminal after granting access
3. Check server logs for errors
4. Verify the chat exists in Messages.app
</details>

<details>
<summary><b>Server Not Starting</b></summary>

1. Check if port 3847 is in use: `lsof -i :3847`
2. Verify SMS_USER_PHONE is set
3. Try a different port: `npx claude-sms server -p 3848`
</details>

<details>
<summary><b>imsg Not Found</b></summary>

Install via Homebrew:
```bash
brew install steipete/tap/imsg
```
</details>

<details>
<summary><b>Full Disk Access Required</b></summary>

The imsg tool needs Full Disk Access to read the Messages database:

1. Open System Settings > Privacy & Security > Full Disk Access
2. Click the + button
3. Add your terminal app (Terminal, iTerm2, VS Code, etc.)
4. Restart your terminal
</details>

---

## Development

### Setup

```bash
git clone https://github.com/chris-bluera/claude-sms.git
cd claude-sms
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
- Auto-validation after code edits
- Pre-approved common commands
- Desktop notifications

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

MIT — See [LICENSE](./LICENSE) for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/chris-bluera/claude-sms/issues)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
