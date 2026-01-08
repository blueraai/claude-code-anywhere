import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock config to use temp directory
const testDir = join(tmpdir(), 'claude-code-anywhere-test-' + Date.now());
const testStateFile = join(testDir, 'state.json');

vi.mock('../src/shared/config.js', () => ({
  getStateFilePath: () => testStateFile,
  getStateDir: () => testDir,
}));

// Import after mocking
const { loadState, saveState, StateManager } = await import('../src/server/state.js');

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

  it('throws when hooks are missing required fields', () => {
    // State file with only some hooks - should fail validation, not silently fill defaults
    writeFileSync(
      testStateFile,
      JSON.stringify({
        enabled: true,
        hooks: { Notification: true }, // Missing Stop, PreToolUse, UserPromptSubmit
      })
    );
    expect(() => loadState()).toThrow(/missing required hook/i);
  });

  it('throws when hooks have wrong types', () => {
    writeFileSync(
      testStateFile,
      JSON.stringify({
        enabled: true,
        hooks: {
          Notification: 'yes', // Should be boolean
          Stop: true,
          PreToolUse: true,
          UserPromptSubmit: false,
        },
      })
    );
    expect(() => loadState()).toThrow();
  });
});

describe('saveState', () => {
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

  it('throws when directory is not writable', () => {
    // Make directory read-only to cause write failure
    const fs = require('fs');
    fs.chmodSync(testDir, 0o444);

    const state = {
      enabled: true,
      hooks: { Notification: true, Stop: true, PreToolUse: true, UserPromptSubmit: false },
    };

    try {
      expect(() => saveState(state)).toThrow();
    } finally {
      // Restore permissions for cleanup
      fs.chmodSync(testDir, 0o755);
    }
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

  it('enable() reloads before modifying to prevent lost updates', () => {
    // Start with disabled state and Notification hook disabled
    const initialState = {
      enabled: false,
      hooks: { Notification: false, Stop: true, PreToolUse: true, UserPromptSubmit: false },
    };
    writeFileSync(testStateFile, JSON.stringify(initialState));

    const manager = new StateManager();

    // External process modifies the file (simulating CLI enabling Notification hook)
    const modifiedState = {
      enabled: false,
      hooks: { Notification: true, Stop: true, PreToolUse: true, UserPromptSubmit: false },
    };
    writeFileSync(testStateFile, JSON.stringify(modifiedState));

    // Now enable() - should reload first, then modify only 'enabled'
    manager.enable();

    // The Notification hook change should NOT be lost
    const fs = require('fs');
    const finalState = JSON.parse(fs.readFileSync(testStateFile, 'utf-8'));
    expect(finalState.enabled).toBe(true);
    expect(finalState.hooks.Notification).toBe(true); // External change preserved
  });

  it('disable() reloads before modifying to prevent lost updates', () => {
    // Start with enabled state and Notification hook disabled
    const initialState = {
      enabled: true,
      hooks: { Notification: false, Stop: true, PreToolUse: true, UserPromptSubmit: false },
    };
    writeFileSync(testStateFile, JSON.stringify(initialState));

    const manager = new StateManager();

    // External process modifies the file (simulating CLI enabling Notification hook)
    const modifiedState = {
      enabled: true,
      hooks: { Notification: true, Stop: true, PreToolUse: true, UserPromptSubmit: false },
    };
    writeFileSync(testStateFile, JSON.stringify(modifiedState));

    // Now disable() - should reload first, then modify only 'enabled'
    manager.disable();

    // The Notification hook change should NOT be lost
    const fs = require('fs');
    const finalState = JSON.parse(fs.readFileSync(testStateFile, 'utf-8'));
    expect(finalState.enabled).toBe(false);
    expect(finalState.hooks.Notification).toBe(true); // External change preserved
  });
});
