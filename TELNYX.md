# Telnyx Setup Guide

Complete guide to setting up Telnyx for Claude SMS.

## Table of Contents

- [1. Create Account](#1-create-account)
- [2. Purchase Phone Number](#2-purchase-phone-number)
- [3. Create Messaging Profile](#3-create-messaging-profile)
- [4. Generate API Key](#4-generate-api-key)
- [5. US Carrier Registration](#5-us-carrier-registration)
- [6. Webhook Configuration](#6-webhook-configuration)
- [7. Environment Variables](#7-environment-variables)
- [8. Cost Breakdown](#8-cost-breakdown)
- [9. Troubleshooting](#9-troubleshooting)

---

## 1. Create Account

1. Go to [telnyx.com](https://telnyx.com) and click **Sign Up**
2. Complete registration and verify email
3. Complete **KYC verification** (government-issued ID required)
4. Add payment method (pay-as-you-go, no minimums)

---

## 2. Purchase Phone Number

> **For US SMS: We strongly recommend toll-free numbers** (see [US Carrier Registration](#5-us-carrier-registration) for why)

1. In [Mission Control Portal](https://portal.telnyx.com), go to **Numbers** → **Search & Buy**
2. Search for numbers:
   - **Recommended**: Filter for toll-free (800, 888, 877, 866, 855, 844, 833)
   - Alternative: Local 10-digit numbers (requires complex 10DLC registration)
3. Purchase a number (~$1-2/month)

---

## 3. Create Messaging Profile

1. Go to **Messaging** → **Programmable Messaging**
2. Click **Add New Profile**
3. Name it (e.g., "claude-sms")
4. Under **Inbound Settings**, you'll add the webhook URL later
5. Leave all optional settings at defaults
6. Click **Save**

### Assign Number to Profile

1. Go to **Numbers** → **My Numbers**
2. Find your number, click the **Messaging Profile** dropdown
3. Select the profile you created
4. Accept the monthly charge prompt

---

## 4. Generate API Key

1. Go to **API Keys** (left sidebar under "Auth")
2. Ensure you're in **Auth V2**
3. Click **Create API Key**
4. **Save this key immediately** — you won't see it again!

The key starts with `KEY...`

---

## 5. US Carrier Registration

US carriers require registration for A2P (Application-to-Person) messaging. You have two options:

| | Toll-Free (Recommended) | 10DLC |
|---|---|---|
| **Registration** | Single form per number | Brand + Campaign + opt-in forms + privacy policy |
| **Cost** | Free to register | $4.50 brand + $15 campaign + $1.50/mo |
| **Approval** | Usually 1-2 days | Days to weeks, can be rejected for minor issues |
| **Throughput** | 1,200 msg/min | Up to 6 msg/min (varies by trust score) |

### Option A: Toll-Free Verification (Recommended)

Toll-free numbers are **NOT subject to 10DLC requirements** and have a much simpler registration process.

1. Go to **Messaging** → **Toll-Free Verification**
2. Click **Verify Number** for your toll-free number
3. Fill out the single verification form:
   - **Business name**: Your name or company
   - **Use case**: `Account notifications for developer tools`
   - **Sample message**: `[CC-abc123] Task completed. Reply with your response.`
   - **Message volume**: Low (estimate monthly volume)
4. Submit and wait for approval (typically 1-2 business days)

That's it. No brand registration, no campaign forms, no opt-in screenshots.

### Option B: 10DLC Registration (Local Numbers Only)

<details>
<summary><b>Click to expand 10DLC instructions (not recommended)</b></summary>

> **Warning**: 10DLC has extensive compliance requirements including opt-in form screenshots, privacy policy review, and specific message language. Campaigns can be rejected for minor issues.

#### Step 1: Register Your Brand ($4.50 one-time)

1. Go to **Messaging** → **10DLC** → **Brands** → **Create Brand**
2. Provide business information:
   - **With EIN**: Legal company name, EIN, address (must match IRS Form CP-575)
   - **Sole Proprietor**: Name, address, government-issued ID, SSN
3. Submit and wait for verification (usually instant, sometimes 24-48 hours)
4. Status should show **Verified** (green dot)

#### Step 2: Create a Campaign ($15 one-time + $1.50/month)

1. Click on your brand → **Create Campaign**
2. Select use case: `Low Volume Mixed` → `Account Notification`
3. Vertical: `Information Technology Services`

**Campaign Description:**
```
Developer tool notifications. Software sends automated alerts to the
developer's own mobile phone for task status updates, completion notices,
and approval requests. Single recipient (developer only).
```

**Opt In Workflow Description:**
```
Digital: Developer configures their own phone number in software settings
and explicitly enables SMS notifications. Only the account owner receives
messages. No third-party recipients.
```

**Opt in message** (must include "Message frequency varies"):
```
Claude SMS: You've enabled notifications. Message frequency varies. Reply HELP for help or STOP to unsubscribe. Msg&data rates may apply.
```

**Opt out message:**
```
Claude SMS: You are unsubscribed and will receive no further messages.
```

**Help message:**
```
Claude SMS: For help, visit github.com/chris-bluera/claude-sms
```

**Sample Message:**
```
[CC-abc123] ✅ Session ended: Task completed successfully. Reply with your response. Reply STOP to opt out.
```

**Campaign attributes** (all No):
- Embedded Link: No
- Embedded Phone Number: No
- Number Pooling: No
- Age-Gated Content: No
- Direct Lending or Loan Arrangement: No

**Additional requirements** (common rejection reasons):
- Opt-in form screenshot showing phone field and SMS consent language ([example](https://support.telnyx.com/en/articles/10684260-10dlc-opt-in-form))
- Compliant privacy policy ([requirements](https://support.telnyx.com/en/articles/10645583-10dlc-privacy-policy))

#### Step 3: Assign Number to Campaign

Once campaign is approved, add your phone number to the campaign.

</details>

---

## 6. Webhook Configuration

### Get Public Key (for signature verification)

1. Go to Telnyx Portal → **API Keys** (left sidebar)
2. Look for **Public Key** section
3. Copy the base64 key (looks like: `zQuwEq2A2KxzDWGqPPJ7gJhuQ6gFp51w9WxqDhPNVDM=`)
4. Set as `TELNYX_WEBHOOK_PUBLIC_KEY` environment variable

### Configure Webhook URL

1. Go to **Messaging** → **Messaging Profiles**
2. Select your profile
3. Under **Inbound Settings**, set webhook URL:
   ```
   https://your-tunnel-url/webhook/telnyx
   ```
4. The URL is shown when you run `npx claude-sms server`

For persistent URLs, see the [Persistent Tunnel URL](./README.md#persistent-tunnel-url) section in README.

---

## 7. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELNYX_API_KEY` | Yes | API Key from Auth V2 (starts with `KEY...`) |
| `TELNYX_FROM_NUMBER` | Yes | Your Telnyx number in E.164 format (e.g., `+18005551234`) |
| `SMS_USER_PHONE` | Yes | Your mobile in E.164 format (e.g., `+15559876543`) |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | Yes | Public key for webhook signature verification |

Example `.env`:

```bash
TELNYX_API_KEY=KEY019B9369154442FBFBA7CDBDF803514C_xxxxxxxxxx
TELNYX_FROM_NUMBER=+18005551234
SMS_USER_PHONE=+15559876543
TELNYX_WEBHOOK_PUBLIC_KEY=zQuwEq2A2KxzDWGqPPJ7gJhuQ6gFp51w9WxqDhPNVDM=
```

---

## 8. Cost Breakdown

### With Toll-Free (Recommended)

| Item | Cost |
|------|------|
| Telnyx toll-free number | ~$2/month |
| Telnyx SMS (US) | ~$0.004/message |
| Toll-free verification | Free |
| Cloudflared tunnel | Free |
| **First month** | **~$3** |
| **Ongoing monthly** | **~$3** |

### With 10DLC (Local Number)

| Item | Cost |
|------|------|
| Telnyx local number | ~$1/month |
| Telnyx SMS (US) | ~$0.003/message |
| 10DLC brand registration | $4.50 one-time |
| 10DLC campaign review | $15 one-time |
| 10DLC campaign (Low Volume) | $1.50/month |
| Cloudflared tunnel | Free |
| **First month** | **~$25** |
| **Ongoing monthly** | **~$3-5** |

---

## 9. Troubleshooting

### "Not 10DLC registered" error (code 40010)

This error means you're using a local (10-digit) number without completed 10DLC registration.

**Solutions:**
1. **Switch to toll-free** (recommended) - Buy a toll-free number and complete the simpler verification
2. **Complete 10DLC** - See [Option B](#option-b-10dlc-registration-local-numbers-only) above

### "delivery_failed" status

Check the message status via API:

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  https://api.telnyx.com/v2/messages/{message_id}
```

Look at the `errors` array for the specific reason.

### Authentication failed

- API key must start with `KEY...`
- Use Bearer token format: `Authorization: Bearer KEY...`
- Ensure no extra whitespace in the key

### Webhook not receiving replies

- Check tunnel is running (`npx claude-sms server`)
- Verify webhook URL in messaging profile matches your tunnel URL
- Check `TELNYX_WEBHOOK_PUBLIC_KEY` is set correctly
- Look at server logs for signature verification errors

### Toll-free verification rejected

Common reasons:
- Vague use case description (be specific about what messages you'll send)
- Sample message doesn't match actual use case
- Missing opt-out language in sample message

### SMS sent but not delivered

Common causes:
- Carrier filtering (registration not complete)
- Invalid recipient number
- Insufficient account balance

Check message status via API to see delivery details.

---

## Resources

- [Telnyx 10DLC vs Toll-Free Guide](https://telnyx.com/resources/10dlc-vs-toll-free-isvs)
- [Toll-Free Verification Docs](https://developers.telnyx.com/docs/messaging/toll-free-verification)
- [10DLC Compliance Guide](https://support.telnyx.com/en/collections/3147004-10dlc-and-toll-free-text-messaging-compliance-guide)
