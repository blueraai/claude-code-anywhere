/**
 * Telnyx API client for sending SMS
 */

import type { TelnyxConfig, Result, HookEvent } from '../shared/types.js';

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
 * Telnyx client for sending and receiving SMS
 */
export class TelnyxClient {
  private readonly config: TelnyxConfig;

  constructor(config: TelnyxConfig) {
    this.config = config;
  }

  /**
   * Send an SMS message
   */
  async sendSMS(message: string): Promise<Result<string, string>> {
    const { apiKey, fromNumber, userPhone } = this.config;

    const url = 'https://api.telnyx.com/v2/messages';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromNumber,
          to: userPhone,
          text: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Telnyx API error: ${String(response.status)} - ${errorText}`,
        };
      }

      const rawData: unknown = await response.json();

      // Validate response structure
      if (
        typeof rawData !== 'object' ||
        rawData === null ||
        !('data' in rawData) ||
        typeof rawData.data !== 'object' ||
        rawData.data === null ||
        !('id' in rawData.data) ||
        typeof rawData.data.id !== 'string'
      ) {
        throw new Error('Invalid Telnyx response: missing message ID');
      }

      return {
        success: true,
        data: rawData.data.id,
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
   * Verify the from phone number matches configured user
   */
  verifyFromNumber(from: string): boolean {
    // Normalize phone numbers for comparison
    const normalize = (num: string): string => num.replace(/\D/g, '');
    return normalize(from) === normalize(this.config.userPhone);
  }
}
