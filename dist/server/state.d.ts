/**
 * Global state management for claude-sms
 */
import type { GlobalState, HookEvent } from '../shared/types.js';
/**
 * Load global state from file
 */
export declare function loadState(): GlobalState;
/**
 * Save global state to file
 */
export declare function saveState(state: GlobalState): boolean;
/**
 * Enable global SMS notifications
 */
export declare function enableGlobal(): boolean;
/**
 * Disable global SMS notifications
 */
export declare function disableGlobal(): boolean;
/**
 * Check if global SMS is enabled
 */
export declare function isGlobalEnabled(): boolean;
/**
 * Enable a specific hook
 */
export declare function enableHook(hook: HookEvent): boolean;
/**
 * Disable a specific hook
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
     * Check if globally enabled
     */
    isEnabled(): boolean;
    /**
     * Enable globally
     */
    enable(): boolean;
    /**
     * Disable globally
     */
    disable(): boolean;
    /**
     * Check if a hook is enabled
     */
    isHookEnabled(hook: HookEvent): boolean;
}
export declare const stateManager: StateManager;
//# sourceMappingURL=state.d.ts.map