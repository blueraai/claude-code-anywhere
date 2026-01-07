# Claude SMS

[![CI](https://github.com/chris-bluera/claude-sms/actions/workflows/ci.yml/badge.svg)](https://github.com/chris-bluera/claude-sms/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> **Stay connected to your Claude Code sessions from anywhere.** Get SMS notifications when tasks complete, approve operations remotely, and respond to prompts—all from your phone.

## Table of Contents

<details>
<summary>Click to expand</summary>

- [Why Claude SMS?](#-why-claude-sms)
- [Features](#-features)
- [Telnyx Setup](#-telnyx-setup)
- [Quick Start](#-quick-start)
- [Quick Reference](#-quick-reference)
- [Usage](#-usage)
- [How It Works](#-how-it-works)
- [SMS Format](#-sms-format)
- [Hook Events](#-hook-events)
- [Configuration](#-configuration)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [Technologies](#-technologies)
- [Cost Estimate](#-cost-estimate)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

</details>

---

## ✨ Why Claude SMS?

When Claude Code needs your input—a question, approval, or notification—you shouldn't have to be tethered to your terminal.

| Scenario | Without Claude SMS | With Claude SMS |
|----------|-------------------|-----------------|
| Task completes | Sit and wait, or miss it | Get SMS: "Task completed!" |
| Claude asks a question | Session blocks until you notice | Get SMS, reply from anywhere |
| Destructive operation | Must be at terminal to approve | Approve via text: "Y" |
| Long-running task | Keep checking back | Do other things, get notified |

**The result:** Run background tasks with confidence. Walk away. Your phone keeps you connected.

---

## 🚀 Features

- **📱 Notifications** — Get SMS alerts when tasks complete or errors occur
- **💬 Interactive Prompts** — Respond to Claude's questions via text
- **✅ Approval Requests** — Approve or deny destructive operations remotely
- **🔀 Multi-Session** — Track multiple Claude Code sessions independently
- **⚡ Easy Toggle** — Enable/disable SMS with `/sms on` or `/sms off`
- **🌐 Built-in Tunnel** — Automatic webhook exposure via cloudflared
- **🔒 Persistent URLs** — Optional stable tunnel URLs (no Telnyx reconfiguration)
- **💰 Cost Effective** — Telnyx offers ~52% savings vs alternatives ($0.004/SMS)

---

## 📱 Telnyx Setup

See **[TELNYX.md](./TELNYX.md)** for complete setup instructions including:

- Account creation and phone number purchase
- Messaging profile configuration
- **US carrier registration** — toll-free (recommended) or 10DLC
- Webhook and signature verification setup
- Troubleshooting common issues

> **Tip**: For US SMS, use a **toll-free number** instead of a local number. Toll-free verification is a single form vs. the complex 10DLC registration process.

---

## 🏁 Quick Start

### Prerequisites

- Node.js 18+ (via nvm recommended for WSL)
- Telnyx account with SMS-capable phone number

### 1. Install the Plugin

```bash
claude /plugin add github.com/chris-bluera/claude-sms
```

### 2. Set Environment Variables

```bash
export TELNYX_API_KEY=your-api-key
export TELNYX_FROM_NUMBER=+1234567890
export SMS_USER_PHONE=+1987654321
```

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for persistence.

### 3. Start the Bridge Server

```bash
npx claude-sms server
```

This starts the SMS bridge server and automatically creates a public webhook URL via cloudflared.

### 4. Configure Telnyx Webhook

Set your webhook URL in Telnyx to receive SMS replies. See [TELNYX.md - Webhook Configuration](./TELNYX.md#6-webhook-configuration) for details.

The webhook URL is displayed when you start the server (e.g., `https://xxx.trycloudflare.com/webhook/telnyx`).

### 5. Test the Setup

```bash
npx claude-sms test
```

Or in Claude Code:
```
/sms-test
```

---

## 📋 Quick Reference

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
| `npx claude-sms server` | Start bridge server with cloudflared tunnel |
| `npx claude-sms status` | Check server status |
| `npx claude-sms enable` | Enable SMS globally |
| `npx claude-sms disable` | Disable SMS globally |
| `npx claude-sms test` | Send test SMS |
| `npx claude-sms config` | Show configuration |

---

## 📖 Usage

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

## 🔄 How It Works

```
┌─────────────────┐    Hook     ┌─────────────────┐    SMS     ┌──────────┐
│  Claude Code    │───triggered─▶│  Bridge Server  │───────────▶│  Phone   │
│                 │             │                 │            │          │
│                 │◀──response──│                 │◀───reply───│          │
└─────────────────┘             └─────────────────┘            └──────────┘
```

1. Claude Code triggers a hook (notification, tool use, etc.)
2. Hook sends message to bridge server
3. Bridge server sends SMS via Telnyx
4. User replies via SMS
5. Telnyx webhook delivers reply to bridge server
6. Hook retrieves response and returns it to Claude Code

---

## 📨 SMS Format

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

## 🎣 Hook Events

| Event | Trigger | SMS Sent |
|-------|---------|----------|
| `Notification` | Status updates, completions | Yes (by default) |
| `Stop` | Session ends | Yes (by default) |
| `PreToolUse` | Before Bash/Write/Edit | Yes (awaits approval) |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELNYX_API_KEY` | Yes | API Key from Auth V2 (starts with `KEY...`) |
| `TELNYX_FROM_NUMBER` | Yes | Your Telnyx number in E.164 format (e.g., `+15551234567`) |
| `SMS_USER_PHONE` | Yes | Your mobile in E.164 format (e.g., `+15559876543`) |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | Yes | Public key for webhook signature verification (see [TELNYX.md](./TELNYX.md#6-webhook-configuration)) |
| `SMS_BRIDGE_URL` | No | Bridge server URL (default: localhost:3847) |
| `SMS_BRIDGE_PORT` | No | Server port (default: 3847) |
| `CLOUDFLARE_TUNNEL_ID` | No | Tunnel ID for persistent URL (see below) |
| `CLOUDFLARE_TUNNEL_URL` | No | Your persistent tunnel URL |

### Persistent Tunnel URL

By default, the server creates a random tunnel URL each time it starts (e.g., `https://random-words.trycloudflare.com`). This requires updating your Telnyx webhook URL after each restart.

For a persistent URL that never changes:

**Prerequisites:** A domain managed by Cloudflare (free tier works). You can use an existing domain—the tunnel uses a subdomain and won't affect your main site.

1. **Install cloudflared:**
   ```bash
   # macOS
   brew install cloudflared

   # Linux
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
   chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/
   ```

2. **Authenticate** (opens browser—select any domain you own):
   ```bash
   cloudflared tunnel login
   ```

3. **Create tunnel:**
   ```bash
   cloudflared tunnel create claude-sms
   ```

4. **Route DNS** (automatically creates the subdomain):
   ```bash
   cloudflared tunnel route dns claude-sms claude-sms.yourdomain.com
   ```

5. **Create config file** at `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: claude-sms
   credentials-file: ~/.cloudflared/<tunnel-id>.json

   ingress:
     - hostname: claude-sms.yourdomain.com
       service: http://localhost:3847
     - service: http_status:404
   ```
   (Find your `<tunnel-id>.json` filename in `~/.cloudflared/`)

6. **Add to your `.env`:**
   ```bash
   CLOUDFLARE_TUNNEL_ID=claude-sms
   CLOUDFLARE_TUNNEL_URL=https://claude-sms.yourdomain.com
   ```

7. **Set Telnyx webhook once:**
   ```
   https://claude-sms.yourdomain.com/webhook/telnyx
   ```

Now the webhook URL stays the same across restarts.

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

## 🔒 Security

- **Phone Verification** — Only responds to registered phone number
- **Session IDs** — Prevent cross-session interference
- **Timeout** — Sessions expire after 30 minutes of inactivity
- **No Secrets** — Never sends credentials/secrets via SMS

---

## 🔧 Troubleshooting

<details>
<summary><b>❌ SMS Not Sending</b></summary>

1. Check environment variables: `npx claude-sms config`
2. Verify Telnyx API key in [Telnyx Portal](https://portal.telnyx.com)
3. Ensure phone number is SMS-capable and assigned to a messaging profile
4. **US numbers**: Verify 10DLC registration is complete (see [TELNYX.md](./TELNYX.md#5-10dlc-registration-us-only))
5. Check server logs for errors
</details>

<details>
<summary><b>📭 Response Not Received</b></summary>

1. Verify tunnel is running: look for URL in server output
2. Check Telnyx messaging profile webhook configuration matches tunnel URL
3. Ensure session ID matches in reply (`[CC-xxx]` prefix)
</details>

<details>
<summary><b>🚫 Server Not Starting</b></summary>

1. Check if port 3847 is in use: `lsof -i :3847`
2. Verify all required env vars are set
3. Try a different port: `npx claude-sms server -p 3848`
</details>

<details>
<summary><b>🔗 Tunnel Issues</b></summary>

1. Ensure cloudflared is installed: `which cloudflared`
2. Check cloudflared logs in server output
3. For persistent tunnels, verify `CLOUDFLARE_TUNNEL_ID` matches your tunnel name
4. Check DNS configuration in Cloudflare dashboard
</details>

<details>
<summary><b>🇺🇸 US Messages Not Delivering</b></summary>

See [TELNYX.md - US Carrier Registration](./TELNYX.md#5-us-carrier-registration) for complete setup guide.

**Recommended fix:** Switch to a toll-free number with simple verification (no 10DLC needed).

If using 10DLC (local number):
1. Brand status must be "Verified"
2. Campaign status must be "Approved"
3. Phone number must be assigned to campaign

US carriers block all unregistered A2P traffic with error code `40010`.
</details>

---

## 🛠️ Development

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

## 🔬 Technologies

- **[Commander.js](https://github.com/tj/commander.js)** — CLI framework
- **[Telnyx](https://telnyx.com)** — SMS sending/receiving (~52% cheaper than alternatives)
- **[cloudflared](https://github.com/cloudflare/cloudflared)** — Secure tunnel for webhooks
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe development
- **[Vitest](https://vitest.dev/)** — Testing framework

---

## 💰 Cost Estimate

### With Toll-Free Number (Recommended)

| Service | Cost |
|---------|------|
| Telnyx toll-free number | ~$2/month |
| Telnyx SMS (US) | ~$0.004/message |
| Toll-free verification | Free |
| Cloudflared tunnel | Free |
| **Monthly total** | **~$3** |

### With Local Number (10DLC)

| Service | Cost |
|---------|------|
| Telnyx local number | ~$1/month |
| Telnyx SMS (US) | ~$0.003/message |
| 10DLC brand registration | $4.50 one-time |
| 10DLC campaign review | $15 one-time |
| 10DLC campaign (Low Volume) | $1.50/month |
| Cloudflared tunnel | Free |
| **First month** | **~$25** |
| **Ongoing monthly** | **~$3-5** |

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests
4. Submit a pull request

---

## 📄 License

MIT — See [LICENSE](./LICENSE) for details.

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/chris-bluera/claude-sms/issues)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Telnyx Setup**: [TELNYX.md](./TELNYX.md)
