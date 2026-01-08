/**
 * Telegram client for sending and receiving messages via Bot API
 *
 * Implements the Channel interface for multi-channel support.
 * Uses polling (getUpdates) for receiving messages.
 */
import axios from 'axios';
import { TELEGRAM_API_BASE_URL, TELEGRAM_POLL_INTERVAL_MS, TELEGRAM_POLL_TIMEOUT_SECONDS, } from '../shared/constants.js';
import { createLogger } from '../shared/logger.js';
const log = createLogger('telegram');
/**
 * Maximum number of sent message IDs to track for reply matching.
 * Prevents unbounded memory growth in long-running sessions.
 */
const MAX_SENT_MESSAGE_IDS = 10000;
/**
 * Type guard for Telegram error response
 */
function isTelegramErrorResponse(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    if (!('ok' in value) || value.ok !== false) {
        return false;
    }
    if (!('description' in value)) {
        return false;
    }
    const desc = value.description;
    return typeof desc === 'string';
}
/**
 * Format a Telegram message for a hook event
 */
function formatTelegramMessage(sessionId, event, message) {
    const emoji = getEventEmoji(event);
    const header = getEventHeader(event);
    const escapedSessionId = escapeMarkdown(sessionId);
    return `${emoji} *Claude Code* \\[CC\\-${escapedSessionId}\\]\n\n*${header}*\n\n${escapeMarkdown(message)}\n\n_Reply to this message with your response\\._`;
}
export function getEventEmoji(event) {
    switch (event) {
        case 'Notification':
            return '\u{1F4E2}'; // 📢
        case 'Stop':
            return '\u{2705}'; // ✅
        case 'PreToolUse':
            return '\u{26A0}'; // ⚠️
        case 'UserPromptSubmit':
            return '\u{1F916}'; // 🤖
        default:
            throw new Error(`Unexpected HookEvent: ${String(event)}`);
    }
}
export function getEventHeader(event) {
    switch (event) {
        case 'Notification':
            return 'Notification';
        case 'Stop':
            return 'Session ended';
        case 'PreToolUse':
            return 'Approve tool use?';
        case 'UserPromptSubmit':
            return 'Claude needs input';
        default:
            throw new Error(`Unexpected HookEvent: ${String(event)}`);
    }
}
/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
/**
 * Telegram client for sending and receiving messages
 * Implements the Channel interface for multi-channel support
 */
