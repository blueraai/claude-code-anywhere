/**
 * Telegram client for sending and receiving messages via Bot API
 *
 * Implements the Channel interface for multi-channel support.
 * Uses polling (getUpdates) for receiving messages.
 */
import axios from 'axios';
import { TELEGRAM_API_BASE_URL, TELEGRAM_POLL_INTERVAL_MS, TELEGRAM_POLL_TIMEOUT_SECONDS, } from '../shared/constants.js';
import { TelegramConfigError } from '../shared/errors.js';
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
        case 'ResponseSync':
            return '\u{1F4E4}'; // 📤
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
        case 'ResponseSync':
            return 'User responded';
    }
}
/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
function isValidAction(action) {
    return (action === 'approve' ||
        action === 'deny' ||
        action === 'continue' ||
        action === 'stop' ||
        action === 'details');
}
/**
 * Parse callback data from inline keyboard button press.
 * Format: "action:sessionId" where action is approve/deny/continue/stop/details.
 * Session IDs can contain alphanumeric chars, hyphens, and underscores.
 * Throws if format is invalid (fail fast).
 */
function parseCallbackData(data) {
    const match = data.match(/^(approve|deny|continue|stop|details):([a-zA-Z0-9_-]+)$/i);
    const actionStr = match?.[1];
    const sessionId = match?.[2];
    if (actionStr === undefined || sessionId === undefined) {
        throw new Error(`Invalid callback data format: ${data}`);
    }
    const actionLower = actionStr.toLowerCase();
    if (!isValidAction(actionLower)) {
        throw new Error(`Invalid callback action: ${actionStr}`);
    }
    return { action: actionLower, sessionId };
}
/**
 * Build inline keyboard markup for PreToolUse approval
 */
function buildApprovalKeyboard(sessionId) {
    return {
        inline_keyboard: [
            [
                { text: '\u2705 YES', callback_data: `approve:${sessionId}` },
                { text: '\u274C NO', callback_data: `deny:${sessionId}` },
            ],
        ],
    };
}
/**
 * Build inline keyboard markup for quick responses (Notification/Stop events)
 */
function buildQuickResponseKeyboard(sessionId) {
    return {
        inline_keyboard: [
            [
                { text: '\u25B6\uFE0F Continue', callback_data: `continue:${sessionId}` },
                { text: '\u23F9\uFE0F Stop', callback_data: `stop:${sessionId}` },
                { text: '\uD83D\uDCCB Details', callback_data: `details:${sessionId}` },
            ],
        ],
    };
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
            throw new TelegramConfigError('botToken');
        }
        if (!this.config.chatId) {
            throw new TelegramConfigError('chatId');
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
            config: {
                chatId: this.config.chatId,
            },
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
        // Build request body with optional inline keyboard for PreToolUse
        const requestBody = {
            chat_id: this.config.chatId,
            text,
            parse_mode: 'MarkdownV2',
        };
        // Add inline keyboard based on event type
        if (notification.event === 'PreToolUse') {
            requestBody.reply_markup = buildApprovalKeyboard(notification.sessionId);
        }
        else if (notification.event === 'Notification' || notification.event === 'Stop') {
            requestBody.reply_markup = buildQuickResponseKeyboard(notification.sessionId);
        }
        try {
            const response = await this.client.post('/sendMessage', requestBody);
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
     * Poll for new updates from Telegram (messages and callback queries)
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
                    allowed_updates: ['message', 'callback_query'],
                },
            });
            if (!response.data.ok || !response.data.result) {
                throw new Error(response.data.description ?? 'Failed to get updates');
            }
            for (const update of response.data.result) {
                this.lastUpdateId = update.update_id;
                // Handle callback_query (inline keyboard button press)
                if (update.callback_query) {
                    await this.handleCallbackQuery(update.callback_query);
                    continue;
                }
                // Handle regular text messages
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
     * Handle callback query from inline keyboard button press.
     * Parses the callback data, acknowledges the query, edits the message,
     * and emits the response to the channel callback.
     */
    async handleCallbackQuery(callbackQuery) {
        if (this.client === null || this.messageCallback === null) {
            throw new Error('Telegram client not initialized');
        }
        const { id, from, message, data } = callbackQuery;
        // Callback data is required
        if (data === undefined) {
            throw new Error('Callback query missing data');
        }
        // Only process from our configured chat
        if (message !== undefined && String(message.chat.id) !== this.config.chatId) {
            log.debug(`Ignoring callback from chat ${String(message.chat.id)}`);
            await this.answerCallbackQuery(id);
            return;
        }
        // Parse callback data (throws on invalid format - fail fast)
        const { action, sessionId } = parseCallbackData(data);
        // Map action to response text
        const actionResponseMap = {
            approve: 'yes',
            deny: 'no',
            continue: 'continue',
            stop: 'stop',
            details: 'tell me more',
        };
        const responseText = actionResponseMap[action];
        log.info('Received callback query', {
            from: from.username ?? String(from.id),
            sessionId,
            action,
        });
        // Acknowledge the callback (dismisses loading indicator)
        // Note: This can fail if callback is too old (Telegram 10-second window)
        // We continue processing regardless since the response is what matters
        try {
            await this.answerCallbackQuery(id);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            log.warn(`Failed to acknowledge callback (may be stale): ${errMsg}`);
        }
        // Edit message to remove buttons after response
        // Note: This can also fail for stale messages, but response is already captured
        if (message !== undefined) {
            try {
                await this.editMessageAfterResponse(message.chat.id, message.message_id);
            }
            catch (error) {
                const errMsg = error instanceof Error ? error.message : 'Unknown error';
                log.warn(`Failed to remove inline keyboard: ${errMsg}`);
            }
        }
        // Build and emit the channel response
        const channelResponse = {
            sessionId,
            response: responseText,
            from: from.username ?? String(from.id),
            timestamp: Date.now(),
            channel: this.name,
        };
        this.lastActivity = Date.now();
        this.messageCallback(channelResponse);
    }
    /**
     * Acknowledge a callback query (required by Telegram API).
     * Dismisses the loading indicator on the button.
     */
    async answerCallbackQuery(callbackQueryId) {
        if (this.client === null) {
            throw new Error('Telegram client not initialized');
        }
        const response = await this.client.post('/answerCallbackQuery', {
            callback_query_id: callbackQueryId,
        });
        if (!response.data.ok) {
            throw new Error(response.data.description ?? 'Failed to answer callback query');
        }
    }
    /**
     * Edit a message to remove inline keyboard after user responds.
     */
    async editMessageAfterResponse(chatId, messageId) {
        if (this.client === null) {
            throw new Error('Telegram client not initialized');
        }
        const response = await this.client.post('/editMessageReplyMarkup', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard: [] },
        });
        if (!response.data.ok) {
            throw new Error(response.data.description ?? 'Failed to edit message');
        }
        log.debug(`Removed inline keyboard from message ${String(messageId)}`);
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