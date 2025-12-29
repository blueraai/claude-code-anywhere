/**
 * Claude SMS - SMS notifications and bidirectional communication for Claude Code
 */

// Re-export types
export type {
  HookEvent,
  Session,
  PendingResponse,
  SMSResponse,
  GlobalState,
  ServerStatus,
  TwilioConfig,
  AppConfig,
  Result,
  SendSMSRequest,
  RegisterSessionRequest,
  TwilioWebhookPayload,
  ParsedSMS,
} from './shared/types.js';

// Re-export config utilities
export { loadTwilioConfig, loadAppConfig, getStateDir, getStateFilePath } from './shared/config.js';

// Re-export server components
export { createBridgeServer, BridgeServer } from './server/index.js';
export { createTunnel, CloudflaredTunnel } from './server/tunnel.js';
export { sessionManager } from './server/sessions.js';
export { stateManager, loadState, saveState, enableGlobal, disableGlobal } from './server/state.js';
export { TwilioClient, formatSMSMessage, generateTwiML } from './server/twilio.js';
