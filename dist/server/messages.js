/**
 * macOS Messages client using imsg CLI
 *
 * Sends and receives messages via Apple's Messages.app
 * Requires: brew install steipete/tap/imsg
 * Requires: Full Disk Access for terminal app
 */
import { execSync } from 'child_process';
const MAX_MESSAGE_LENGTH = 1500;
const DEFAULT_POLL_INTERVAL_MS = 2000;
/**
 * Format a message for SMS with session ID prefix
 */
export function formatMessage(sessionId, event, message) {
    const prefix = `[CC-${sessionId}] `;
    const emoji = getEventEmoji(event);
    const header = getEventHeader(event);
    const fullMessage = `${prefix}${emoji} ${header}\n\n${message}\n\nReply with your response`;
    if (fullMessage.length > MAX_MESSAGE_LENGTH) {
        const available = MAX_MESSAGE_LENGTH - prefix.length - emoji.length - header.length - 30;
        const truncated = `${message.substring(0, available - 3)}...`;
        return `${prefix}${emoji} ${header}\n\n${truncated}\n\nReply with your response`;
    }
    return fullMessage;
}
function getEventEmoji(event) {
    switch (event) {
        case 'Notification':
            return '📢';
        case 'Stop':
            return '✅';
        case 'PreToolUse':
            return '⚠️';
        case 'UserPromptSubmit':
            return '🤖';
        default:
            return '💬';
    }
}
function getEventHeader(event) {
    switch (event) {
        case 'Notification':
            return 'Notification:';
        case 'Stop':
            return 'Session ended:';
        case 'PreToolUse':
            return 'Approve tool use?';
        case 'UserPromptSubmit':
            return 'Claude needs input:';
        default:
            return 'Message:';
    }
}
/**
 * Check if imsg is installed and accessible
 */
