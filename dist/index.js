/**
 * Claude Code Anywhere - Email and Telegram notifications for Claude Code
 */
// Re-export config utilities
export { loadEmailConfig, loadAppConfig, getStateDir, getStateFilePath } from './shared/config.js';
// Re-export server components
export { createBridgeServer, BridgeServer } from './server/index.js';
export { sessionManager } from './server/sessions.js';
export { stateManager, loadState, saveState, enableGlobal, disableGlobal } from './server/state.js';
export { EmailClient, formatSubject, formatBody } from './server/email.js';
//# sourceMappingURL=index.js.map