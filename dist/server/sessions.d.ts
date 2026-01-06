/**
 * Session management for Claude Code instances
 */
import type { Session, SMSResponse, HookEvent, ParsedSMS } from '../shared/types.js';
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
     * Enable SMS for a session
     */
    enableSession(sessionId: string): boolean;
    /**
     * Disable SMS for a session
     */
    disableSession(sessionId: string): boolean;
    /**
     * Check if a session is enabled
     */
    isSessionEnabled(sessionId: string): boolean;
    /**
     * Store a response for a session
     */
    storeResponse(sessionId: string, response: string, from: string): boolean;
    /**
     * Get and consume a response for a session
     */
    consumeResponse(sessionId: string): SMSResponse | null;
    /**
     * Check if a session has a pending response
     */
    hasResponse(sessionId: string): boolean;
    /**
     * Get the count of pending responses
     */
    getPendingResponseCount(): number;
    /**
     * Parse session ID from SMS body
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