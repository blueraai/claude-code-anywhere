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

<details>
<summary><b>First-time Telnyx setup (click to expand)</b></summary>

### 1. Create Telnyx Account

1. Go to [telnyx.com](https://telnyx.com) and click **Sign Up**
2. Complete registration and verify email
3. Complete **KYC verification** (government-issued ID required)
4. Add payment method (pay-as-you-go, no minimums)

### 2. Purchase Phone Number

1. In [Mission Control Portal](https://portal.telnyx.com), go to **Numbers** → **Search & Buy**
2. Search for numbers (filter by SMS capability)
3. Purchase a number (~$1/month for US local)

### 3. Create Messaging Profile

1. Go to **Messaging** → **Programmable Messaging**
2. Click **Add New Profile**
3. Name it (e.g., "claude-sms")
4. Under **Inbound Settings**, you'll add the webhook URL later
5. Leave all optional settings at defaults (number pool, MMS, spend limits — unchecked)
6. Click **Save**

### 4. Assign Number to Profile

1. Go to **Numbers** → **My Numbers**
2. Find your number, click the **Messaging Profile** dropdown
3. Select the profile you created
4. Accept the monthly charge prompt

### 5. Generate API Key

1. Go to **API Keys** (left sidebar under "Auth")
2. Ensure you're in **Auth V2**
3. Click **Create API Key**
4. **Save this key immediately** — you won't see it again!

### 6. 10DLC Registration (US only)

**Required for US SMS.** Without 10DLC registration, messages will be blocked by carriers.

#### Step A: Register Your Brand ($4.50 one-time)

1. Go to **Messaging** → **10DLC** → **Brands** → **Create Brand**
2. Provide business information:
   - **With EIN**: Legal company name, EIN, address (must match IRS Form CP-575)
   - **Sole Proprietor**: Name, address, government-issued ID, SSN
3. Submit and wait for verification (usually instant, sometimes 24-48 hours)

#### Step B: Create a Campaign ($15 + monthly fee)

1. Go to **Campaigns** → **Create Campaign**
2. Select your brand and use case type:
   - **Low Volume Mixed** ($1.50/month) — recommended for personal/developer use
   - **Standard** ($10/month) — higher throughput
3. Provide required details:
   - Sample messages you'll send
   - Opt-in/opt-out message templates
   - Brief description of your use case (e.g., "Developer notifications from coding assistant")
4. Submit for review (1-2 business days)

#### Step C: Assign Number to Campaign

1. Once campaign is approved, go to campaign settings
2. Add your phone number to the campaign

> **Important**: As of Feb 2025, unregistered 10DLC traffic is **blocked entirely** by US carriers. See [Telnyx 10DLC Guide](https://support.telnyx.com/en/articles/6325731-register-for-10dlc-messaging) for details.

</details>

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

1. Go to [Telnyx Portal](https://portal.telnyx.com)
2. Navigate to **Messaging** → **Messaging Profiles**
3. Create or select a messaging profile
4. Under "Inbound Settings", set webhook URL to:
   ```
   https://your-tunnel-url.trycloudflare.com/webhook/telnyx
   ```
   (The URL is displayed when you start the server)

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
| `SMS_BRIDGE_URL` | No | Bridge server URL (default: localhost:3847) |
| `SMS_BRIDGE_PORT` | No | Server port (default: 3847) |
| `CLOUDFLARE_TUNNEL_ID` | No | Tunnel ID for persistent URL (see below) |
| `CLOUDFLARE_TUNNEL_URL` | No | Your persistent tunnel URL |

### Persistent Tunnel URL

By default, the server creates a random tunnel URL each time it starts (e.g., `https://random-words.trycloudflare.com`). This requires updating your Telnyx webhook URL after each restart.

For a persistent URL that never changes:

1. **Create a Cloudflare tunnel** (one-time):
   ```bash
   # Install cloudflared if not already installed
   # Then authenticate and create tunnel
   cloudflared tunnel login
   cloudflared tunnel create claude-sms
   ```

2. **Configure DNS** in Cloudflare dashboard:
   - Add a CNAME record pointing to your tunnel

3. **Set environment variables**:
   ```bash
   export CLOUDFLARE_TUNNEL_ID=claude-sms
   export CLOUDFLARE_TUNNEL_URL=https://claude-sms.yourdomain.com
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
4. Check server logs for errors
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

1. Verify 10DLC registration is complete in [Telnyx Portal](https://portal.telnyx.com)
2. Check campaign status is "Approved"
3. Ensure phone number is assigned to registered campaign
4. US carriers heavily filter unregistered A2P traffic
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

| Service | Cost |
|---------|------|
| Telnyx phone number | ~$1/month |
| Telnyx SMS (US) | ~$0.003-0.005/message |
| 10DLC brand registration | $4.50 one-time |
| 10DLC campaign review | $15 one-time |
| 10DLC campaign (Low Volume) | $1.50/month |
| Cloudflared tunnel | Free |
| **First month (setup + use)** | **~$25** |
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
