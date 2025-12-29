/**
 * Shared TypeScript types for claude-sms
 */

/**
 * Claude Code hook event types
 */
export type HookEvent = 'Notification' | 'Stop' | 'PreToolUse' | 'UserPromptSubmit';

/**
 * Session state for a Claude Code instance
 */
export interface Session {
  id: string;
  createdAt: number;
  lastActivity: number;
  enabled: boolean;
  pendingResponse: PendingResponse | null;
}

/**
 * A pending response waiting for SMS reply
 */
export interface PendingResponse {
  event: HookEvent;
  prompt: string;
  timestamp: number;
}

/**
 * Response received from SMS
 */
export interface SMSResponse {
  sessionId: string;
  response: string;
  from: string;
  timestamp: number;
}

/**
 * Global state configuration
 */
export interface GlobalState {
  enabled: boolean;
  hooks: Record<HookEvent, boolean>;
}

/**
 * Server status response
 */
export interface ServerStatus {
  status: 'running';
  activeSessions: number;
  pendingResponses: number;
  uptime: number;
  tunnelUrl: string | null;
}

/**
 * Twilio configuration
 */
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  userPhone: string;
}

/**
 * Application configuration
 */
export interface AppConfig {
  twilio: TwilioConfig;
  bridgeUrl: string;
  port: number;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * API request for sending SMS
 */
export interface SendSMSRequest {
  sessionId: string;
  event: HookEvent;
  message: string;
}

/**
 * API request for registering a session
 */
export interface RegisterSessionRequest {
  sessionId: string;
  event: HookEvent;
  prompt: string;
}

/**
 * Twilio webhook payload (inbound SMS)
 */
export interface TwilioWebhookPayload {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  NumMedia?: string;
}

/**
 * Parsed SMS message with optional session ID
 */
export interface ParsedSMS {
  sessionId: string | null;
  response: string;
}
