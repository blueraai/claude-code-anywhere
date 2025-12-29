/**
 * Session management for Claude Code instances
 */

import type { Session, SMSResponse, HookEvent, ParsedSMS } from '../shared/types.js';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * In-memory session store
 */
class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private pendingResponses: Map<string, SMSResponse> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the cleanup interval
   */
  start(): void {
    this.cleanupInterval ??= setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Stop the cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Register or update a session
   */
  registerSession(sessionId: string, event: HookEvent, prompt: string): void {
    const now = Date.now();
    const existing = this.sessions.get(sessionId);

    const session: Session = {
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
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get the count of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Enable SMS for a session
   */
  enableSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      return false;
    }
    session.enabled = true;
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Disable SMS for a session
   */
  disableSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      return false;
    }
    session.enabled = false;
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Check if a session is enabled
   */
  isSessionEnabled(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.enabled ?? true; // Default to enabled if session doesn't exist yet
  }

  /**
   * Store a response for a session
   */
  storeResponse(sessionId: string, response: string, from: string): boolean {
    if (!this.sessions.has(sessionId)) {
      return false;
    }

    this.pendingResponses.set(sessionId, {
      sessionId,
      response,
      from,
      timestamp: Date.now(),
    });

    // Update session activity
    const session = this.sessions.get(sessionId);
    if (session !== undefined) {
      session.lastActivity = Date.now();
      session.pendingResponse = null;
    }

    return true;
  }

  /**
   * Get and consume a response for a session
   */
  consumeResponse(sessionId: string): SMSResponse | null {
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
  hasResponse(sessionId: string): boolean {
    return this.pendingResponses.has(sessionId);
  }

  /**
   * Get the count of pending responses
   */
  getPendingResponseCount(): number {
    return this.pendingResponses.size;
  }

  /**
   * Parse session ID from SMS body
   * Format: [CC-abc123] message or just message
   */
  parseSessionFromSMS(body: string): ParsedSMS {
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
  private cleanup(): void {
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
  clear(): void {
    this.sessions.clear();
    this.pendingResponses.clear();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
