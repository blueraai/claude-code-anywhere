/**
 * Twilio API client for sending SMS
 */
import type { TwilioConfig, Result, HookEvent } from '../shared/types.js';
/**
 * Format a message for SMS with session ID prefix
 */
export declare function formatSMSMessage(sessionId: string, event: HookEvent, message: string): string;
/**
 * Twilio client for sending and receiving SMS
 */
export declare class TwilioClient {
    private readonly config;
    constructor(config: TwilioConfig);
    /**
     * Send an SMS message
     */
    sendSMS(message: string): Promise<Result<string, string>>;
    /**
     * Send a formatted message for a hook event
     */
    sendHookMessage(sessionId: string, event: HookEvent, message: string): Promise<Result<string, string>>;
    /**
     * Send an error response SMS
     */
    sendErrorResponse(message: string): Promise<Result<string, string>>;
    /**
     * Send a confirmation SMS
     */
    sendConfirmation(sessionId: string): Promise<Result<string, string>>;
    /**
     * Validate Twilio webhook signature (optional security)
     */
    validateWebhookSignature(_signature: string, _url: string, _params: Record<string, string>): boolean;
    /**
     * Verify the from phone number matches configured user
     */
    verifyFromNumber(from: string): boolean;
}
/**
 * Generate TwiML response for Twilio webhook
 */
export declare function generateTwiML(message?: string): string;
//# sourceMappingURL=twilio.d.ts.map