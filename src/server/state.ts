/**
 * Global state management for claude-sms
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import type { GlobalState, HookEvent } from '../shared/types.js';
import { getStateFilePath, getStateDir } from '../shared/config.js';

const DEFAULT_STATE: GlobalState = {
  enabled: true,
  hooks: {
    Notification: true,
    Stop: true,
    PreToolUse: true,
    UserPromptSubmit: false,
  },
};

/**
 * Load global state from file
 */
export function loadState(): GlobalState {
  const statePath = getStateFilePath();

  // If file doesn't exist, return defaults (valid for first-time setup)
  if (!existsSync(statePath)) {
    return { ...DEFAULT_STATE };
  }

  const content = readFileSync(statePath, 'utf-8');
  const parsed: unknown = JSON.parse(content);

  if (!isValidState(parsed)) {
    throw new Error(`Invalid state file format at ${statePath}`);
  }

  // Merge with defaults to ensure all fields exist
  return {
    enabled: parsed.enabled,
    hooks: {
      ...DEFAULT_STATE.hooks,
      ...parsed.hooks,
    },
  };
}

/**
 * Save global state to file
 */
export function saveState(state: GlobalState): boolean {
  const statePath = getStateFilePath();
  const stateDir = getStateDir();

  try {
    // Ensure directory exists
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    const content = JSON.stringify(state, null, 2);
    writeFileSync(statePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('[state] Failed to save state file:', error);
    return false;
  }
}

/**
 * Enable global SMS notifications
 */
export function enableGlobal(): boolean {
  const state = loadState();
  state.enabled = true;
  return saveState(state);
}

/**
 * Disable global SMS notifications
 */
export function disableGlobal(): boolean {
  const state = loadState();
  state.enabled = false;
  return saveState(state);
}

/**
 * Check if global SMS is enabled
 */
export function isGlobalEnabled(): boolean {
  return loadState().enabled;
}

/**
 * Enable a specific hook
 */
export function enableHook(hook: HookEvent): boolean {
  const state = loadState();
  state.hooks[hook] = true;
  return saveState(state);
}

/**
 * Disable a specific hook
 */
export function disableHook(hook: HookEvent): boolean {
  const state = loadState();
  state.hooks[hook] = false;
  return saveState(state);
}

/**
 * Check if a specific hook is enabled
 */
export function isHookEnabled(hook: HookEvent): boolean {
  const state = loadState();
  return state.enabled && state.hooks[hook];
}

/**
 * Type guard for GlobalState
 */
function isValidState(value: unknown): value is GlobalState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('enabled' in value) || typeof value.enabled !== 'boolean') {
    return false;
  }

  if (!('hooks' in value) || typeof value.hooks !== 'object' || value.hooks === null) {
    return false;
  }

  return true;
}

/**
 * State manager class for use in server
 */
export class StateManager {
  private state: GlobalState;

  constructor() {
    this.state = loadState();
  }

  /**
   * Reload state from file
   */
  reload(): void {
    this.state = loadState();
  }

  /**
   * Get current state
   */
  getState(): GlobalState {
    return { ...this.state };
  }

  /**
   * Check if globally enabled (reads fresh state from disk)
   */
  isEnabled(): boolean {
    this.reload();
    return this.state.enabled;
  }

  /**
   * Enable globally
   */
  enable(): boolean {
    this.state.enabled = true;
    return saveState(this.state);
  }

  /**
   * Disable globally
   */
  disable(): boolean {
    this.state.enabled = false;
    return saveState(this.state);
  }

  /**
   * Check if a hook is enabled (reads fresh state from disk)
   */
  isHookEnabled(hook: HookEvent): boolean {
    this.reload();
    return this.state.enabled && this.state.hooks[hook];
  }
}

// Export singleton instance
export const stateManager = new StateManager();
