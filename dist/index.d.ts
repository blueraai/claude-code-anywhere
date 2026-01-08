/**
 * Claude Code Anywhere - Email and Telegram notifications for Claude Code
 */
export type { HookEvent, Session, PendingResponse, EmailResponse, GlobalState, ServerStatus, EmailConfig, AppConfig, Result, SendEmailRequest, RegisterSessionRequest, ParsedSMS, } from './shared/types.js';
export { loadEmailConfig, loadAppConfig, getStateDir, getStateFilePath } from './shared/config.js';
export { createBridgeServer, BridgeServer } from './server/index.js';
export { sessionManager } from './server/sessions.js';
export { stateManager, loadState, saveState, enableGlobal, disableGlobal } from './server/state.js';
export { EmailClient, formatSubject, formatBody } from './server/email.js';
//# sourceMappingURL=index.d.ts.map