export class TelegramClient {
    name = 'telegram';
    enabled = true;
    config;
    client = null;
    messageCallback = null;
    pollInterval = null;
    lastUpdateId = 0;
    lastActivity = null;
    lastError = null;
    isPolling = false;
    sentMessageIds = new Map(); // messageId -> sessionId
    lastSentSessionId = null;
    constructor(config) {
        this.config = config;
    }
    /**
     * Validate that all required configuration is present
     * Throws if config is missing or invalid
     */
    validateConfig() {
        if (!this.config.botToken) {
            throw new Error('TELEGRAM_BOT_TOKEN is required');
        }
        if (!this.config.chatId) {
            throw new Error('TELEGRAM_CHAT_ID is required');
        }
    }
    /**
     * Get current channel status for diagnostics
     */
    getStatus() {
        return {
            name: this.name,
            enabled: this.enabled,
            connected: this.client !== null,
            lastActivity: this.lastActivity,
            error: this.lastError,
        };
    }
    /**
     * Initialize the Telegram client
     */
    async initialize() {
        this.validateConfig();
        const baseURL = `${TELEGRAM_API_BASE_URL}${this.config.botToken}`;
        this.client = axios.create({
            baseURL,
            timeout: (TELEGRAM_POLL_TIMEOUT_SECONDS + 5) * 1000,
        });
        // Verify the bot token by calling getMe
        try {
            const response = await this.client.get('/getMe');
            if (!response.data.ok) {
                throw new Error(response.data.description ?? 'Unknown error from Telegram API');
            }
            log.info(`Initialized Telegram bot: @${response.data.result?.username ?? 'unknown'}`);
            this.lastError = null;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.lastError = message;
            throw new Error(`Failed to initialize Telegram client: ${message}`);
        }
    }
    /**
     * Send a notification through this channel (Channel interface)
     * Returns message ID on success for tracking replies
     */
    async send(notification) {
        if (this.client === null) {
            return { success: false, error: 'Telegram client not initialized' };
        }
        const text = formatTelegramMessage(notification.sessionId, notification.event, notification.message);
        try {
            const response = await this.client.post('/sendMessage', {
                chat_id: this.config.chatId,
                text,
                parse_mode: 'MarkdownV2',
            });
            if (!response.data.ok || !response.data.result) {
                const errorMsg = response.data.description ?? 'Unknown error';
                this.lastError = errorMsg;
                return { success: false, error: `Failed to send Telegram message: ${errorMsg}` };
            }
            const messageId = response.data.result.message_id;
            log.info(`Sent Telegram message`, {
                messageId,
                sessionId: notification.sessionId,
                event: notification.event,
            });
            // Track this message for reply matching
            this.sentMessageIds.set(messageId, notification.sessionId);
            this.lastSentSessionId = notification.sessionId;
            // Prune oldest entries if map exceeds maximum size
            if (this.sentMessageIds.size > MAX_SENT_MESSAGE_IDS) {
                const entriesToRemove = this.sentMessageIds.size - MAX_SENT_MESSAGE_IDS;
                const keys = this.sentMessageIds.keys();
                for (let i = 0; i < entriesToRemove; i++) {
                    const key = keys.next().value;
                    if (key !== undefined) {
                        this.sentMessageIds.delete(key);
                    }
                }
            }
            this.lastActivity = Date.now();
            this.lastError = null;
            return { success: true, data: String(messageId) };
        }
        catch (error) {
            // Extract Telegram API error description from axios error response
            let errorMsg = 'Unknown error';
            if (axios.isAxiosError(error)) {
                const responseData = error.response?.data;
                if (isTelegramErrorResponse(responseData)) {
                    errorMsg = responseData.description;
                }
                else {
                    errorMsg = error.message;
                }
            }
            else if (error instanceof Error) {
                errorMsg = error.message;
            }
            this.lastError = errorMsg;
            log.error(`Telegram send error: ${errorMsg}`);
            return { success: false, error: `Failed to send Telegram message: ${errorMsg}` };
        }
    }
    /**
     * Start polling for incoming messages (Channel interface)
     */
    startPolling(callback) {
        this.messageCallback = callback;
        if (this.pollInterval !== null) {
            log.warn('Already polling for Telegram messages');
            return;
        }
        log.info(`Starting to poll Telegram every ${String(TELEGRAM_POLL_INTERVAL_MS)}ms`);
        // Do initial poll
        void this.pollForUpdates();
        this.pollInterval = setInterval(() => {
            void this.pollForUpdates();
        }, TELEGRAM_POLL_INTERVAL_MS);
    }
    /**
     * Poll for new updates from Telegram
     */
    async pollForUpdates() {
        if (this.client === null || this.messageCallback === null || this.isPolling) {
            return;
        }
        this.isPolling = true;
        try {
            const response = await this.client.get('/getUpdates', {
                params: {
                    offset: this.lastUpdateId + 1,
                    timeout: TELEGRAM_POLL_TIMEOUT_SECONDS,
                    allowed_updates: ['message'],
                },
            });
            if (!response.data.ok || !response.data.result) {
                throw new Error(response.data.description ?? 'Failed to get updates');
            }
            for (const update of response.data.result) {
                this.lastUpdateId = update.update_id;
                if (update.message?.text === undefined || update.message.text === '') {
                    continue;
                }
                // Only process messages from our configured chat
                if (String(update.message.chat.id) !== this.config.chatId) {
                    log.debug(`Ignoring message from chat ${String(update.message.chat.id)}`);
                    continue;
                }
                // Debug: log full update for troubleshooting
                log.debug('Telegram update received', {
                    messageId: update.message.message_id,
                    text: update.message.text,
                    hasReplyTo: update.message.reply_to_message !== undefined,
                    replyToId: update.message.reply_to_message?.message_id,
                    trackedMessageIds: Array.from(this.sentMessageIds.keys()),
                });
                // Try to match session via reply_to_message
                let sessionId = null;
                if (update.message.reply_to_message) {
                    const replyToId = update.message.reply_to_message.message_id;
                    sessionId = this.sentMessageIds.get(replyToId) ?? null;
                    if (sessionId !== null) {
                        log.debug(`Matched session ${sessionId} via reply_to_message`);
                    }
                }
                // Try to extract [CC-xxx] from message text and strip the prefix
                let responseText = update.message.text;
                if (sessionId === null) {
                    const match = update.message.text.match(/^\[CC-([a-f0-9]+)\]\s*/i);
                    if (match !== null) {
                        sessionId = match[1] ?? null;
                        responseText = update.message.text.substring(match[0].length).trim();
                        log.debug(`Matched session ${sessionId ?? 'unknown'} via message text`);
                    }
                }
                // Use most recent notification as implicit reply target (1-on-1 chat behavior)
                if (sessionId === null && this.lastSentSessionId !== null) {
                    sessionId = this.lastSentSessionId;
                    log.debug(`Matched session ${sessionId} via sequential reply`);
                }
                if (sessionId === null) {
                    log.warn('Received Telegram message without valid session ID', {
                        from: update.message.from?.username ?? 'unknown',
                        text: update.message.text,
                    });
                    continue;
                }
                log.info('Received Telegram message', {
                    from: update.message.from?.username ?? 'unknown',
                    sessionId,
                    text: update.message.text,
                });
                const channelResponse = {
                    sessionId,
                    response: responseText,
                    from: update.message.from?.username ?? String(update.message.from?.id ?? 'unknown'),
                    timestamp: update.message.date * 1000,
                    channel: this.name,
                };
                this.lastActivity = Date.now();
                this.messageCallback(channelResponse);
            }
            this.lastError = null;
        }
        catch (error) {
            // Fail fast: stop polling and record the error
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            log.error(`Telegram poll error: ${errMsg}`);
            this.lastError = errMsg;
            this.stopPolling();
        }
        finally {
            this.isPolling = false;
        }
    }
    /**
     * Stop polling for messages (Channel interface)
     */
    stopPolling() {
        if (this.pollInterval !== null) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            log.info('Stopped polling for Telegram messages');
        }
        this.messageCallback = null;
        this.sentMessageIds.clear();
        this.lastSentSessionId = null;
    }
    /**
     * Clean up resources (Channel interface)
     */
    dispose() {
        this.stopPolling();
        this.client = null;
    }
}
//# sourceMappingURL=telegram.js.map