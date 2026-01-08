/**
 * Session management for Claude Code instances
 */
import type { Session, EmailResponse, HookEvent, ParsedSMS } from '../shared/types.js';
/**
 * In-memory session store
 */
declare class SessionManager {
    private readonly sessions;
    private readonly pendingResponses;
    private cleanupInterval;
    /**
     * Start the cleanup interval
     */
    start(): void;
    /**
     * Stop the cleanup interval
     */
    stop(): void;
    /**
     * Register or update a session
     */
    registerSession(sessionId: string, event: HookEvent, prompt: string): void;
    /**
     * Get a session by ID
     */
    getSession(sessionId: string): Session | undefined;
    /**
     * Check if a session exists
     */
    hasSession(sessionId: string): boolean;
    /**
     * Get all active session IDs
     */
    getActiveSessionIds(): string[];
    /**
     * Get the count of active sessions
     */
    getSessionCount(): number;
    /**
     * Enable notifications for a session
     * @throws Error if session does not exist
     */
    enableSession(sessionId: string): void;
    /**
     * Disable notifications for a session
     * @throws Error if session does not exist
     */
    disableSession(sessionId: string): void;
    /**
     * Check if a session is enabled
     * @throws Error if session does not exist
     */
    isSessionEnabled(sessionId: string): boolean;
    /**
     * Store a response for a session
     * @throws Error if session does not exist
     */
    storeResponse(sessionId: string, response: string, from: string): void;
    /**
     * Get and consume a response for a session
     */
    consumeResponse(sessionId: string): EmailResponse | null;
    /**
     * Check if a session has a pending response
     */
    hasResponse(sessionId: string): boolean;
    /**
     * Store the Message-ID of a sent email for a session
     * Used for matching replies via In-Reply-To header
     */
    storeMessageId(sessionId: string, messageId: string): void;
    /**
     * Find a session by the Message-ID of the sent email
     * Used to match incoming replies via In-Reply-To header
     * @returns sessionId if found, null otherwise
     */
    findSessionByMessageId(messageId: string): string | null;
    /**
     * Get the count of pending responses
     */
    getPendingResponseCount(): number;
    /**
     * Parse session ID from message body
     * Format: [CC-abc123] message or just message
     */
    parseSessionFromSMS(body: string): ParsedSMS;
    /**
     * Clean up expired sessions
     */
    private cleanup;
    /**
     * Clear all sessions (for testing)
     */
    clear(): void;
}
export declare const sessionManager: SessionManager;
export {};
//# sourceMappingURL=sessions.d.ts.map