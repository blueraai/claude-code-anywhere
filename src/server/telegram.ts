/**
 * Telegram client for sending and receiving messages via Bot API
 *
 * Implements the Channel interface for multi-channel support.
 * Uses polling (getUpdates) for receiving messages.
 */

import axios from 'axios';
import {
  TELEGRAM_API_BASE_URL,
  TELEGRAM_POLL_INTERVAL_MS,
  TELEGRAM_POLL_TIMEOUT_SECONDS,
} from '../shared/constants.js';
import { createLogger } from '../shared/logger.js';
import type {
  Channel,
  ChannelNotification,
  ChannelResponse,
  ChannelStatus,
  ResponseCallback,
} from '../shared/channel.js';
import type { Result, TelegramConfig, HookEvent } from '../shared/types.js';
import type { AxiosInstance } from 'axios';

const log = createLogger('telegram');

/**
 * Telegram API response wrapper
 */
interface TelegramAPIResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

/**
 * Telegram API error response structure
 */
interface TelegramErrorResponse {
  ok: false;
  description: string;
}

/**
 * Type guard for Telegram error response
 */
function isTelegramErrorResponse(value: unknown): value is TelegramErrorResponse {
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
 * Telegram message object
 */
interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

/**
 * Telegram update object
 */
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Format a Telegram message for a hook event
 */
function formatTelegramMessage(sessionId: string, event: HookEvent, message: string): string {
  const emoji = getEventEmoji(event);
  const header = getEventHeader(event);
  const escapedSessionId = escapeMarkdown(sessionId);
  return `${emoji} *Claude Code* \\[CC\\-${escapedSessionId}\\]\n\n*${header}*\n\n${escapeMarkdown(message)}\n\n_Reply to this message with your response\\._`;
}

function getEventEmoji(event: HookEvent): string {
  switch (event) {
    case 'Notification':
      return '\u{1F4E2}'; // 📢
    case 'Stop':
      return '\u{2705}'; // ✅
    case 'PreToolUse':
      return '\u{26A0}'; // ⚠️
    case 'UserPromptSubmit':
      return '\u{1F916}'; // 🤖
  }
}

function getEventHeader(event: HookEvent): string {
  switch (event) {
    case 'Notification':
      return 'Notification';
    case 'Stop':
      return 'Session ended';
    case 'PreToolUse':
      return 'Approve tool use?';
    case 'UserPromptSubmit':
      return 'Claude needs input';
  }
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Telegram client for sending and receiving messages
 * Implements the Channel interface for multi-channel support
 */
export class TelegramClient implements Channel {
  public readonly name = 'telegram';
  public readonly enabled: boolean = true;

  private readonly config: TelegramConfig;
  private client: AxiosInstance | null = null;
  private messageCallback: ResponseCallback | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastUpdateId: number = 0;
  private lastActivity: number | null = null;
  private lastError: string | null = null;
  private isPolling: boolean = false;
  private readonly sentMessageIds: Map<number, string> = new Map(); // messageId -> sessionId
  private lastSentSessionId: string | null = null;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * Validate that all required configuration is present
   * Throws if config is missing or invalid
   */
  validateConfig(): void {
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
  getStatus(): ChannelStatus {
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
  async initialize(): Promise<void> {
    this.validateConfig();

    const baseURL = `${TELEGRAM_API_BASE_URL}${this.config.botToken}`;

    this.client = axios.create({
      baseURL,
      timeout: (TELEGRAM_POLL_TIMEOUT_SECONDS + 5) * 1000,
    });

    // Verify the bot token by calling getMe
    try {
      const response =
        await this.client.get<TelegramAPIResponse<{ id: number; username: string }>>('/getMe');
      if (!response.data.ok) {
        throw new Error(response.data.description ?? 'Unknown error from Telegram API');
      }
      log.info(`Initialized Telegram bot: @${response.data.result?.username ?? 'unknown'}`);
      this.lastError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.lastError = message;
      throw new Error(`Failed to initialize Telegram client: ${message}`);
    }
  }

  /**
   * Send a notification through this channel (Channel interface)
   * Returns message ID on success for tracking replies
   */
  async send(notification: ChannelNotification): Promise<Result<string, string>> {
    if (this.client === null) {
      return { success: false, error: 'Telegram client not initialized' };
    }

    const text = formatTelegramMessage(
      notification.sessionId,
      notification.event,
      notification.message
    );

    try {
      const response = await this.client.post<TelegramAPIResponse<TelegramMessage>>(
        '/sendMessage',
        {
          chat_id: this.config.chatId,
          text,
          parse_mode: 'MarkdownV2',
        }
      );

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

      this.lastActivity = Date.now();
      this.lastError = null;
      return { success: true, data: String(messageId) };
    } catch (error) {
      // Extract Telegram API error description from axios error response
      let errorMsg = 'Unknown error';
      if (axios.isAxiosError(error)) {
        const responseData: unknown = error.response?.data;
        if (isTelegramErrorResponse(responseData)) {
          errorMsg = responseData.description;
        } else {
          errorMsg = error.message;
        }
      } else if (error instanceof Error) {
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
  startPolling(callback: ResponseCallback): void {
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
  private async pollForUpdates(): Promise<void> {
    if (this.client === null || this.messageCallback === null || this.isPolling) {
      return;
    }

    this.isPolling = true;

    try {
      const response = await this.client.get<TelegramAPIResponse<TelegramUpdate[]>>('/getUpdates', {
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
        let sessionId: string | null = null;
        if (update.message.reply_to_message) {
          const replyToId = update.message.reply_to_message.message_id;
          sessionId = this.sentMessageIds.get(replyToId) ?? null;
          if (sessionId !== null) {
            log.debug(`Matched session ${sessionId} via reply_to_message`);
          }
        }

        // Try to extract [CC-xxx] from message text
        if (sessionId === null) {
          const match = update.message.text.match(/\[CC-([a-f0-9]+)\]/i);
          sessionId = match?.[1] ?? null;
          if (sessionId !== null) {
            log.debug(`Matched session ${sessionId} via message text`);
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

        const channelResponse: ChannelResponse = {
          sessionId,
          response: update.message.text.trim(),
          from: update.message.from?.username ?? String(update.message.from?.id ?? 'unknown'),
          timestamp: update.message.date * 1000,
          channel: this.name,
        };

        this.lastActivity = Date.now();
        this.messageCallback(channelResponse);
      }

      this.lastError = null;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Telegram poll error (will retry): ${errMsg}`);
      this.lastError = errMsg;
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Stop polling for messages (Channel interface)
   */
  stopPolling(): void {
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
  dispose(): void {
    this.stopPolling();
    this.client = null;
  }
}
