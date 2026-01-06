/**
 * Telnyx API client for sending SMS
 */
const MAX_SMS_LENGTH = 1500;
/**
 * Format a message for SMS with session ID prefix
 */
export function formatSMSMessage(sessionId, event, message) {
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
function getEventEmoji(event) {
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
function getEventHeader(event) {
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
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Send an SMS message
     */
    async sendSMS(message) {
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
            const rawData = await response.json();
            // Validate response structure
            if (typeof rawData !== 'object' ||
                rawData === null ||
                !('data' in rawData) ||
                typeof rawData.data !== 'object' ||
                rawData.data === null ||
                !('id' in rawData.data) ||
                typeof rawData.data.id !== 'string') {
                throw new Error('Invalid Telnyx response: missing message ID');
            }
            return {
                success: true,
                data: rawData.data.id,
            };
        }
        catch (error) {
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
    async sendHookMessage(sessionId, event, message) {
        const formattedMessage = formatSMSMessage(sessionId, event, message);
        return this.sendSMS(formattedMessage);
    }
    /**
     * Send an error response SMS
     */
    async sendErrorResponse(message) {
        return this.sendSMS(`❌ ${message}`);
    }
    /**
     * Send a confirmation SMS
     */
    async sendConfirmation(sessionId) {
        return this.sendSMS(`✓ Response received for CC-${sessionId}`);
    }
    /**
     * Verify the from phone number matches configured user
     */
    verifyFromNumber(from) {
        // Normalize phone numbers for comparison
        const normalize = (num) => num.replace(/\D/g, '');
        return normalize(from) === normalize(this.config.userPhone);
    }
}
//# sourceMappingURL=telnyx.js.map