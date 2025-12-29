/**
 * Twilio API client for sending SMS
 */

import type { TwilioConfig, Result, HookEvent } from '../shared/types.js';

const MAX_SMS_LENGTH = 1500;

/**
 * Format a message for SMS with session ID prefix
 */
export function formatSMSMessage(sessionId: string, event: HookEvent, message: string): string {
  const prefix = `[CC-${sessionId}] `;
  const emoji = getEventEmoji(event);
  const header = getEventHeader(event);

  const fullMessage = `${prefix}${emoji} ${header}\n\n${message}\n\nReply with your response`;

  // Truncate if too long
  if (fullMessage.length > MAX_SMS_LENGTH) {
    const available = MAX_SMS_LENGTH - prefix.length - emoji.length - header.length - 30; // Reserve space for header/footer
    const truncated = `${message.substring(0, available - 3)}...`;
    return `${prefix}${emoji} ${header}\n\n${truncated}\n\nReply with your response`;
  }

  return fullMessage;
}

/**
 * Get emoji for hook event type
 */
function getEventEmoji(event: HookEvent): string {
  switch (event) {
    case 'Notification':
      return '📢';
    case 'Stop':
      return '✅';
    case 'PreToolUse':
      return '⚠️';
    case 'UserPromptSubmit':
      return '🤖';
    default:
      return '💬';
  }
}

/**
 * Get header text for hook event type
 */
function getEventHeader(event: HookEvent): string {
  switch (event) {
    case 'Notification':
      return 'Notification:';
    case 'Stop':
      return 'Session ended:';
    case 'PreToolUse':
      return 'Approve tool use?';
    case 'UserPromptSubmit':
      return 'Claude needs input:';
    default:
      return 'Message:';
  }
}

/**
 * Twilio client for sending and receiving SMS
 */
export class TwilioClient {
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
  }

  /**
   * Send an SMS message
   */
  async sendSMS(message: string): Promise<Result<string, string>> {
    const { accountSid, authToken, fromNumber, userPhone } = this.config;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: userPhone,
          From: fromNumber,
          Body: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Twilio API error: ${response.status} - ${errorText}`,
        };
      }

      const data = (await response.json()) as { sid?: string };
      return {
        success: true,
        data: data.sid ?? 'unknown',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to send SMS: ${errorMessage}`,
      };
    }
  }

  /**
   * Send a formatted message for a hook event
   */
  async sendHookMessage(
    sessionId: string,
    event: HookEvent,
    message: string
  ): Promise<Result<string, string>> {
    const formattedMessage = formatSMSMessage(sessionId, event, message);
    return this.sendSMS(formattedMessage);
  }

  /**
   * Send an error response SMS
   */
  async sendErrorResponse(message: string): Promise<Result<string, string>> {
    return this.sendSMS(`❌ ${message}`);
  }

  /**
   * Send a confirmation SMS
   */
  async sendConfirmation(sessionId: string): Promise<Result<string, string>> {
    return this.sendSMS(`✓ Response received for CC-${sessionId}`);
  }

  /**
   * Validate Twilio webhook signature (optional security)
   */
  validateWebhookSignature(
    _signature: string,
    _url: string,
    _params: Record<string, string>
  ): boolean {
    // TODO: Implement Twilio signature validation
    // For now, we rely on phone number verification
    return true;
  }

  /**
   * Verify the from phone number matches configured user
   */
  verifyFromNumber(from: string): boolean {
    // Normalize phone numbers for comparison
    const normalize = (num: string): string => num.replace(/\D/g, '');
    return normalize(from) === normalize(this.config.userPhone);
  }
}

/**
 * Generate TwiML response for Twilio webhook
 */
export function generateTwiML(message?: string): string {
  if (message !== undefined && message !== '') {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  }
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
