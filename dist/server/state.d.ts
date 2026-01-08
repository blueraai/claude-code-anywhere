/**
 * Global state management for claude-code-anywhere
 */
import type { GlobalState, HookEvent } from '../shared/types.js';
/**
 * Load global state from file
 */
export declare function loadState(): GlobalState;
/**
 * Save global state to file
 * @throws Error if state cannot be saved
 */
export declare function saveState(state: GlobalState): void;
/**
 * Enable global SMS notifications
 * @throws Error if state cannot be saved
 */
export declare function enableGlobal(): boolean;
/**
 * Disable global SMS notifications
 * @throws Error if state cannot be saved
 */
export declare function disableGlobal(): boolean;
/**
 * Check if global SMS is enabled
 */
export declare function isGlobalEnabled(): boolean;
/**
 * Enable a specific hook
 * @throws Error if state cannot be saved
 */
export declare function enableHook(hook: HookEvent): boolean;
/**
 * Disable a specific hook
 * @throws Error if state cannot be saved
 */
export declare function disableHook(hook: HookEvent): boolean;
/**
 * Check if a specific hook is enabled
 */
export declare function isHookEnabled(hook: HookEvent): boolean;
/**
 * State manager class for use in server
 */
export declare class StateManager {
    private state;
    constructor();
    /**
     * Reload state from file
     */
    reload(): void;
    /**
     * Get current state
     */
    getState(): GlobalState;
    /**
     * Check if globally enabled (reads fresh state from disk)
     */
    isEnabled(): boolean;
    /**
     * Enable globally
     * @throws Error if state cannot be saved
     */
    enable(): boolean;
    /**
     * Disable globally
     * @throws Error if state cannot be saved
     */
    disable(): boolean;
    /**
     * Check if a hook is enabled (reads fresh state from disk)
     */
    isHookEnabled(hook: HookEvent): boolean;
}
export declare const stateManager: StateManager;
//# sourceMappingURL=state.d.ts.map