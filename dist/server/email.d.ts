/**
 * Email client for sending and receiving messages via SMTP/IMAP
 *
 * Implements the Channel interface for multi-channel support.
 * Uses Gmail by default (smtp.gmail.com / imap.gmail.com).
 */
import type { Channel, ChannelNotification, ChannelStatus, ResponseCallback } from '../shared/channel.js';
import type { Result, HookEvent } from '../shared/types.js';
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
 * Implements the Channel interface for multi-channel support
 */
export declare class EmailClient implements Channel {
    readonly name = "email";
    readonly enabled: boolean;
    private readonly config;
    private transporter;
    private messageCallback;
    private pollInterval;
    private readonly processedMessageIds;
    private lastActivity;
    private lastError;
    constructor(config: EmailConfig);
    /**
     * Validate that all required configuration is present
     * Throws if config is missing or invalid
     */
    validateConfig(): void;
    /**
     * Get current channel status for diagnostics
     */
    getStatus(): ChannelStatus;
    /**
     * Initialize the email client - set up SMTP transporter
     */
    initialize(): Promise<void>;
    /**
     * Send a notification through this channel (Channel interface)
     * Returns message ID on success for tracking replies
     */
    send(notification: ChannelNotification): Promise<Result<string, string>>;
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
     * Start polling for incoming emails (Channel interface)
     */
    startPolling(callback: ResponseCallback): void;
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
     * Add a message ID to the processed set, pruning old entries if needed.
     * When the set exceeds MAX_PROCESSED_MESSAGE_IDS, the oldest half is removed.
     */
    addProcessedMessageId(messageId: string): void;
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