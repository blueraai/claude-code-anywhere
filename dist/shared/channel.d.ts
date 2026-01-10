/**
 * Channel abstraction for multi-channel notification support
 */
import type { HookEvent, Result } from './types.js';
/**
 * Channel notification payload - sent from bridge to channel
 */
export interface ChannelNotification {
    sessionId: string;
    event: HookEvent;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
}
/**
 * Channel response payload - received from channel
 */
export interface ChannelResponse {
    sessionId: string;
    response: string;
    from: string;
    timestamp: number;
    channel: string;
}
/**
 * Channel status for diagnostics
 */
export interface ChannelStatus {
    name: string;
    enabled: boolean;
    connected: boolean;
    lastActivity: number | null;
    error: string | null;
    config: Record<string, string>;
}
/**
 * Callback for receiving responses from channels
 * Async to ensure response is fully processed before email/message deletion
 */
export type ResponseCallback = (response: ChannelResponse) => Promise<void>;
/**
 * Channel interface - all notification channels must implement this
 */
export interface Channel {
    /**
     * Unique channel name (e.g., 'email', 'telegram')
     */
    readonly name: string;
    /**
     * Whether this channel is currently enabled
     */
    readonly enabled: boolean;
    /**
     * Initialize the channel (connect, authenticate, etc.)
     * Should throw if configuration is invalid or connection fails
     */
    initialize(): Promise<void>;
    /**
     * Send a notification through this channel
     * Returns message ID on success for tracking replies
     */
    send(notification: ChannelNotification): Promise<Result<string, string>>;
    /**
     * Start polling for responses (if channel supports bidirectional comms)
     */
    startPolling(callback: ResponseCallback): void;
    /**
     * Stop polling for responses
     */
    stopPolling(): void;
    /**
     * Clean up resources (close connections, etc.)
     */
    dispose(): void;
    /**
     * Validate that all required configuration is present
     * Should throw if config is missing or invalid
     */
    validateConfig(): void;
    /**
     * Get current channel status for diagnostics
     */
    getStatus(): ChannelStatus;
}
//# sourceMappingURL=channel.d.ts.map