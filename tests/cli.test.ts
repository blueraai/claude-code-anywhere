import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('cli.ts uses output helper (CLAUDE.md compliance)', () => {
  const cliSource = readFileSync('src/cli.ts', 'utf-8');

  it('defines an output helper object', () => {
    expect(cliSource).toMatch(/const output\s*=\s*\{/);
  });

  it('output helper has log and error methods', () => {
    expect(cliSource).toMatch(/log:\s*\([^)]*\)[^=]*=>/);
    expect(cliSource).toMatch(/error:\s*\([^)]*\)[^=]*=>/);
  });

  it('only uses console.log/error inside the output helper', () => {
    // Find all console.log and console.error occurrences
    const consoleMatches = cliSource.match(/console\.(log|error)/g) ?? [];
    // Should only have exactly 2: one in output.log, one in output.error
    expect(consoleMatches.length).toBe(2);
  });

  it('uses output.log and output.error for CLI output', () => {
    // Should have multiple uses of output.log and output.error
    const outputLogMatches = cliSource.match(/output\.log\(/g) ?? [];
    const outputErrorMatches = cliSource.match(/output\.error\(/g) ?? [];
    expect(outputLogMatches.length).toBeGreaterThan(5);
    expect(outputErrorMatches.length).toBeGreaterThan(3);
  });
});

// Mock config to use temp directory
const testDir = join(tmpdir(), 'claude-code-anywhere-cli-test-' + Date.now());
const testStateFile = join(testDir, 'state.json');

vi.mock('../src/shared/config.js', () => ({
  getStateFilePath: () => testStateFile,
  getStateDir: () => testDir,
  loadMessagesConfig: () => ({ success: false, error: 'Not configured' }),
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
        hooks: {
          Notification: true,
          Stop: true,
          PreToolUse: true,
          UserPromptSubmit: false,
          ResponseSync: true,
        },
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
        hooks: {
          Notification: true,
          Stop: true,
          PreToolUse: true,
          UserPromptSubmit: false,
          ResponseSync: true,
        },
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
