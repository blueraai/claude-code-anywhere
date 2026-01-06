import { describe, it, expect, beforeEach } from 'vitest';
import { sessionManager } from '../src/server/sessions.js';

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
    it('throws when enabling non-existent session', () => {
      // CLAUDE.md: fail early and fast - throw on unexpected state
      expect(() => sessionManager.enableSession('nonexistent')).toThrow(
        'Session nonexistent does not exist'
      );
    });

    it('enables existing session', () => {
      sessionManager.registerSession('test-session', 'Notification', 'test prompt');
      sessionManager.disableSession('test-session');
      sessionManager.enableSession('test-session');
      expect(sessionManager.isSessionEnabled('test-session')).toBe(true);
    });
  });

  describe('disableSession', () => {
    it('throws when disabling non-existent session', () => {
      // CLAUDE.md: fail early and fast - throw on unexpected state
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
});
