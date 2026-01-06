import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStateDir, getStateFilePath, loadAppConfig } from '../src/shared/config.js';

describe('config', () => {
  describe('loadAppConfig', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = {
        TELNYX_API_KEY: process.env['TELNYX_API_KEY'],
        TELNYX_FROM_NUMBER: process.env['TELNYX_FROM_NUMBER'],
        SMS_USER_PHONE: process.env['SMS_USER_PHONE'],
        TELNYX_WEBHOOK_PUBLIC_KEY: process.env['TELNYX_WEBHOOK_PUBLIC_KEY'],
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
      process.env['TELNYX_API_KEY'] = 'test-key';
      process.env['TELNYX_FROM_NUMBER'] = '+1234567890';
      process.env['SMS_USER_PHONE'] = '+0987654321';
      process.env['TELNYX_WEBHOOK_PUBLIC_KEY'] = 'test-public-key';
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
      process.env['TELNYX_API_KEY'] = 'test-key';
      process.env['TELNYX_FROM_NUMBER'] = '+1234567890';
      process.env['SMS_USER_PHONE'] = '+0987654321';
      process.env['TELNYX_WEBHOOK_PUBLIC_KEY'] = 'test-public-key';
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
      process.env['TELNYX_API_KEY'] = 'test-key';
      process.env['TELNYX_FROM_NUMBER'] = '+1234567890';
      process.env['SMS_USER_PHONE'] = '+0987654321';
      process.env['TELNYX_WEBHOOK_PUBLIC_KEY'] = 'test-public-key';
      process.env['SMS_BRIDGE_PORT'] = '4000';
      process.env['SMS_BRIDGE_URL'] = 'https://my-tunnel.example.com';

      const result = loadAppConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bridgeUrl).toBe('https://my-tunnel.example.com');
      }
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
