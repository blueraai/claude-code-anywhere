/**
 * Claude SMS - SMS notifications and bidirectional communication for Claude Code
 *
 * Uses macOS Messages.app via imsg CLI for sending/receiving messages.
 */
// Re-export config utilities
export { loadMessagesConfig, loadAppConfig, getStateDir, getStateFilePath } from './shared/config.js';
// Re-export server components
export { createBridgeServer, BridgeServer } from './server/index.js';
export { sessionManager } from './server/sessions.js';
export { stateManager, loadState, saveState, enableGlobal, disableGlobal } from './server/state.js';
export { MessagesClient, formatMessage, checkImsgInstalled } from './server/messages.js';
//# sourceMappingURL=index.js.map