/**
 * Global state management for claude-code-anywhere
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { getStateFilePath, getStateDir } from '../shared/config.js';
import type { GlobalState, HookEvent } from '../shared/types.js';

const DEFAULT_STATE: GlobalState = {
  enabled: true,
  hooks: {
    Notification: true,
    Stop: true,
    PreToolUse: true,
    UserPromptSubmit: false,
    ResponseSync: true,
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

  // Check basic structure first for better error messages
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid state file format at ${statePath}: expected object`);
  }

  if (!('hooks' in parsed) || typeof parsed.hooks !== 'object' || parsed.hooks === null) {
    throw new Error(`Invalid state file format at ${statePath}: missing hooks object`);
  }

  const missing = getMissingHooks(parsed.hooks);
  if (missing.length > 0) {
    // Auto-migrate: if only ResponseSync is missing (v0.2.x -> v0.3.x upgrade), add it
    if (missing.length === 1 && missing[0] === 'ResponseSync') {
      Object.assign(parsed.hooks, { ResponseSync: DEFAULT_STATE.hooks.ResponseSync });
    } else {
      throw new Error(
        `Invalid state file format at ${statePath}: missing required hook fields: ${missing.join(', ')}`
      );
    }
  }

  if (!isValidState(parsed)) {
    throw new Error(`Invalid state file format at ${statePath}`);
  }

  // Return validated state directly - no merging with defaults
  return {
    enabled: parsed.enabled,
    hooks: parsed.hooks,
  };
}

/**
 * Save global state to file
 * @throws Error if state cannot be saved
 */
export function saveState(state: GlobalState): void {
  const statePath = getStateFilePath();
  const stateDir = getStateDir();

  // Ensure directory exists
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const content = JSON.stringify(state, null, 2);
  writeFileSync(statePath, content, 'utf-8');
}

/**
 * Enable global SMS notifications
 * @throws Error if state cannot be saved
 */
export function enableGlobal(): boolean {
  const state = loadState();
  state.enabled = true;
  saveState(state);
  return true;
}

/**
 * Disable global SMS notifications
 * @throws Error if state cannot be saved
 */
export function disableGlobal(): boolean {
  const state = loadState();
  state.enabled = false;
  saveState(state);
  return true;
}

/**
 * Check if global SMS is enabled
 */
export function isGlobalEnabled(): boolean {
  return loadState().enabled;
}

/**
 * Enable a specific hook
 * @throws Error if state cannot be saved
 */
export function enableHook(hook: HookEvent): boolean {
  const state = loadState();
  state.hooks[hook] = true;
  saveState(state);
  return true;
}

/**
 * Disable a specific hook
 * @throws Error if state cannot be saved
 */
export function disableHook(hook: HookEvent): boolean {
  const state = loadState();
  state.hooks[hook] = false;
  saveState(state);
  return true;
}

/**
 * Check if a specific hook is enabled
 */
export function isHookEnabled(hook: HookEvent): boolean {
  const state = loadState();
  return state.enabled && state.hooks[hook];
}

const REQUIRED_HOOKS: readonly HookEvent[] = [
  'Notification',
  'Stop',
  'PreToolUse',
  'UserPromptSubmit',
  'ResponseSync',
] as const;

/**
 * Type guard for GlobalState - validates all required fields exist with correct types
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

  // Validate all required hooks exist and are booleans
  const hooks = value.hooks;
  const hookEntries = Object.entries(hooks);
  const hookMap = new Map<string, unknown>(hookEntries);

  for (const hook of REQUIRED_HOOKS) {
    if (!hookMap.has(hook)) {
      return false;
    }
    if (typeof hookMap.get(hook) !== 'boolean') {
      return false;
    }
  }

  return true;
}

/**
 * Get missing hook names for error message
 */
function getMissingHooks(hooks: object): string[] {
  return REQUIRED_HOOKS.filter((hook) => !(hook in hooks));
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
   * @throws Error if state cannot be saved
   */
  enable(): boolean {
    this.reload(); // Reload first to prevent lost updates
    this.state.enabled = true;
    saveState(this.state);
    return true;
  }

  /**
   * Disable globally
   * @throws Error if state cannot be saved
   */
  disable(): boolean {
    this.reload(); // Reload first to prevent lost updates
    this.state.enabled = false;
    saveState(this.state);
    return true;
  }

  /**
   * Check if a hook is enabled (reads fresh state from disk)
   * Requires BOTH global enabled AND specific hook enabled
   */
  isHookEnabled(hook: HookEvent): boolean {
    this.reload();
    return this.state.enabled && this.state.hooks[hook];
  }

  /**
   * Check if a specific hook type is enabled (ignores global state)
   * Use this when checking if a hook type is allowed, regardless of global/session state
   */
  isSpecificHookEnabled(hook: HookEvent): boolean {
    this.reload();
    return this.state.hooks[hook];
  }
}

// Export singleton instance
export const stateManager = new StateManager();
