/**
 * Shared TypeScript types for claude-code-anywhere
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
    pendingMessageId?: string;
}
/**
 * A pending response waiting for email reply
 */
export interface PendingResponse {
    event: HookEvent;
    prompt: string;
    timestamp: number;
}
/**
 * Response received from email
 */
export interface EmailResponse {
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
}
/**
 * Email configuration
 */
export interface EmailConfig {
    user: string;
    pass: string;
    recipient: string;
    smtpHost: string;
    smtpPort: number;
    imapHost: string;
    imapPort: number;
    pollIntervalMs: number;
}
/**
 * Application configuration
 */
export interface AppConfig {
    email: EmailConfig;
    bridgeUrl: string;
    port: number;
}
/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
/**
 * API request for sending email notification
 */
export interface SendEmailRequest {
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
 * Parsed email message with optional session ID
 */
export interface ParsedSMS {
    sessionId: string | null;
    response: string;
}
//# sourceMappingURL=types.d.ts.map