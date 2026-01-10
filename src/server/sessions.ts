/**
 * Session management for Claude Code instances
 */

import { SessionError } from '../shared/errors.js';
import { createLogger } from '../shared/logger.js';
import type { Session, EmailResponse, HookEvent, ParsedSMS } from '../shared/types.js';

const log = createLogger('sessions');

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * In-memory session store
 */
class SessionManager {
  private readonly sessions: Map<string, Session> = new Map();
  private readonly pendingResponses: Map<string, EmailResponse> = new Map();
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
   * Enable notifications for a session
   * Auto-creates the session if it doesn't exist
   */
  enableSession(sessionId: string): void {
    const now = Date.now();
    let session = this.sessions.get(sessionId);

    if (session === undefined) {
      // Auto-create session on enable for seamless registration
      session = {
        id: sessionId,
        createdAt: now,
        lastActivity: now,
        enabled: true,
        pendingResponse: null,
      };
      this.sessions.set(sessionId, session);
      return;
    }

    session.enabled = true;
    session.lastActivity = now;
  }

  /**
   * Disable notifications for a session
   * @throws Error if session does not exist
   */
  disableSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      throw new SessionError(sessionId);
    }
    session.enabled = false;
    session.lastActivity = Date.now();
  }

  /**
   * Check if a session is enabled
   * @throws Error if session does not exist
   */
  isSessionEnabled(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      throw new SessionError(sessionId);
    }
    return session.enabled;
  }

  /**
   * Store a response for a session
   * @throws Error if session does not exist
   */
  storeResponse(sessionId: string, response: string, from: string): void {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      throw new SessionError(sessionId);
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
  consumeResponse(sessionId: string): EmailResponse | null {
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
   * Store the Message-ID of a sent email for a session
   * Used for matching replies via In-Reply-To header
   */
  storeMessageId(sessionId: string, messageId: string): void {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      throw new SessionError(sessionId);
    }
    session.pendingMessageId = messageId;
    session.lastActivity = Date.now();
  }

  /**
   * Find a session by the Message-ID of the sent email
   * Used to match incoming replies via In-Reply-To header
   * @returns sessionId if found, null otherwise
   */
  findSessionByMessageId(messageId: string): string | null {
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
  getPendingResponseCount(): number {
    return this.pendingResponses.size;
  }

  /**
   * Parse session ID from message body
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

    // No session ID prefix - require explicit session ID for safety
    // (Previously guessed if only one session, but this is dangerous with multiple sessions)
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
        log.info(`Expired session: ${sessionId}`);
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
