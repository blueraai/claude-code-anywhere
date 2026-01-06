/**
 * Global state management for claude-sms
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
    try {
        if (!existsSync(statePath)) {
            return { ...DEFAULT_STATE };
        }
        const content = readFileSync(statePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (!isValidState(parsed)) {
            console.warn('[state] Invalid state file, using defaults');
            return { ...DEFAULT_STATE };
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
    catch (error) {
        console.warn('[state] Failed to load state file:', error);
        return { ...DEFAULT_STATE };
    }
}
/**
 * Save global state to file
 */
export function saveState(state) {
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
    }
    catch (error) {
        console.error('[state] Failed to save state file:', error);
        return false;
    }
}
/**
 * Enable global SMS notifications
 */
export function enableGlobal() {
    const state = loadState();
    state.enabled = true;
    return saveState(state);
}
/**
 * Disable global SMS notifications
 */
export function disableGlobal() {
    const state = loadState();
    state.enabled = false;
    return saveState(state);
}
/**
 * Check if global SMS is enabled
 */
export function isGlobalEnabled() {
    return loadState().enabled;
}
/**
 * Enable a specific hook
 */
export function enableHook(hook) {
    const state = loadState();
    state.hooks[hook] = true;
    return saveState(state);
}
/**
 * Disable a specific hook
 */
export function disableHook(hook) {
    const state = loadState();
    state.hooks[hook] = false;
    return saveState(state);
}
/**
 * Check if a specific hook is enabled
 */
export function isHookEnabled(hook) {
    const state = loadState();
    return state.enabled && state.hooks[hook];
}
/**
 * Type guard for GlobalState
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
    return true;
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
     * Check if globally enabled
     */
    isEnabled() {
        return this.state.enabled;
    }
    /**
     * Enable globally
     */
    enable() {
        this.state.enabled = true;
        return saveState(this.state);
    }
    /**
     * Disable globally
     */
    disable() {
        this.state.enabled = false;
        return saveState(this.state);
    }
    /**
     * Check if a hook is enabled
     */
    isHookEnabled(hook) {
        return this.state.enabled && this.state.hooks[hook];
    }
}
// Export singleton instance
export const stateManager = new StateManager();
//# sourceMappingURL=state.js.map