/**
 * Email client for sending and receiving messages via SMTP/IMAP
 *
 * Replaces the macOS Messages.app integration with traditional email.
 * Uses Gmail by default (smtp.gmail.com / imap.gmail.com).
 */
import type { Result, HookEvent, ParsedSMS } from '../shared/types.js';
/**
 * Configuration for Email client
 */
export interface EmailConfig {
    user: string;
    pass: string;
    recipient: string;
    smtpHost: string;
    smtpPort: number;
    imapHost: string;
    imapPort: number;
    pollIntervalMs: number;
}
/**
 * Format an email subject with session ID prefix
 */
export declare function formatSubject(sessionId: string, event: HookEvent): string;
/**
 * Format the email body
 */
export declare function formatBody(message: string): string;
/**
 * Email client for sending and receiving messages
 */
export declare class EmailClient {
    private readonly config;
    private transporter;
    private messageCallback;
    private pollInterval;
    private readonly processedMessageIds;
    constructor(config: EmailConfig);
    /**
     * Initialize the email client - set up SMTP transporter
     */
    initialize(): Result<void, string>;
    /**
     * Send an email
     */
    sendEmail(subject: string, body: string): Promise<Result<string, string>>;
    /**
     * Send a formatted email for a hook event
     */
    sendHookMessage(sessionId: string, event: HookEvent, message: string): Promise<Result<string, string>>;
    /**
     * Send an error response
     */
    sendErrorResponse(message: string): Promise<Result<string, string>>;
    /**
     * Send a confirmation
     */
    sendConfirmation(sessionId: string): Promise<Result<string, string>>;
    /**
     * Start polling for incoming emails
     */
    startPolling(callback: (message: ParsedSMS) => void): void;
    /**
     * Check for new emails via IMAP
     */
    private checkForNewEmails;
    /**
     * Parse an email for session ID using In-Reply-To header or subject fallback
     */
    private parseEmail;
    /**
     * Extract just the reply text, removing MIME headers and quoted content
     */
    private extractReplyText;
    /**
     * Strip MIME boundaries and headers from email body
     */
    private stripMimeContent;
    /**
     * Decode quoted-printable encoded text
     */
    private decodeQuotedPrintable;
    /**
     * Stop polling for emails
     */
    stopPolling(): void;
    /**
     * Verify the from email matches configured recipient
     */
    verifyFromEmail(from: string): boolean;
    /**
     * Clean up resources
     */
    dispose(): void;
}
//# sourceMappingURL=email.d.ts.map