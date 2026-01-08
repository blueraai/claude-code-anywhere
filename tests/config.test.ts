import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getStateDir,
  getStateFilePath,
  loadAppConfig,
  loadEmailConfig,
} from '../src/shared/config.js';

describe('config', () => {
  describe('loadEmailConfig', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = {
        EMAIL_USER: process.env['EMAIL_USER'],
        EMAIL_PASS: process.env['EMAIL_PASS'],
        EMAIL_RECIPIENT: process.env['EMAIL_RECIPIENT'],
        SMTP_HOST: process.env['SMTP_HOST'],
        SMTP_PORT: process.env['SMTP_PORT'],
        IMAP_HOST: process.env['IMAP_HOST'],
        IMAP_PORT: process.env['IMAP_PORT'],
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

    it('returns success when all required env vars are set', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';

      const result = loadEmailConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user).toBe('claude@gmail.com');
        expect(result.data.pass).toBe('app-password-123');
        expect(result.data.recipient).toBe('user@example.com');
      }
    });

    it('returns error when EMAIL_USER is not set', () => {
      delete process.env['EMAIL_USER'];
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';

      const result = loadEmailConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('EMAIL_USER');
      }
    });

    it('returns error when EMAIL_PASS is not set', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      delete process.env['EMAIL_PASS'];
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';

      const result = loadEmailConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('EMAIL_PASS');
      }
    });

    it('returns error when EMAIL_RECIPIENT is not set', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      delete process.env['EMAIL_RECIPIENT'];

      const result = loadEmailConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('EMAIL_RECIPIENT');
      }
    });

    it('returns error when EMAIL_USER is not a valid email', () => {
      process.env['EMAIL_USER'] = 'notanemail';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';

      const result = loadEmailConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not a valid email');
      }
    });

    it('returns error when EMAIL_RECIPIENT is not a valid email', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'notanemail';

      const result = loadEmailConfig();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not a valid email');
      }
    });

    it('uses default SMTP host and port when not set', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';
      delete process.env['SMTP_HOST'];
      delete process.env['SMTP_PORT'];

      const result = loadEmailConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.smtpHost).toBe('smtp.gmail.com');
        expect(result.data.smtpPort).toBe(587);
      }
    });

    it('uses custom SMTP host and port when set', () => {
      process.env['EMAIL_USER'] = 'claude@outlook.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';
      process.env['SMTP_HOST'] = 'smtp.office365.com';
      process.env['SMTP_PORT'] = '465';

      const result = loadEmailConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.smtpHost).toBe('smtp.office365.com');
        expect(result.data.smtpPort).toBe(465);
      }
    });

    it('uses default IMAP host and port when not set', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';
      delete process.env['IMAP_HOST'];
      delete process.env['IMAP_PORT'];

      const result = loadEmailConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imapHost).toBe('imap.gmail.com');
        expect(result.data.imapPort).toBe(993);
      }
    });

    it('uses custom IMAP host and port when set', () => {
      process.env['EMAIL_USER'] = 'claude@outlook.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';
      process.env['IMAP_HOST'] = 'outlook.office365.com';
      process.env['IMAP_PORT'] = '143';

      const result = loadEmailConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imapHost).toBe('outlook.office365.com');
        expect(result.data.imapPort).toBe(143);
      }
    });
  });

  describe('loadAppConfig', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = {
        EMAIL_USER: process.env['EMAIL_USER'],
        EMAIL_PASS: process.env['EMAIL_PASS'],
        EMAIL_RECIPIENT: process.env['EMAIL_RECIPIENT'],
        BRIDGE_PORT: process.env['BRIDGE_PORT'],
        BRIDGE_URL: process.env['BRIDGE_URL'],
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

    it('uses custom port in default bridge URL when BRIDGE_PORT is set', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';
      process.env['BRIDGE_PORT'] = '4000';
      delete process.env['BRIDGE_URL'];

      const result = loadAppConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(4000);
        expect(result.data.bridgeUrl).toBe('http://localhost:4000');
      }
    });

    it('uses default port 3847 in bridge URL when BRIDGE_PORT is not set', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';
      delete process.env['BRIDGE_PORT'];
      delete process.env['BRIDGE_URL'];

      const result = loadAppConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(3847);
        expect(result.data.bridgeUrl).toBe('http://localhost:3847');
      }
    });

    it('uses explicit BRIDGE_URL when provided', () => {
      process.env['EMAIL_USER'] = 'claude@gmail.com';
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';
      process.env['BRIDGE_PORT'] = '4000';
      process.env['BRIDGE_URL'] = 'https://my-tunnel.example.com';

      const result = loadAppConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bridgeUrl).toBe('https://my-tunnel.example.com');
      }
    });

    it('returns error when EMAIL_USER is missing', () => {
      delete process.env['EMAIL_USER'];
      process.env['EMAIL_PASS'] = 'app-password-123';
      process.env['EMAIL_RECIPIENT'] = 'user@example.com';

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

      expect(getStateDir()).toBe('/Users/test/.claude/claude-code-anywhere');
    });

    it('uses USERPROFILE when HOME is not available', () => {
      delete process.env['HOME'];
      process.env['USERPROFILE'] = 'C:\\Users\\test';

      expect(getStateDir()).toBe('C:\\Users\\test/.claude/claude-code-anywhere');
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

      expect(getStateFilePath()).toBe('/Users/test/.claude/claude-code-anywhere/state.json');
    });
  });
});
