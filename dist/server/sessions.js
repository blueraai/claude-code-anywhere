/**
 * Session management for Claude Code instances
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
/**
 * In-memory session store
 */
class SessionManager {
    sessions = new Map();
    pendingResponses = new Map();
    cleanupInterval = null;
    /**
     * Start the cleanup interval
     */
    start() {
        this.cleanupInterval ??= setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000); // Every 5 minutes
    }
    /**
     * Stop the cleanup interval
     */
    stop() {
        if (this.cleanupInterval !== null) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
    /**
     * Register or update a session
     */
    registerSession(sessionId, event, prompt) {
        const now = Date.now();
        const existing = this.sessions.get(sessionId);
        const session = {
            id: sessionId,
            createdAt: existing?.createdAt ?? now,
            lastActivity: now,
            enabled: existing?.enabled ?? true,
            pendingResponse: {
                event,
                prompt,
                timestamp: now,
            },
        };
        this.sessions.set(sessionId, session);
    }
    /**
     * Get a session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Check if a session exists
     */
    hasSession(sessionId) {
        return this.sessions.has(sessionId);
    }
    /**
     * Get all active session IDs
     */
    getActiveSessionIds() {
        return Array.from(this.sessions.keys());
    }
    /**
     * Get the count of active sessions
     */
    getSessionCount() {
        return this.sessions.size;
    }
    /**
     * Enable SMS for a session
     * @throws Error if session does not exist
     */
    enableSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            throw new Error(`Session ${sessionId} does not exist`);
        }
        session.enabled = true;
        session.lastActivity = Date.now();
    }
    /**
     * Disable SMS for a session
     * @throws Error if session does not exist
     */
    disableSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            throw new Error(`Session ${sessionId} does not exist`);
        }
        session.enabled = false;
        session.lastActivity = Date.now();
    }
    /**
     * Check if a session is enabled
     * @throws Error if session does not exist
     */
    isSessionEnabled(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            throw new Error(`Session ${sessionId} does not exist`);
        }
        return session.enabled;
    }
    /**
     * Store a response for a session
     * @throws Error if session does not exist
     */
    storeResponse(sessionId, response, from) {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            throw new Error(`Session ${sessionId} does not exist`);
        }
        this.pendingResponses.set(sessionId, {
            sessionId,
            response,
            from,
            timestamp: Date.now(),
        });
        // Update session activity
        session.lastActivity = Date.now();
        session.pendingResponse = null;
    }
    /**
     * Get and consume a response for a session
     */
    consumeResponse(sessionId) {
        const response = this.pendingResponses.get(sessionId);
        if (response === undefined) {
            return null;
        }
        this.pendingResponses.delete(sessionId);
        this.sessions.delete(sessionId);
        return response;
    }
    /**
     * Check if a session has a pending response
     */
    hasResponse(sessionId) {
        return this.pendingResponses.has(sessionId);
    }
    /**
     * Store the Message-ID of a sent email for a session
     * Used for matching replies via In-Reply-To header
     */
    storeMessageId(sessionId, messageId) {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            throw new Error(`Session ${sessionId} does not exist`);
        }
        session.pendingMessageId = messageId;
        session.lastActivity = Date.now();
    }
    /**
     * Find a session by the Message-ID of the sent email
     * Used to match incoming replies via In-Reply-To header
     * @returns sessionId if found, null otherwise
     */
    findSessionByMessageId(messageId) {
        for (const [sessionId, session] of this.sessions) {
            if (session.pendingMessageId === messageId) {
                return sessionId;
            }
        }
        return null;
    }
    /**
     * Get the count of pending responses
     */
    getPendingResponseCount() {
        return this.pendingResponses.size;
    }
    /**
     * Parse session ID from SMS body
     * Format: [CC-abc123] message or just message
     */
    parseSessionFromSMS(body) {
        const match = body.match(/^\[CC-([a-f0-9]+)\]\s*/i);
        if (match !== null) {
            const sessionId = match[1];
            const response = body.substring(match[0].length).trim();
            return {
                sessionId: sessionId ?? null,
                response,
            };
        }
        // No session ID prefix - check if there's only one active session
        if (this.sessions.size === 1) {
            const [sessionId] = this.sessions.keys();
            return {
                sessionId: sessionId ?? null,
                response: body.trim(),
            };
        }
        return {
            sessionId: null,
            response: body.trim(),
        };
    }
    /**
     * Clean up expired sessions
     */
    cleanup() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions) {
            if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
                this.sessions.delete(sessionId);
                this.pendingResponses.delete(sessionId);
                console.log(`[cleanup] Expired session: ${sessionId}`);
            }
        }
    }
    /**
     * Clear all sessions (for testing)
     */
    clear() {
        this.sessions.clear();
        this.pendingResponses.clear();
    }
}
// Export singleton instance
export const sessionManager = new SessionManager();
//# sourceMappingURL=sessions.js.map