import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock config to use temp directory
const testDir = join(tmpdir(), 'claude-sms-cli-test-' + Date.now());
const testStateFile = join(testDir, 'state.json');

vi.mock('../src/shared/config.js', () => ({
  getStateFilePath: () => testStateFile,
  getStateDir: () => testDir,
  loadTelnyxConfig: () => ({ success: false, error: 'Not configured' }),
  loadAppConfig: () => ({ success: false, error: 'Not configured' }),
}));

// Import after mocking
const { enableGlobal, disableGlobal, loadState } = await import('../src/server/state.js');

describe('CLI enable/disable commands', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('enableGlobal', () => {
    it('returns true when state file does not exist (first-time setup)', () => {
      const result = enableGlobal();
      expect(result).toBe(true);

      // Verify state was saved correctly
      const state = loadState();
      expect(state.enabled).toBe(true);
    });

    it('returns true when state file is valid', () => {
      const validState = {
        enabled: false,
        hooks: { Notification: true, Stop: true, PreToolUse: true, UserPromptSubmit: false },
      };
      writeFileSync(testStateFile, JSON.stringify(validState));

      const result = enableGlobal();
      expect(result).toBe(true);

      // Verify state was updated
      const state = loadState();
      expect(state.enabled).toBe(true);
    });

    it('throws when state file has invalid JSON', () => {
      writeFileSync(testStateFile, 'not valid json {{{');
      expect(() => enableGlobal()).toThrow();
    });

    it('throws when state file has missing hooks', () => {
      writeFileSync(
        testStateFile,
        JSON.stringify({
          enabled: false,
          hooks: { Notification: true }, // Missing other hooks
        })
      );
      expect(() => enableGlobal()).toThrow(/missing required hook/i);
    });
  });

  describe('disableGlobal', () => {
    it('returns true when state file does not exist (first-time setup)', () => {
      const result = disableGlobal();
      expect(result).toBe(true);

      // Verify state was saved correctly
      const state = loadState();
      expect(state.enabled).toBe(false);
    });

    it('returns true when state file is valid', () => {
      const validState = {
        enabled: true,
        hooks: { Notification: true, Stop: true, PreToolUse: true, UserPromptSubmit: false },
      };
      writeFileSync(testStateFile, JSON.stringify(validState));

      const result = disableGlobal();
      expect(result).toBe(true);

      // Verify state was updated
      const state = loadState();
      expect(state.enabled).toBe(false);
    });

    it('throws when state file has invalid JSON', () => {
      writeFileSync(testStateFile, 'not valid json {{{');
      expect(() => disableGlobal()).toThrow();
    });

    it('throws when state file has missing hooks', () => {
      writeFileSync(
        testStateFile,
        JSON.stringify({
          enabled: true,
          hooks: { Notification: true }, // Missing other hooks
        })
      );
      expect(() => disableGlobal()).toThrow(/missing required hook/i);
    });
  });
});
