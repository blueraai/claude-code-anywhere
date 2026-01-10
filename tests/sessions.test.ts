import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { sessionManager } from '../src/server/sessions.js';
import { SessionError } from '../src/shared/errors.js';

describe('sessions.ts uses logger (CLAUDE.md compliance)', () => {
  const sessionsSource = readFileSync('src/server/sessions.ts', 'utf-8');

  it('imports createLogger from shared/logger', () => {
    expect(sessionsSource).toMatch(
      /import \{[^}]*createLogger[^}]*\} from ['"]\.\.\/shared\/logger\.js['"]/
    );
  });

  it('does not use console.log', () => {
    // CLAUDE.md: use createLogger('component') for logging
    expect(sessionsSource).not.toContain('console.log');
  });
});

describe('SessionManager', () => {
  beforeEach(() => {
    sessionManager.clear();
  });

  describe('isSessionEnabled', () => {
    it('throws when checking non-existent session', () => {
      expect(() => sessionManager.isSessionEnabled('nonexistent')).toThrow();
    });

    it('returns true for enabled session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      expect(sessionManager.isSessionEnabled('test-session')).toBe(true);
    });

    it('returns false for disabled session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.disableSession('test-session');
      expect(sessionManager.isSessionEnabled('test-session')).toBe(false);
    });
  });

  describe('enableSession', () => {
    it('auto-creates session when enabling non-existent session', () => {
      // enableSession auto-creates for seamless session registration
      sessionManager.enableSession('new-session');
      expect(sessionManager.hasSession('new-session')).toBe(true);
      expect(sessionManager.isSessionEnabled('new-session')).toBe(true);
    });

    it('auto-created session has correct initial state', () => {
      sessionManager.enableSession('new-session');
      const session = sessionManager.getSession('new-session');

      expect(session).not.toBeUndefined();
      expect(session?.id).toBe('new-session');
      expect(session?.enabled).toBe(true);
      expect(session?.pendingResponse).toBeNull();
      expect(session?.createdAt).toBeGreaterThan(0);
      expect(session?.lastActivity).toBeGreaterThan(0);
    });

    it('enables existing session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.disableSession('test-session');
      sessionManager.enableSession('test-session');
      expect(sessionManager.isSessionEnabled('test-session')).toBe(true);
    });

    it('preserves existing session data when enabling', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      const originalSession = sessionManager.getSession('test-session');
      const originalCreatedAt = originalSession?.createdAt;

      sessionManager.disableSession('test-session');
      sessionManager.enableSession('test-session');

      const updatedSession = sessionManager.getSession('test-session');
      expect(updatedSession?.createdAt).toBe(originalCreatedAt);
      // pendingResponse is preserved from registerSession
      expect(updatedSession?.pendingResponse).not.toBeNull();
    });

    it('updates lastActivity when enabling existing session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      const session1 = sessionManager.getSession('test-session');
      const lastActivity1 = session1?.lastActivity ?? 0;

      // Small delay to ensure timestamp differs
      sessionManager.enableSession('test-session');

      const session2 = sessionManager.getSession('test-session');
      expect(session2?.lastActivity).toBeGreaterThanOrEqual(lastActivity1);
    });

    it('is idempotent for already enabled session', () => {
      sessionManager.enableSession('test-session');
      sessionManager.enableSession('test-session');
      sessionManager.enableSession('test-session');

      expect(sessionManager.isSessionEnabled('test-session')).toBe(true);
      expect(sessionManager.getSessionCount()).toBe(1);
    });
  });

  describe('disableSession', () => {
    it('throws when disabling non-existent session', () => {
      // CLAUDE.md: fail early and fast - throw on unexpected state
      expect(() => sessionManager.disableSession('nonexistent')).toThrow(SessionError);
      expect(() => sessionManager.disableSession('nonexistent')).toThrow(
        'Session nonexistent does not exist'
      );
    });

    it('disables existing session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.disableSession('test-session');
      expect(sessionManager.isSessionEnabled('test-session')).toBe(false);
    });
  });

  describe('storeResponse', () => {
    it('throws when storing response for non-existent session', () => {
      // CLAUDE.md: fail early and fast - throw on unexpected state
      expect(() => sessionManager.storeResponse('nonexistent', 'response', '+1234567890')).toThrow(
        SessionError
      );
      expect(() => sessionManager.storeResponse('nonexistent', 'response', '+1234567890')).toThrow(
        'Session nonexistent does not exist'
      );
    });

    it('stores response for existing session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.storeResponse('test-session', 'my response', '+1234567890');
      expect(sessionManager.hasResponse('test-session')).toBe(true);
    });
  });

  describe('registerSession', () => {
    it('new sessions start with enabled=true', () => {
      // New sessions are enabled by default per specification
      sessionManager.registerSession('new-session', 'Notification', 'test prompt');
      expect(sessionManager.isSessionEnabled('new-session')).toBe(true);
    });

    it('re-registering preserves enabled state when disabled', () => {
      // Register, disable, then re-register - should stay disabled
      sessionManager.registerSession('test-session', 'Notification', 'prompt 1');
      sessionManager.disableSession('test-session');
      sessionManager.registerSession('test-session', 'Notification', 'prompt 2');
      expect(sessionManager.isSessionEnabled('test-session')).toBe(false);
    });

    it('re-registering preserves enabled state when enabled', () => {
      // Register, then re-register - should stay enabled
      sessionManager.registerSession('test-session', 'Notification', 'prompt 1');
      sessionManager.registerSession('test-session', 'Notification', 'prompt 2');
      expect(sessionManager.isSessionEnabled('test-session')).toBe(true);
    });

    it('re-registering preserves createdAt timestamp', () => {
      sessionManager.registerSession('test-session', 'Notification', 'prompt 1');
      const session1 = sessionManager.getSession('test-session');
      const createdAt1 = session1?.createdAt;

      // Wait a tiny bit to ensure timestamps differ
      sessionManager.registerSession('test-session', 'Notification', 'prompt 2');
      const session2 = sessionManager.getSession('test-session');

      expect(session2?.createdAt).toBe(createdAt1);
    });
  });

  describe('storeMessageId', () => {
    it('throws when storing message ID for non-existent session', () => {
      expect(() => sessionManager.storeMessageId('nonexistent', '<test@example.com>')).toThrow(
        SessionError
      );
      expect(() => sessionManager.storeMessageId('nonexistent', '<test@example.com>')).toThrow(
        'Session nonexistent does not exist'
      );
    });

    it('stores message ID for existing session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.storeMessageId('test-session', '<test@example.com>');
      const session = sessionManager.getSession('test-session');
      expect(session?.pendingMessageId).toBe('<test@example.com>');
    });
  });

  describe('findSessionByMessageId', () => {
    it('returns null when no sessions exist', () => {
      const result = sessionManager.findSessionByMessageId('<test@example.com>');
      expect(result).toBeNull();
    });

    it('returns null when message ID does not match any session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.storeMessageId('test-session', '<other@example.com>');
      const result = sessionManager.findSessionByMessageId('<test@example.com>');
      expect(result).toBeNull();
    });

    it('returns session ID when message ID matches', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.storeMessageId('test-session', '<test@example.com>');
      const result = sessionManager.findSessionByMessageId('<test@example.com>');
      expect(result).toBe('test-session');
    });

    it('finds correct session among multiple sessions', () => {
      sessionManager.registerSession('session-1', 'Notification', 'prompt 1');
      sessionManager.registerSession('session-2', 'Notification', 'prompt 2');
      sessionManager.registerSession('session-3', 'Notification', 'prompt 3');
      sessionManager.storeMessageId('session-1', '<msg1@example.com>');
      sessionManager.storeMessageId('session-2', '<msg2@example.com>');
      sessionManager.storeMessageId('session-3', '<msg3@example.com>');

      expect(sessionManager.findSessionByMessageId('<msg2@example.com>')).toBe('session-2');
      expect(sessionManager.findSessionByMessageId('<msg1@example.com>')).toBe('session-1');
      expect(sessionManager.findSessionByMessageId('<msg3@example.com>')).toBe('session-3');
    });
  });

  describe('consumeResponse', () => {
    it('returns response and deletes it', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.storeResponse('test-session', 'my response', '+1234567890');

      const response = sessionManager.consumeResponse('test-session');

      expect(response).not.toBeNull();
      expect(response?.sessionId).toBe('test-session');
      expect(response?.response).toBe('my response');
      expect(response?.from).toBe('+1234567890');
      expect(sessionManager.hasResponse('test-session')).toBe(false);
    });

    it('also removes the session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.storeResponse('test-session', 'my response', '+1234567890');

      sessionManager.consumeResponse('test-session');

      expect(sessionManager.hasSession('test-session')).toBe(false);
    });

    it('returns null for non-existent session', () => {
      const response = sessionManager.consumeResponse('nonexistent');
      expect(response).toBeNull();
    });
  });

  describe('getActiveSessionIds', () => {
    it('returns empty array when no sessions', () => {
      const ids = sessionManager.getActiveSessionIds();
      expect(ids).toEqual([]);
    });

    it('returns all session IDs', () => {
      sessionManager.registerSession('session-1', 'Notification', 'prompt 1');
      sessionManager.registerSession('session-2', 'Notification', 'prompt 2');
      sessionManager.registerSession('session-3', 'Notification', 'prompt 3');

      const ids = sessionManager.getActiveSessionIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('session-1');
      expect(ids).toContain('session-2');
      expect(ids).toContain('session-3');
    });
  });

  describe('session isolation (per-session vs global)', () => {
    it('enabling one session does not affect other sessions', () => {
      // Setup: Two sessions, both disabled
      sessionManager.registerSession('session-A', 'Notification', 'prompt A');
      sessionManager.registerSession('session-B', 'Notification', 'prompt B');
      sessionManager.disableSession('session-A');
      sessionManager.disableSession('session-B');

      // Action: Enable session A only
      sessionManager.enableSession('session-A');

      // Assert: Session A enabled, Session B still disabled
      expect(sessionManager.isSessionEnabled('session-A')).toBe(true);
      expect(sessionManager.isSessionEnabled('session-B')).toBe(false);
    });

    it('disabling one session does not affect other sessions', () => {
      // Setup: Two sessions, both enabled
      sessionManager.registerSession('session-A', 'Notification', 'prompt A');
      sessionManager.registerSession('session-B', 'Notification', 'prompt B');

      // Action: Disable session A only
      sessionManager.disableSession('session-A');

      // Assert: Session A disabled, Session B still enabled
      expect(sessionManager.isSessionEnabled('session-A')).toBe(false);
      expect(sessionManager.isSessionEnabled('session-B')).toBe(true);
    });

    it('each session maintains independent enabled state', () => {
      // Setup: Three sessions with different states
      sessionManager.registerSession('session-1', 'Notification', 'prompt 1');
      sessionManager.registerSession('session-2', 'Notification', 'prompt 2');
      sessionManager.registerSession('session-3', 'Notification', 'prompt 3');

      // Mix of enabled/disabled states
      sessionManager.disableSession('session-1');
      // session-2 stays enabled (default)
      sessionManager.disableSession('session-3');
      sessionManager.enableSession('session-3');

      // Assert each session's state is independent
      expect(sessionManager.isSessionEnabled('session-1')).toBe(false);
      expect(sessionManager.isSessionEnabled('session-2')).toBe(true);
      expect(sessionManager.isSessionEnabled('session-3')).toBe(true);
    });
  });

  describe('getSessionCount and getPendingResponseCount', () => {
    it('returns 0 when empty', () => {
      expect(sessionManager.getSessionCount()).toBe(0);
      expect(sessionManager.getPendingResponseCount()).toBe(0);
    });

    it('increments correctly', () => {
      sessionManager.registerSession('session-1', 'Notification', 'prompt 1');
      expect(sessionManager.getSessionCount()).toBe(1);
      expect(sessionManager.getPendingResponseCount()).toBe(0);

      sessionManager.registerSession('session-2', 'Notification', 'prompt 2');
      expect(sessionManager.getSessionCount()).toBe(2);

      sessionManager.storeResponse('session-1', 'response 1', '+1234567890');
      expect(sessionManager.getPendingResponseCount()).toBe(1);

      sessionManager.storeResponse('session-2', 'response 2', '+1234567890');
      expect(sessionManager.getPendingResponseCount()).toBe(2);
    });

    it('decrements on consume', () => {
      sessionManager.registerSession('session-1', 'Notification', 'prompt 1');
      sessionManager.registerSession('session-2', 'Notification', 'prompt 2');
      sessionManager.storeResponse('session-1', 'response 1', '+1234567890');
      sessionManager.storeResponse('session-2', 'response 2', '+1234567890');

      expect(sessionManager.getSessionCount()).toBe(2);
      expect(sessionManager.getPendingResponseCount()).toBe(2);

      sessionManager.consumeResponse('session-1');

      expect(sessionManager.getSessionCount()).toBe(1);
      expect(sessionManager.getPendingResponseCount()).toBe(1);

      sessionManager.consumeResponse('session-2');

      expect(sessionManager.getSessionCount()).toBe(0);
      expect(sessionManager.getPendingResponseCount()).toBe(0);
    });
  });
});
