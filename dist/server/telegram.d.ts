/**
 * Telegram client for sending and receiving messages via Bot API
 *
 * Implements the Channel interface for multi-channel support.
 * Uses polling (getUpdates) for receiving messages.
 */
import type { Channel, ChannelNotification, ChannelStatus, ResponseCallback } from '../shared/channel.js';
import type { Result, TelegramConfig, HookEvent } from '../shared/types.js';
export declare function getEventEmoji(event: HookEvent): string;
export declare function getEventHeader(event: HookEvent): string;
/**
 * Telegram client for sending and receiving messages
 * Implements the Channel interface for multi-channel support
 */
export declare class TelegramClient implements Channel {
    readonly name = "telegram";
    readonly enabled: boolean;
    private readonly config;
    private client;
    private messageCallback;
    private pollInterval;
    private lastUpdateId;
    private lastActivity;
    private lastError;
    private isPolling;
    private readonly sentMessageIds;
    private lastSentSessionId;
    constructor(config: TelegramConfig);
    /**
     * Validate that all required configuration is present
     * Throws if config is missing or invalid
     */
    validateConfig(): void;
    /**
     * Get current channel status for diagnostics
     */
    getStatus(): ChannelStatus;
    /**
     * Initialize the Telegram client
     */
    initialize(): Promise<void>;
    /**
     * Send a notification through this channel (Channel interface)
     * Returns message ID on success for tracking replies
     */
    send(notification: ChannelNotification): Promise<Result<string, string>>;
    /**
     * Start polling for incoming messages (Channel interface)
     */
    startPolling(callback: ResponseCallback): void;
    /**
     * Poll for new updates from Telegram
     */
    private pollForUpdates;
    /**
     * Stop polling for messages (Channel interface)
     */
    stopPolling(): void;
    /**
     * Clean up resources (Channel interface)
     */
    dispose(): void;
}
//# sourceMappingURL=telegram.d.ts.map