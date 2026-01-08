/**
 * Global state management for claude-code-anywhere
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { getStateFilePath, getStateDir } from '../shared/config.js';
const DEFAULT_STATE = {
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
export function loadState() {
    const statePath = getStateFilePath();
    // If file doesn't exist, return defaults (valid for first-time setup)
    if (!existsSync(statePath)) {
        return { ...DEFAULT_STATE };
    }
    const content = readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(content);
    // Check basic structure first for better error messages
    if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(`Invalid state file format at ${statePath}: expected object`);
    }
    if (!('hooks' in parsed) || typeof parsed.hooks !== 'object' || parsed.hooks === null) {
        throw new Error(`Invalid state file format at ${statePath}: missing hooks object`);
    }
    const missing = getMissingHooks(parsed.hooks);
    if (missing.length > 0) {
        throw new Error(`Invalid state file format at ${statePath}: missing required hook fields: ${missing.join(', ')}`);
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
export function saveState(state) {
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
export function enableGlobal() {
    const state = loadState();
    state.enabled = true;
    saveState(state);
    return true;
}
/**
 * Disable global SMS notifications
 * @throws Error if state cannot be saved
 */
export function disableGlobal() {
    const state = loadState();
    state.enabled = false;
    saveState(state);
    return true;
}
/**
 * Check if global SMS is enabled
 */
export function isGlobalEnabled() {
    return loadState().enabled;
}
/**
 * Enable a specific hook
 * @throws Error if state cannot be saved
 */
export function enableHook(hook) {
    const state = loadState();
    state.hooks[hook] = true;
    saveState(state);
    return true;
}
/**
 * Disable a specific hook
 * @throws Error if state cannot be saved
 */
export function disableHook(hook) {
    const state = loadState();
    state.hooks[hook] = false;
    saveState(state);
    return true;
}
/**
 * Check if a specific hook is enabled
 */
export function isHookEnabled(hook) {
    const state = loadState();
    return state.enabled && state.hooks[hook];
}
const REQUIRED_HOOKS = [
    'Notification',
    'Stop',
    'PreToolUse',
    'UserPromptSubmit',
];
/**
 * Type guard for GlobalState - validates all required fields exist with correct types
 */
function isValidState(value) {
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
    const hookMap = new Map(hookEntries);
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
function getMissingHooks(hooks) {
    return REQUIRED_HOOKS.filter((hook) => !(hook in hooks));
}
/**
 * State manager class for use in server
 */
export class StateManager {
    state;
    constructor() {
        this.state = loadState();
    }
    /**
     * Reload state from file
     */
    reload() {
        this.state = loadState();
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if globally enabled (reads fresh state from disk)
     */
    isEnabled() {
        this.reload();
        return this.state.enabled;
    }
    /**
     * Enable globally
     * @throws Error if state cannot be saved
     */
    enable() {
        this.reload(); // Reload first to prevent lost updates
        this.state.enabled = true;
        saveState(this.state);
        return true;
    }
    /**
     * Disable globally
     * @throws Error if state cannot be saved
     */
    disable() {
        this.reload(); // Reload first to prevent lost updates
        this.state.enabled = false;
        saveState(this.state);
        return true;
    }
    /**
     * Check if a hook is enabled (reads fresh state from disk)
     */
    isHookEnabled(hook) {
        this.reload();
        return this.state.enabled && this.state.hooks[hook];
    }
}
// Export singleton instance
export const stateManager = new StateManager();
//# sourceMappingURL=state.js.map