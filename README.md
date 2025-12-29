# Claude SMS

SMS notifications and bidirectional communication for Claude Code via Twilio.

Get notified when Claude needs input and respond from anywhere via text message.

## Features

- **Notifications** - Get SMS alerts when tasks complete or errors occur
- **Interactive Prompts** - Respond to Claude's questions via text
- **Approval Requests** - Approve or deny destructive operations remotely
- **Multi-Session** - Track multiple Claude Code sessions independently
- **Easy Toggle** - Enable/disable SMS with `/sms on` or `/sms off`
- **Built-in Tunnel** - Automatic webhook exposure via cloudflared

## Quick Start

### Prerequisites

- Node.js 18+ (via nvm recommended for WSL)
- Twilio account with SMS-capable phone number

### 1. Install the Plugin

```bash
claude /plugin add github.com/chris-bluera/claude-sms
```

### 2. Set Environment Variables

```bash
export TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
export TWILIO_AUTH_TOKEN=your-auth-token
export TWILIO_FROM_NUMBER=+1234567890
export SMS_USER_PHONE=+1987654321
```

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for persistence.

### 3. Start the Bridge Server

```bash
npx claude-sms server
```

This starts the SMS bridge server and automatically creates a public webhook URL via cloudflared.

### 4. Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Your Number**
3. Under "Messaging", set webhook URL to:
   ```
   https://your-tunnel-url.trycloudflare.com/webhook/twilio
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

## Usage

### Commands

| Command | Description |
|---------|-------------|
| `/sms on` | Enable SMS for current session |
| `/sms off` | Disable SMS for current session |
| `/sms off --all` | Disable SMS globally |
| `/sms status` | Show current status |
| `/sms-test` | Send a test SMS |

### CLI

| Command | Description |
|---------|-------------|
| `npx claude-sms server` | Start bridge server with cloudflared tunnel |
| `npx claude-sms status` | Check server status |
| `npx claude-sms enable` | Enable SMS globally |
| `npx claude-sms disable` | Disable SMS globally |
| `npx claude-sms test` | Send test SMS |
| `npx claude-sms config` | Show configuration |

## How It Works

```
┌─────────────────┐    Hook     ┌─────────────────┐    SMS     ┌──────────┐
│  Claude Code    │───triggered─▶│  Bridge Server  │───────────▶│  Phone   │
│                 │             │                 │            │          │
│                 │◀──response──│                 │◀───reply───│          │
└─────────────────┘             └─────────────────┘            └──────────┘
```

1. Claude Code triggers a hook (notification, tool use, etc.)
2. Hook sends message to bridge server
3. Bridge server sends SMS via Twilio
4. User replies via SMS
5. Twilio webhook delivers reply to bridge server
6. Hook retrieves response and returns it to Claude Code

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

## Hook Events

| Event | Trigger | SMS Sent |
|-------|---------|----------|
| `Notification` | Status updates, completions | Yes (by default) |
| `Stop` | Session ends | Yes (by default) |
| `PreToolUse` | Before Bash/Write/Edit | Yes (awaits approval) |

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Yes | Your Twilio phone number |
| `SMS_USER_PHONE` | Yes | Your mobile number |
| `SMS_BRIDGE_URL` | No | Bridge server URL (default: localhost:3847) |
| `SMS_BRIDGE_PORT` | No | Server port (default: 3847) |
| `CLOUDFLARE_TUNNEL_ID` | No | Tunnel ID for persistent URL (see below) |
| `CLOUDFLARE_TUNNEL_URL` | No | Your persistent tunnel URL |

### Persistent Tunnel URL

By default, the server creates a random tunnel URL each time it starts (e.g., `https://random-words.trycloudflare.com`). This requires updating your Twilio webhook URL after each restart.

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

## Security

- **Phone Verification** - Only responds to registered phone number
- **Session IDs** - Prevent cross-session interference
- **Timeout** - Sessions expire after 30 minutes of inactivity
- **No Secrets** - Never sends credentials/secrets via SMS

## Troubleshooting

### SMS Not Sending

1. Check environment variables: `npx claude-sms config`
2. Verify Twilio credentials in [Twilio Console](https://console.twilio.com)
3. Ensure phone number is SMS-capable
4. Check server logs for errors

### Response Not Received

1. Verify tunnel is running: look for URL in server output
2. Check Twilio webhook configuration matches tunnel URL
3. Ensure session ID matches in reply (`[CC-xxx]` prefix)

### Server Not Starting

1. Check if port 3847 is in use: `lsof -i :3847`
2. Verify all required env vars are set
3. Try a different port: `npx claude-sms server -p 3848`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run linting
npm run lint

# Type check
npm run typecheck

# Format code
npm run format
```

## Cost Estimate

- Twilio SMS (US): ~$0.0079/message
- Cloudflared tunnel: Free
- Estimated monthly (moderate use): $5-15

## License

MIT
