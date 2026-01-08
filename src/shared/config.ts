/**
 * Configuration loading from environment variables
 */

import type { AppConfig, EmailConfig, TelegramConfig, Result } from './types.js';
import {
  DEFAULT_BRIDGE_PORT,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  DEFAULT_IMAP_HOST,
  DEFAULT_IMAP_PORT,
  DEFAULT_EMAIL_POLL_INTERVAL_MS,
} from './constants.js';

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}

/**
 * Load Email configuration from environment variables
 */
export function loadEmailConfig(): Result<EmailConfig, string> {
  const user = process.env['EMAIL_USER'];
  const pass = process.env['EMAIL_PASS'];
  const recipient = process.env['EMAIL_RECIPIENT'];

  if (user === undefined || user === '') {
    return {
      success: false,
      error: 'Missing required environment variable: EMAIL_USER (Gmail address for Claude)',
    };
  }

  if (!isValidEmail(user)) {
    return {
      success: false,
      error: `Invalid EMAIL_USER: "${user}" is not a valid email address`,
    };
  }

  if (pass === undefined || pass === '') {
    return {
      success: false,
      error: 'Missing required environment variable: EMAIL_PASS (Gmail app password)',
    };
  }

  if (recipient === undefined || recipient === '') {
    return {
      success: false,
      error: 'Missing required environment variable: EMAIL_RECIPIENT (your email address)',
    };
  }

  if (!isValidEmail(recipient)) {
    return {
      success: false,
      error: `Invalid EMAIL_RECIPIENT: "${recipient}" is not a valid email address`,
    };
  }

  // SMTP settings with defaults
  const smtpHostEnv = process.env['SMTP_HOST'];
  const smtpHost = smtpHostEnv !== undefined && smtpHostEnv !== '' ? smtpHostEnv : DEFAULT_SMTP_HOST;

  const smtpPortEnv = process.env['SMTP_PORT'];
  const smtpPort =
    smtpPortEnv !== undefined && smtpPortEnv !== '' ? parseInt(smtpPortEnv, 10) : DEFAULT_SMTP_PORT;

  if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return {
      success: false,
      error: `Invalid SMTP_PORT: ${smtpPortEnv ?? 'undefined'}`,
    };
  }

  // IMAP settings with defaults
  const imapHostEnv = process.env['IMAP_HOST'];
  const imapHost = imapHostEnv !== undefined && imapHostEnv !== '' ? imapHostEnv : DEFAULT_IMAP_HOST;

  const imapPortEnv = process.env['IMAP_PORT'];
  const imapPort =
    imapPortEnv !== undefined && imapPortEnv !== '' ? parseInt(imapPortEnv, 10) : DEFAULT_IMAP_PORT;

  if (isNaN(imapPort) || imapPort < 1 || imapPort > 65535) {
    return {
      success: false,
      error: `Invalid IMAP_PORT: ${imapPortEnv ?? 'undefined'}`,
    };
  }

  // Poll interval with default
  const pollIntervalEnv = process.env['EMAIL_POLL_INTERVAL_MS'];
  const pollIntervalMs =
    pollIntervalEnv !== undefined && pollIntervalEnv !== ''
      ? parseInt(pollIntervalEnv, 10)
      : DEFAULT_EMAIL_POLL_INTERVAL_MS;

  if (isNaN(pollIntervalMs) || pollIntervalMs < 1000) {
    return {
      success: false,
      error: `Invalid EMAIL_POLL_INTERVAL_MS: ${pollIntervalEnv ?? 'undefined'} (minimum 1000ms)`,
    };
  }

  return {
    success: true,
    data: {
      user,
      pass,
      recipient,
      smtpHost,
      smtpPort,
      imapHost,
      imapPort,
      pollIntervalMs,
    },
  };
}

/**
 * Load Telegram configuration from environment variables
 * Returns success: false if TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing
 */
export function loadTelegramConfig(): Result<TelegramConfig, string> {
  const botToken = process.env['TELEGRAM_BOT_TOKEN'];
  const chatId = process.env['TELEGRAM_CHAT_ID'];

  if (botToken === undefined || botToken === '') {
    return {
      success: false,
      error: 'Missing required environment variable: TELEGRAM_BOT_TOKEN',
    };
  }

  if (chatId === undefined || chatId === '') {
    return {
      success: false,
      error: 'Missing required environment variable: TELEGRAM_CHAT_ID',
    };
  }

  return {
    success: true,
    data: {
      botToken,
      chatId,
    },
  };
}

/**
 * Load full application configuration
 */
export function loadAppConfig(): Result<AppConfig, string> {
  const emailResult = loadEmailConfig();

  if (!emailResult.success) {
    return emailResult;
  }

  const portEnv = process.env['BRIDGE_PORT'];
  const port =
    portEnv !== undefined && portEnv !== '' ? parseInt(portEnv, 10) : DEFAULT_BRIDGE_PORT;

  if (isNaN(port) || port < 1 || port > 65535) {
    return {
      success: false,
      error: `Invalid BRIDGE_PORT: ${portEnv ?? 'undefined'}`,
    };
  }

  const bridgeUrl = process.env['BRIDGE_URL'] ?? `http://localhost:${String(port)}`;

  return {
    success: true,
    data: {
      email: emailResult.data,
      bridgeUrl,
      port,
    },
  };
}

/**
 * Get the state directory path
 * @throws Error if neither HOME nor USERPROFILE environment variable is set
 */
export function getStateDir(): string {
  const home = process.env['HOME'] ?? process.env['USERPROFILE'];
  if (home === undefined) {
    throw new Error(
      'Cannot determine home directory: neither HOME nor USERPROFILE environment variable is set'
    );
  }
  return `${home}/.claude/claude-code-anywhere`;
}

/**
 * Get the state file path
 */
export function getStateFilePath(): string {
  return `${getStateDir()}/state.json`;
}
