import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { dirname } from 'path';
import {
  getUserConfigPath,
  loadUserConfig,
  saveUserConfig,
  type UserConfig,
} from '../src/shared/user-config.js';

describe('user-config', () => {
  let originalHome: string | undefined;
  const testHome = '/tmp/cca-test-home';

  beforeEach(() => {
    // Use a temporary home directory for tests
    originalHome = process.env['HOME'];
    process.env['HOME'] = testHome;

    // Clean up any existing test directory
    if (existsSync(testHome)) {
      rmSync(testHome, { recursive: true });
    }
  });

  afterEach(() => {
    // Restore original HOME
    if (originalHome !== undefined) {
      process.env['HOME'] = originalHome;
    } else {
      delete process.env['HOME'];
    }

    // Clean up test directory
    if (existsSync(testHome)) {
      rmSync(testHome, { recursive: true });
    }
  });

  describe('getUserConfigPath', () => {
    it('returns path under state directory', () => {
      const configPath = getUserConfigPath();
      expect(configPath).toBe(`${testHome}/.claude/claude-code-anywhere/config.json`);
    });
  });

  describe('loadUserConfig', () => {
    it('returns empty object if file does not exist', () => {
      const config = loadUserConfig();
      expect(config).toEqual({});
    });

    it('returns parsed config if file exists with telegram', () => {
      const configPath = getUserConfigPath();
      const configDir = dirname(configPath);
      mkdirSync(configDir, { recursive: true });

      const testConfig: UserConfig = {
        telegram: {
          botToken: '123456789:ABCdef',
          chatId: '987654321',
        },
      };
      writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

      const config = loadUserConfig();
      expect(config.telegram?.botToken).toBe('123456789:ABCdef');
      expect(config.telegram?.chatId).toBe('987654321');
    });

    it('returns parsed config if file exists with email', () => {
      const configPath = getUserConfigPath();
      const configDir = dirname(configPath);
      mkdirSync(configDir, { recursive: true });

      const testConfig: UserConfig = {
        email: {
          user: 'claude@gmail.com',
          pass: 'app-password',
          recipient: 'you@example.com',
        },
      };
      writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

      const config = loadUserConfig();
      expect(config.email?.user).toBe('claude@gmail.com');
      expect(config.email?.pass).toBe('app-password');
      expect(config.email?.recipient).toBe('you@example.com');
    });

    it('returns parsed config with both telegram and email', () => {
      const configPath = getUserConfigPath();
      const configDir = dirname(configPath);
      mkdirSync(configDir, { recursive: true });

      const testConfig: UserConfig = {
        telegram: {
          botToken: '123:ABC',
          chatId: '456',
        },
        email: {
          user: 'test@test.com',
          pass: 'pass',
          recipient: 'recv@test.com',
        },
      };
      writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

      const config = loadUserConfig();
      expect(config.telegram).toBeDefined();
      expect(config.email).toBeDefined();
    });

    it('throws on invalid JSON', () => {
      const configPath = getUserConfigPath();
      const configDir = dirname(configPath);
      mkdirSync(configDir, { recursive: true });

      writeFileSync(configPath, 'not valid json {{{');

      expect(() => loadUserConfig()).toThrow();
    });
  });

  describe('saveUserConfig', () => {
    it('creates directory if needed', () => {
      const configPath = getUserConfigPath();
      const configDir = dirname(configPath);

      expect(existsSync(configDir)).toBe(false);

      const testConfig: UserConfig = {
        telegram: { botToken: 'test', chatId: 'test' },
      };
      saveUserConfig(testConfig);

      expect(existsSync(configDir)).toBe(true);
    });

    it('writes valid JSON', () => {
      const testConfig: UserConfig = {
        telegram: { botToken: 'my-token', chatId: 'my-chat' },
        email: { user: 'a@b.com', pass: 'pwd', recipient: 'c@d.com' },
      };

      saveUserConfig(testConfig);

      const loaded = loadUserConfig();
      expect(loaded.telegram?.botToken).toBe('my-token');
      expect(loaded.telegram?.chatId).toBe('my-chat');
      expect(loaded.email?.user).toBe('a@b.com');
      expect(loaded.email?.pass).toBe('pwd');
      expect(loaded.email?.recipient).toBe('c@d.com');
    });

    it('overwrites existing config', () => {
      const config1: UserConfig = { telegram: { botToken: 'old', chatId: 'old' } };
      saveUserConfig(config1);

      const config2: UserConfig = { telegram: { botToken: 'new', chatId: 'new' } };
      saveUserConfig(config2);

      const loaded = loadUserConfig();
      expect(loaded.telegram?.botToken).toBe('new');
      expect(loaded.telegram?.chatId).toBe('new');
    });
  });
});
