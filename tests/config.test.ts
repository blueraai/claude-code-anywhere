import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getStateDir,
  getStateFilePath,
  loadAppConfig,
  loadMessagesConfig,
} from '../src/shared/config.js';

describe('config', () => {
  describe('loadMessagesConfig', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = {
        SMS_USER_EMAIL: process.env['SMS_USER_EMAIL'],
      };
    });

    afterEach(() => {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
    });

    it('returns success when SMS_USER_EMAIL is set', () => {
      process.env['SMS_USER_EMAIL'] = 'test@icloud.com';

      const result = loadMessagesConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userEmail).toBe('test@icloud.com');
      }
    });

    it('returns error when SMS_USER_EMAIL is not set', () => {
      delete process.env['SMS_USER_EMAIL'];

      const result = loadMessagesConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('SMS_USER_EMAIL');
      }
    });

    it('returns error when SMS_USER_EMAIL is empty', () => {
      process.env['SMS_USER_EMAIL'] = '';

      const result = loadMessagesConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('SMS_USER_EMAIL');
      }
    });

    it('returns error when SMS_USER_EMAIL is not a valid email', () => {
      process.env['SMS_USER_EMAIL'] = 'notanemail';

      const result = loadMessagesConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not a valid email');
      }
    });
  });

  describe('loadAppConfig', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = {
        SMS_USER_EMAIL: process.env['SMS_USER_EMAIL'],
        SMS_BRIDGE_PORT: process.env['SMS_BRIDGE_PORT'],
        SMS_BRIDGE_URL: process.env['SMS_BRIDGE_URL'],
      };
    });

    afterEach(() => {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value !== undefined) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      }
    });

    it('uses custom port in default bridge URL when SMS_BRIDGE_PORT is set', () => {
      process.env['SMS_USER_EMAIL'] = 'test@icloud.com';
      process.env['SMS_BRIDGE_PORT'] = '4000';
      delete process.env['SMS_BRIDGE_URL'];

      const result = loadAppConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(4000);
        expect(result.data.bridgeUrl).toBe('http://localhost:4000');
      }
    });

    it('uses default port 3847 in bridge URL when SMS_BRIDGE_PORT is not set', () => {
      process.env['SMS_USER_EMAIL'] = 'test@icloud.com';
      delete process.env['SMS_BRIDGE_PORT'];
      delete process.env['SMS_BRIDGE_URL'];

      const result = loadAppConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(3847);
        expect(result.data.bridgeUrl).toBe('http://localhost:3847');
      }
    });

    it('uses explicit SMS_BRIDGE_URL when provided', () => {
      process.env['SMS_USER_EMAIL'] = 'test@icloud.com';
      process.env['SMS_BRIDGE_PORT'] = '4000';
      process.env['SMS_BRIDGE_URL'] = 'https://my-tunnel.example.com';

      const result = loadAppConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bridgeUrl).toBe('https://my-tunnel.example.com');
      }
    });

    it('returns error when SMS_USER_EMAIL is missing', () => {
      delete process.env['SMS_USER_EMAIL'];

      const result = loadAppConfig();
      expect(result.success).toBe(false);
    });
  });

  describe('getStateDir', () => {
    let originalHome: string | undefined;
    let originalUserProfile: string | undefined;

    beforeEach(() => {
      originalHome = process.env['HOME'];
      originalUserProfile = process.env['USERPROFILE'];
    });

    afterEach(() => {
      if (originalHome !== undefined) {
        process.env['HOME'] = originalHome;
      } else {
        delete process.env['HOME'];
      }
      if (originalUserProfile !== undefined) {
        process.env['USERPROFILE'] = originalUserProfile;
      } else {
        delete process.env['USERPROFILE'];
      }
    });

    it('uses HOME when available', () => {
      process.env['HOME'] = '/Users/test';
      delete process.env['USERPROFILE'];

      expect(getStateDir()).toBe('/Users/test/.claude/claude-sms');
    });

    it('uses USERPROFILE when HOME is not available', () => {
      delete process.env['HOME'];
      process.env['USERPROFILE'] = 'C:\\Users\\test';

      expect(getStateDir()).toBe('C:\\Users\\test/.claude/claude-sms');
    });

    it('throws when neither HOME nor USERPROFILE is available', () => {
      delete process.env['HOME'];
      delete process.env['USERPROFILE'];

      expect(() => getStateDir()).toThrow(
        'Cannot determine home directory: neither HOME nor USERPROFILE environment variable is set'
      );
    });
  });

  describe('getStateFilePath', () => {
    let originalHome: string | undefined;

    beforeEach(() => {
      originalHome = process.env['HOME'];
    });

    afterEach(() => {
      if (originalHome !== undefined) {
        process.env['HOME'] = originalHome;
      } else {
        delete process.env['HOME'];
      }
    });

    it('returns state.json path under state directory', () => {
      process.env['HOME'] = '/Users/test';

      expect(getStateFilePath()).toBe('/Users/test/.claude/claude-sms/state.json');
    });
  });
});
