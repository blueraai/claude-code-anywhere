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

US carriers require registration for A2P (Application-to-Person) messaging. **Use a toll-free number** — it's simpler, cheaper, and faster.

### Toll-Free Verification

1. Go to **Messaging** → **Compliance**
2. Find your toll-free number and click to verify
3. Fill out the verification form:

| Field | Value |
|-------|-------|
| **Summarize use-case** | `Developer tool notifications to my own phone` |
| **Message content** | `[CC-abc123] Task completed. Reply with your response. Reply STOP to opt out.` |
| **Opt-In workflow** | `Developer configures their own phone number in software settings and enables notifications. Single recipient only.` |
| **Additional use-case details** | `Personal developer tool. Software sends task status alerts to the developer's own mobile phone. No third-party recipients.` |
| **Opt-In workflow image URL** | Screenshot of your config (e.g., `.env` file or README setup section)* |
| **Opt in keywords** | `START` |
| **Opt in message** | `You are subscribed to Claude SMS for developer notifications. Reply STOP to opt out. Reply HELP for help. Msg&data rates may apply. Message frequency varies.` |
| **Help message** | `Claude SMS: Developer notifications from Claude Code. Reply STOP to unsubscribe. Contact: github.com/chris-bluera/claude-sms` |
| **Privacy policy URL** | Leave blank |
| **Terms and conditions URL** | Leave blank |
| **ISV Reseller** | Leave blank |
| **Age-Gated Content** | No |

*For the image URL, host a screenshot anywhere (imgur, GitHub) showing where the phone number is configured.

4. Submit and wait for approval (typically 1-2 business days)

### Why Not 10DLC?

If you use a local (10-digit) number instead of toll-free, you'll need 10DLC registration which requires:
- Brand registration ($4.50) + Campaign registration ($15 + $1.50/mo)
- Opt-in form screenshots, privacy policy compliance, specific message language
- Campaigns can be rejected for minor issues and take weeks to approve

**Just use toll-free.** It's free to register and approval takes 1-2 days.

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

| Item | Cost |
|------|------|
| Telnyx toll-free number | ~$2/month |
| Telnyx SMS (US) | ~$0.004/message |
| Toll-free verification | Free |
| Cloudflared tunnel | Free |
| **Monthly total** | **~$3** |

---

## 9. Troubleshooting

### "Not 10DLC registered" error (code 40010)

You're using a local (10-digit) number. Switch to a toll-free number instead — it doesn't require 10DLC registration.

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
