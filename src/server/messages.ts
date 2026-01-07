/**
 * macOS Messages client using imsg CLI
 *
 * Sends and receives messages via Apple's Messages.app
 * Requires: brew install steipete/tap/imsg
 * Requires: Full Disk Access for terminal app
 */

import { execSync } from 'child_process';
import type { Result, HookEvent, ParsedSMS } from '../shared/types.js';

const MAX_MESSAGE_LENGTH = 1500;
const DEFAULT_POLL_INTERVAL_MS = 2000;

/**
 * Configuration for Messages client
 */
export interface MessagesConfig {
  userEmail: string;
}

/**
 * Message from imsg
 */
interface ImsgMessage {
  id: number;
  guid: string;
  is_from_me: boolean;
  chat_id: number;
  sender: string;
  text: string;
  created_at: string;
}

/**
 * Chat from imsg
 */
interface ImsgChat {
  id: number;
  identifier: string;
  service: string;
}

/**
 * Format a message for SMS with session ID prefix
 */
export function formatMessage(sessionId: string, event: HookEvent, message: string): string {
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

function getEventEmoji(event: HookEvent): string {
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

function getEventHeader(event: HookEvent): string {
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
export function checkImsgInstalled(): boolean {
  try {
    execSync('which imsg', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * macOS Messages client for sending and receiving messages
 */
export class MessagesClient {
  private readonly config: MessagesConfig;
  private chatId: number | null = null;
  private lastMessageId: number = 0;
  private messageCallback: ((message: ParsedSMS) => void) | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly sentMessageHashes: Map<string, number> = new Map(); // hash -> timestamp
  private readonly SENT_MESSAGE_TTL_MS = 60000; // 1 minute

  constructor(config: MessagesConfig) {
    this.config = config;
  }

  /**
   * Simple hash function for message deduplication
   */
  private hashMessage(text: string): string {
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
  private trackSentMessage(text: string): void {
    const hash = this.hashMessage(text);
    this.sentMessageHashes.set(hash, Date.now());
    // Cleanup old entries
    const cutoff = Date.now() - this.SENT_MESSAGE_TTL_MS;
    for (const [h, ts] of this.sentMessageHashes) {
      if (ts < cutoff) this.sentMessageHashes.delete(h);
    }
  }

  /**
   * Check if a message was sent by us (to filter SMS echoes)
   */
  private wasSentByUs(text: string): boolean {
    const hash = this.hashMessage(text);
    return this.sentMessageHashes.has(hash);
  }

  /**
   * Type guard for ImsgMessage
   */
  private isImsgMessage(obj: unknown): obj is ImsgMessage {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'guid' in obj &&
      'is_from_me' in obj &&
      'text' in obj &&
      'sender' in obj
    );
  }

  /**
   * Initialize the client - find or create chat with user
   */
  initialize(): Result<void, string> {
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

      const chats: ImsgChat[] = chatsOutput
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line): unknown => JSON.parse(line))
        .filter((obj): obj is ImsgChat =>
          typeof obj === 'object' &&
          obj !== null &&
          'id' in obj &&
          'identifier' in obj &&
          'service' in obj
        );

      const normalizedUserEmail = this.config.userEmail.toLowerCase();
      const chat = chats.find(
        (c) => c.identifier.toLowerCase() === normalizedUserEmail
      );

      if (chat) {
        this.chatId = chat.id;
        // Get the last message ID to avoid processing old messages
        this.updateLastMessageId();
        console.log(`[messages] Found chat with ${this.config.userEmail} (chat ID: ${String(this.chatId)})`);
      } else {
        console.log(`[messages] No existing chat found with ${this.config.userEmail}. Will create on first send.`);
      }

      return { success: true, data: undefined };
    } catch (error) {
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
  private updateLastMessageId(): void {
    if (this.chatId === null) return;

    try {
      const output = execSync(
        `imsg history --chat-id ${String(this.chatId)} --limit 1 --json`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const lines = output.trim().split('\n').filter((l) => l.length > 0);
      const firstLine = lines[0];
      if (firstLine !== undefined) {
        const parsed: unknown = JSON.parse(firstLine);
        if (this.isImsgMessage(parsed)) {
          this.lastMessageId = parsed.id;
          console.log(`[messages] Last message ID: ${String(this.lastMessageId)}`);
        }
      }
    } catch {
      // Ignore errors - might be empty chat
    }
  }

  /**
   * Normalize email for comparison
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Send a message
   */
  sendMessage(message: string): Result<string, string> {
    try {
      // Use execSync with heredoc-style input to avoid shell escaping issues
      const result = execSync(
        `imsg send --to "${this.config.userEmail}" --text "${message.replace(/"/g, '\\"')}" --service imessage`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

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
    } catch (error) {
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
  sendHookMessage(
    sessionId: string,
    event: HookEvent,
    message: string
  ): Result<string, string> {
    const formattedMessage = formatMessage(sessionId, event, message);
    return this.sendMessage(formattedMessage);
  }

  /**
   * Send an error response
   */
  sendErrorResponse(message: string): Result<string, string> {
    return this.sendMessage(`❌ ${message}`);
  }

  /**
   * Send a confirmation
   */
  sendConfirmation(sessionId: string): Result<string, string> {
    return this.sendMessage(`✓ Response received for CC-${sessionId}`);
  }

  /**
   * Start polling for incoming messages
   */
  startPolling(callback: (message: ParsedSMS) => void, intervalMs: number = DEFAULT_POLL_INTERVAL_MS): void {
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
  private checkForNewMessages(): void {
    if (this.chatId === null || this.messageCallback === null) return;

    try {
      const output = execSync(
        `imsg history --chat-id ${String(this.chatId)} --limit 10 --json`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const lines = output.trim().split('\n').filter((l) => l.length > 0);

      for (const line of lines) {
        const parsed: unknown = JSON.parse(line);
        if (!this.isImsgMessage(parsed)) continue;

        // Skip messages from us (by is_from_me flag)
        if (parsed.is_from_me) continue;

        // Skip echoes of messages we sent (SMS to own number creates duplicates)
        if (this.wasSentByUs(parsed.text)) continue;

        // Skip messages we've already processed
        if (parsed.id <= this.lastMessageId) continue;

        this.lastMessageId = parsed.id;

        console.log(`[messages] Received: "${parsed.text}" from ${parsed.sender}`);

        // Parse and deliver the message
        const message = this.parseMessage(parsed.text);
        this.messageCallback(message);
      }
    } catch {
      // Ignore polling errors - will retry next interval
    }
  }

  /**
   * Parse a message for session ID
   */
  private parseMessage(text: string): ParsedSMS {
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
  stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[messages] Stopped polling for messages');
    }
    this.messageCallback = null;
  }

  /**
   * Verify the from email matches configured user
   */
  verifyFromEmail(from: string): boolean {
    return this.normalizeEmail(from) === this.normalizeEmail(this.config.userEmail);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopPolling();
  }
}
