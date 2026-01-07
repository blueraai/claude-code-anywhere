/**
 * macOS Messages client using imsg CLI
 *
 * Sends and receives messages via Apple's Messages.app
 * Requires: brew install steipete/tap/imsg
 * Requires: Full Disk Access for terminal app
 */
import type { Result, HookEvent, ParsedSMS } from '../shared/types.js';
/**
 * Configuration for Messages client
 */
export interface MessagesConfig {
    userPhone: string;
}
/**
 * Format a message for SMS with session ID prefix
 */
export declare function formatMessage(sessionId: string, event: HookEvent, message: string): string;
/**
 * Check if imsg is installed and accessible
 */
export declare function checkImsgInstalled(): boolean;
/**
 * macOS Messages client for sending and receiving messages
 */
export declare class MessagesClient {
    private readonly config;
    private chatId;
    private lastMessageId;
    private messageCallback;
    private pollInterval;
    private readonly sentMessageHashes;
    private readonly SENT_MESSAGE_TTL_MS;
    constructor(config: MessagesConfig);
    /**
     * Simple hash function for message deduplication
     */
    private hashMessage;
    /**
     * Track a sent message to filter out echoes
     */
    private trackSentMessage;
    /**
     * Check if a message was sent by us (to filter SMS echoes)
     */
    private wasSentByUs;
    /**
     * Type guard for ImsgMessage
     */
    private isImsgMessage;
    /**
     * Initialize the client - find or create chat with user
     */
    initialize(): Result<void, string>;
    /**
     * Update the last message ID to track new messages
     */
    private updateLastMessageId;
    /**
     * Normalize phone number for comparison
     */
    private normalizePhone;
    /**
     * Send a message
     */
    sendMessage(message: string): Result<string, string>;
    /**
     * Send a formatted message for a hook event
     */
    sendHookMessage(sessionId: string, event: HookEvent, message: string): Result<string, string>;
    /**
     * Send an error response
     */
    sendErrorResponse(message: string): Result<string, string>;
    /**
     * Send a confirmation
     */
    sendConfirmation(sessionId: string): Result<string, string>;
    /**
     * Start polling for incoming messages
     */
    startPolling(callback: (message: ParsedSMS) => void, intervalMs?: number): void;
    /**
     * Check for new messages and call callback for each
     */
    private checkForNewMessages;
    /**
     * Parse a message for session ID
     */
    private parseMessage;
    /**
     * Stop polling for messages
     */
    stopPolling(): void;
    /**
     * Verify the from phone number matches configured user
     */
    verifyFromNumber(from: string): boolean;
    /**
     * Clean up resources
     */
    dispose(): void;
}
//# sourceMappingURL=messages.d.ts.map