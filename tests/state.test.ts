import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock config to use temp directory
const testDir = join(tmpdir(), 'claude-sms-test-' + Date.now());
const testStateFile = join(testDir, 'state.json');

vi.mock('../src/shared/config.js', () => ({
  getStateFilePath: () => testStateFile,
  getStateDir: () => testDir,
}));

// Import after mocking
const { loadState, StateManager } = await import('../src/server/state.js');

describe('loadState', () => {
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

  it('returns default state when file does not exist', () => {
    const state = loadState();
    expect(state.enabled).toBe(true);
    expect(state.hooks.Notification).toBe(true);
  });

  it('throws when file has invalid JSON', () => {
    writeFileSync(testStateFile, 'not valid json {{{');
    expect(() => loadState()).toThrow();
  });

  it('throws when file has valid JSON but invalid schema', () => {
    writeFileSync(testStateFile, JSON.stringify({ foo: 'bar' }));
    expect(() => loadState()).toThrow();
  });

  it('throws when file has wrong types', () => {
    writeFileSync(testStateFile, JSON.stringify({ enabled: 'yes', hooks: {} }));
    expect(() => loadState()).toThrow();
  });
});

describe('StateManager', () => {
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

  it('isEnabled() reads fresh state from disk', () => {
    // Start with enabled state
    const initialState = {
      enabled: true,
      hooks: { Notification: true, Stop: true, PreToolUse: true, UserPromptSubmit: false },
    };
    writeFileSync(testStateFile, JSON.stringify(initialState));

    const manager = new StateManager();
    expect(manager.isEnabled()).toBe(true);

    // Modify file externally (simulating CLI change)
    const modifiedState = { ...initialState, enabled: false };
    writeFileSync(testStateFile, JSON.stringify(modifiedState));

    // Should see the change without manual reload
    expect(manager.isEnabled()).toBe(false);
  });

  it('isHookEnabled() reads fresh state from disk', () => {
    const initialState = {
      enabled: true,
      hooks: { Notification: true, Stop: true, PreToolUse: true, UserPromptSubmit: false },
    };
    writeFileSync(testStateFile, JSON.stringify(initialState));

    const manager = new StateManager();
    expect(manager.isHookEnabled('Notification')).toBe(true);

    // Modify file externally
    const modifiedState = {
      ...initialState,
      hooks: { ...initialState.hooks, Notification: false },
    };
    writeFileSync(testStateFile, JSON.stringify(modifiedState));

    // Should see the change without manual reload
    expect(manager.isHookEnabled('Notification')).toBe(false);
  });
});
