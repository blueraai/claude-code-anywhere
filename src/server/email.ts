/**
 * Email client for sending and receiving messages via SMTP/IMAP
 *
 * Replaces the macOS Messages.app integration with traditional email.
 * Uses Gmail by default (smtp.gmail.com / imap.gmail.com).
 */

import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

type NodemailerTransporter = ReturnType<typeof nodemailer.createTransport>;
import type { Result, HookEvent, ParsedSMS } from '../shared/types.js';
import { MAX_EMAIL_BODY_LENGTH } from '../shared/constants.js';
import { createLogger } from '../shared/logger.js';
import { sessionManager } from './sessions.js';

const log = createLogger('email');

/**
 * Configuration for Email client
 */
export interface EmailConfig {
  user: string; // Email address for Claude
  pass: string; // Email app password
  recipient: string; // User's email to notify
  smtpHost: string; // SMTP server host
  smtpPort: number; // SMTP server port
  imapHost: string; // IMAP server host
  imapPort: number; // IMAP server port
  pollIntervalMs: number; // IMAP polling interval
}

/**
 * Format an email subject with session ID prefix
 */
export function formatSubject(sessionId: string, event: HookEvent): string {
  const emoji = getEventEmoji(event);
  const header = getEventHeader(event);
  return `[CC-${sessionId}] ${emoji} ${header}`;
}

/**
 * Format the email body
 */
export function formatBody(message: string): string {
  if (message.length > MAX_EMAIL_BODY_LENGTH) {
    return `${message.substring(0, MAX_EMAIL_BODY_LENGTH - 3)}...\n\nReply to this email with your response.`;
  }
  return `${message}\n\nReply to this email with your response.`;
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
      return 'Notification';
    case 'Stop':
      return 'Session ended';
    case 'PreToolUse':
      return 'Approve tool use?';
    case 'UserPromptSubmit':
      return 'Claude needs input';
    default:
      return 'Message';
  }
}

/**
 * Email client for sending and receiving messages
 */