export function checkImsgInstalled() {
    try {
        execSync('which imsg', { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * macOS Messages client for sending and receiving messages
 */
export class MessagesClient {
    config;
    chatId = null;
    lastMessageId = 0;
    messageCallback = null;
    pollInterval = null;
    sentMessageHashes = new Map(); // hash -> timestamp
    SENT_MESSAGE_TTL_MS = 60000; // 1 minute
    constructor(config) {
        this.config = config;
    }
    /**
     * Simple hash function for message deduplication
     */
    hashMessage(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(16);
    }
    /**
     * Track a sent message to filter out echoes
     */
    trackSentMessage(text) {
        const hash = this.hashMessage(text);
        this.sentMessageHashes.set(hash, Date.now());
        // Cleanup old entries
        const cutoff = Date.now() - this.SENT_MESSAGE_TTL_MS;
        for (const [h, ts] of this.sentMessageHashes) {
            if (ts < cutoff)
                this.sentMessageHashes.delete(h);
        }
    }
    /**
     * Check if a message was sent by us (to filter SMS echoes)
     */
    wasSentByUs(text) {
        const hash = this.hashMessage(text);
        return this.sentMessageHashes.has(hash);
    }
    /**
     * Type guard for ImsgMessage
     */
    isImsgMessage(obj) {
        return (typeof obj === 'object' &&
            obj !== null &&
            'id' in obj &&
            'guid' in obj &&
            'is_from_me' in obj &&
            'text' in obj &&
            'sender' in obj);
    }
    /**
     * Initialize the client - find or create chat with user
     */
    initialize() {
        // Check if imsg is installed
        if (!checkImsgInstalled()) {
            return {
                success: false,
                error: 'imsg not installed. Run: brew install steipete/tap/imsg',
            };
        }
        // Find chat ID for user's phone number
        try {
            const chatsOutput = execSync('imsg chats --limit 100 --json', {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            const chats = chatsOutput
                .trim()
                .split('\n')
                .filter((line) => line.length > 0)
                .map((line) => JSON.parse(line))
                .filter((obj) => typeof obj === 'object' &&
                obj !== null &&
                'id' in obj &&
                'identifier' in obj &&
                'service' in obj);
            const normalizedUserPhone = this.normalizePhone(this.config.userPhone);
            const chat = chats.find((c) => this.normalizePhone(c.identifier) === normalizedUserPhone);
            if (chat) {
                this.chatId = chat.id;
                // Get the last message ID to avoid processing old messages
                this.updateLastMessageId();
                console.log(`[messages] Found chat with ${this.config.userPhone} (chat ID: ${String(this.chatId)})`);
            }
            else {
                console.log(`[messages] No existing chat found with ${this.config.userPhone}. Will create on first send.`);
            }
            return { success: true, data: undefined };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Failed to initialize Messages client: ${message}`,
            };
        }
    }
    /**
     * Update the last message ID to track new messages
     */
    updateLastMessageId() {
        if (this.chatId === null)
            return;
        try {
            const output = execSync(`imsg history --chat-id ${String(this.chatId)} --limit 1 --json`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
            const lines = output.trim().split('\n').filter((l) => l.length > 0);
            const firstLine = lines[0];
            if (firstLine !== undefined) {
                const parsed = JSON.parse(firstLine);
                if (this.isImsgMessage(parsed)) {
                    this.lastMessageId = parsed.id;
                    console.log(`[messages] Last message ID: ${String(this.lastMessageId)}`);
                }
            }
        }
        catch {
            // Ignore errors - might be empty chat
        }
    }
    /**
     * Normalize phone number for comparison
     */
    normalizePhone(phone) {
        return phone.replace(/\D/g, '');
    }
    /**
     * Send a message
     */
    sendMessage(message) {
        try {
            // Use execSync with heredoc-style input to avoid shell escaping issues
            const result = execSync(`imsg send --to "${this.config.userPhone}" --text "${message.replace(/"/g, '\\"')}" --service sms`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
            // Track this message to filter out SMS echoes when sending to own number
            this.trackSentMessage(message);
            // Update chat ID if we didn't have one
            if (this.chatId === null) {
                this.initialize();
            }
            // Start polling if not already (handles case where chat didn't exist at startup)
            if (this.pollInterval === null && this.messageCallback !== null && this.chatId !== null) {
                console.log('[messages] Chat now exists, starting to poll for replies');
                this.startPolling(this.messageCallback);
            }
            return {
                success: true,
                data: result.trim() || 'sent',
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Failed to send message: ${errorMsg}`,
            };
        }
    }
    /**
     * Send a formatted message for a hook event
     */
    sendHookMessage(sessionId, event, message) {
        const formattedMessage = formatMessage(sessionId, event, message);
        return this.sendMessage(formattedMessage);
    }
    /**
     * Send an error response
     */
    sendErrorResponse(message) {
        return this.sendMessage(`❌ ${message}`);
    }
    /**
     * Send a confirmation
     */
    sendConfirmation(sessionId) {
        return this.sendMessage(`✓ Response received for CC-${sessionId}`);
    }
    /**
     * Start polling for incoming messages
     */
    startPolling(callback, intervalMs = DEFAULT_POLL_INTERVAL_MS) {
        this.messageCallback = callback;
        if (this.chatId === null) {
            console.log('[messages] Cannot poll yet: no chat ID. Will start after first message sent.');
            return;
        }
        if (this.pollInterval !== null) {
            console.log('[messages] Already polling for messages');
            return;
        }
        console.log(`[messages] Starting to poll for messages every ${String(intervalMs)}ms`);
        // Update last message ID before starting to poll
        this.updateLastMessageId();
        this.pollInterval = setInterval(() => {
            this.checkForNewMessages();
        }, intervalMs);
    }
    /**
     * Check for new messages and call callback for each
     */
    checkForNewMessages() {
        if (this.chatId === null || this.messageCallback === null)
            return;
        try {
            const output = execSync(`imsg history --chat-id ${String(this.chatId)} --limit 10 --json`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
            const lines = output.trim().split('\n').filter((l) => l.length > 0);
            for (const line of lines) {
                const parsed = JSON.parse(line);
                if (!this.isImsgMessage(parsed))
                    continue;
                // Skip messages from us (by is_from_me flag)
                if (parsed.is_from_me)
                    continue;
                // Skip echoes of messages we sent (SMS to own number creates duplicates)
                if (this.wasSentByUs(parsed.text))
                    continue;
                // Skip messages we've already processed
                if (parsed.id <= this.lastMessageId)
                    continue;
                this.lastMessageId = parsed.id;
                console.log(`[messages] Received: "${parsed.text}" from ${parsed.sender}`);
                // Parse and deliver the message
                const message = this.parseMessage(parsed.text);
                this.messageCallback(message);
            }
        }
        catch {
            // Ignore polling errors - will retry next interval
        }
    }
    /**
     * Parse a message for session ID
     */
    parseMessage(text) {
        // Try to extract session ID from [CC-xxx] prefix
        const match = text.match(/^\[CC-([a-f0-9]+)\]\s*/i);
        const sessionId = match?.[1];
        const matchLength = match?.[0].length ?? 0;
        if (sessionId !== undefined) {
            return {
                sessionId,
                response: text.substring(matchLength).trim(),
            };
        }
        // No session ID prefix - return as-is
        return {
            sessionId: null,
            response: text.trim(),
        };
    }
    /**
     * Stop polling for messages
     */
    stopPolling() {
        if (this.pollInterval !== null) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log('[messages] Stopped polling for messages');
        }
        this.messageCallback = null;
    }
    /**
     * Verify the from phone number matches configured user
     */
    verifyFromNumber(from) {
        return this.normalizePhone(from) === this.normalizePhone(this.config.userPhone);
    }
    /**
     * Clean up resources
     */
    dispose() {
        this.stopPolling();
    }
}
//# sourceMappingURL=messages.js.map