export class EmailClient {
  private readonly config: EmailConfig;
  private transporter: NodemailerTransporter | null = null;
  private messageCallback: ((message: ParsedSMS) => void) | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly processedMessageIds: Set<string> = new Set();

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Initialize the email client - set up SMTP transporter
   */
  initialize(): Result<void, string> {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpPort === 465,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      });

      log.info(`Initialized SMTP transport for ${this.config.user}`);
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to initialize email client: ${message}`,
      };
    }
  }

  /**
   * Send an email
   */
  async sendEmail(subject: string, body: string): Promise<Result<string, string>> {
    if (this.transporter === null) {
      return { success: false, error: 'Email client not initialized' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.user,
        to: this.config.recipient,
        subject,
        text: body,
      });

      log.email('SENT', {
        to: this.config.recipient,
        subject,
        body,
        messageId: info.messageId,
      });
      return { success: true, data: info.messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to send email: ${errorMsg}` };
    }
  }

  /**
   * Send a formatted email for a hook event
   */
  async sendHookMessage(
    sessionId: string,
    event: HookEvent,
    message: string
  ): Promise<Result<string, string>> {
    const subject = formatSubject(sessionId, event);
    const body = formatBody(message);
    return this.sendEmail(subject, body);
  }

  /**
   * Send an error response
   */
  async sendErrorResponse(message: string): Promise<Result<string, string>> {
    return this.sendEmail('❌ Error', message);
  }

  /**
   * Send a confirmation
   */
  async sendConfirmation(sessionId: string): Promise<Result<string, string>> {
    return this.sendEmail(`✓ Response received for CC-${sessionId}`, 'Your response has been processed.');
  }

  /**
   * Start polling for incoming emails
   */
  startPolling(callback: (message: ParsedSMS) => void): void {
    this.messageCallback = callback;

    if (this.pollInterval !== null) {
      log.warn('Already polling for emails');
      return;
    }

    const intervalMs = this.config.pollIntervalMs;
    log.info(`Starting to poll for emails every ${String(intervalMs)}ms`);

    // Do initial check
    void this.checkForNewEmails();

    this.pollInterval = setInterval(() => {
      void this.checkForNewEmails();
    }, intervalMs);
  }

  /**
   * Check for new emails via IMAP
   */
  private async checkForNewEmails(): Promise<void> {
    if (this.messageCallback === null) return;

    let client: ImapFlow | null = null;
    try {
      client = new ImapFlow({
        host: this.config.imapHost,
        port: this.config.imapPort,
        secure: this.config.imapPort === 993,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        logger: false,
      });

      // Handle error events to prevent unhandled exception crashes
      client.on('error', (err: Error) => {
        log.error(`IMAP error: ${err.message}`);
      });

      await client.connect();

      const lock = await client.getMailboxLock('INBOX');
      try {
        // Search for unread emails from the recipient (replies)
        const messages = client.fetch(
          { seen: false, from: this.config.recipient },
          { envelope: true, uid: true, bodyParts: ['text'] }
        );

        for await (const msg of messages) {
          // Skip if no envelope
          if (msg.envelope === undefined) continue;

          // Skip already processed messages
          const messageId = msg.envelope.messageId;
          if (messageId !== undefined && this.processedMessageIds.has(messageId)) {
            continue;
          }

          if (messageId !== undefined) {
            this.processedMessageIds.add(messageId);
          }

          const subject = msg.envelope.subject ?? '';
          const fromAddresses = msg.envelope.from ?? [];
          const fromEmail = fromAddresses[0]?.address ?? 'unknown';
          const inReplyTo = msg.envelope.inReplyTo;
          const bodyPart = msg.bodyParts?.get('text');
          const body = bodyPart !== undefined ? bodyPart.toString() : '';

          log.email('RECEIVED', {
            from: fromEmail,
            subject,
            body,
            messageId: messageId ?? 'unknown',
            inReplyTo: inReplyTo ?? 'none',
            uid: msg.uid,
          });

          // Parse the message - use In-Reply-To header for matching
          const parsed = this.parseEmail(subject, body, inReplyTo);
          log.info('Parsed email', { sessionId: parsed.sessionId, response: parsed.response, matchedBy: inReplyTo !== undefined ? 'inReplyTo' : 'subject' });
          this.messageCallback(parsed);

          // Delete after processing to avoid re-processing on restart
          await client.messageDelete({ uid: msg.uid });
          log.debug(`Deleted email uid=${String(msg.uid)}`);
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (error) {
      // Log polling errors but continue - will retry next interval
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Poll error (will retry): ${errMsg}`);

      // Try to close the connection if it exists
      if (client !== null) {
        try {
          await client.logout();
        } catch {
          // Ignore logout errors during cleanup
        }
      }
    }
  }

  /**
   * Parse an email for session ID using In-Reply-To header or subject fallback
   */
  private parseEmail(subject: string, body: string, inReplyTo?: string): ParsedSMS {
    let sessionId: string | null = null;

    // Primary: Match using In-Reply-To header (RFC 2822)
    if (inReplyTo !== undefined) {
      sessionId = sessionManager.findSessionByMessageId(inReplyTo);
      if (sessionId !== null) {
        log.debug(`Matched session ${sessionId} via In-Reply-To: ${inReplyTo}`);
      }
    }

    // Fallback: Extract session ID from [CC-xxx] prefix in subject
    if (sessionId === null) {
      const match = subject.match(/\[CC-([a-f0-9]+)\]/i);
      sessionId = match?.[1] ?? null;
      if (sessionId !== null) {
        log.debug(`Matched session ${sessionId} via subject line`);
      }
    }

    // Extract reply text - remove quoted content
    const replyText = this.extractReplyText(body);

    return {
      sessionId,
      response: replyText.trim(),
    };
  }

  /**
   * Extract just the reply text, removing MIME headers and quoted content
   */
  private extractReplyText(body: string): string {
    // First, strip MIME parts and decode
    let cleanBody = this.stripMimeContent(body);

    // Decode quoted-printable encoding
    cleanBody = this.decodeQuotedPrintable(cleanBody);

    // Now extract just the reply, removing quoted original
    const lines = cleanBody.split('\n');
    const replyLines: string[] = [];

    for (const line of lines) {
      // Stop at common quote markers
      if (line.startsWith('>')) break;
      if (line.startsWith('On ') && line.includes(' wrote:')) break;
      if (line.match(/^-{3,}/) !== null) break; // --- separator
      if (line.match(/^_{3,}/) !== null) break; // ___ separator

      replyLines.push(line);
    }

    return replyLines.join('\n').trim();
  }

  /**
   * Strip MIME boundaries and headers from email body
   */
  private stripMimeContent(body: string): string {
    const lines = body.split('\n');
    const contentLines: string[] = [];
    let inMimeHeader = false;
    let skipUntilBoundary = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip MIME boundaries
      if (trimmed.startsWith('--') && trimmed.length > 10) {
        inMimeHeader = true;
        skipUntilBoundary = false;
        continue;
      }

      // Skip MIME headers after boundary
      if (inMimeHeader) {
        if (trimmed === '') {
          inMimeHeader = false;
          continue;
        }
        if (trimmed.startsWith('Content-')) {
          // Check if this is HTML part - skip it entirely
          if (trimmed.includes('text/html')) {
            skipUntilBoundary = true;
          }
          continue;
        }
      }

      // Skip HTML content
      if (skipUntilBoundary) {
        continue;
      }

      contentLines.push(line);
    }

    return contentLines.join('\n');
  }

  /**
   * Decode quoted-printable encoded text
   */
  private decodeQuotedPrintable(text: string): string {
    return text
      // Handle soft line breaks (=\n)
      .replace(/=\r?\n/g, '')
      // Decode =XX hex sequences
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
  }

  /**
   * Stop polling for emails
   */
  stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      log.info('Stopped polling for emails');
    }
    this.messageCallback = null;
  }

  /**
   * Verify the from email matches configured recipient
   */
  verifyFromEmail(from: string): boolean {
    return from.toLowerCase().trim() === this.config.recipient.toLowerCase().trim();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopPolling();
    if (this.transporter !== null) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}
