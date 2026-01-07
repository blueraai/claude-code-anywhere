/**
 * Configuration loading from environment variables
 */

import type { AppConfig, MessagesConfig, Result } from './types.js';

const DEFAULT_PORT = 3847;

/**
 * Load Messages configuration from environment variables
 */
export function loadMessagesConfig(): Result<MessagesConfig, string> {
  const userEmail = process.env['SMS_USER_EMAIL'];

  if (userEmail === undefined || userEmail === '') {
    return {
      success: false,
      error: 'Missing required environment variable: SMS_USER_EMAIL (your Apple ID email)',
    };
  }

  // Basic email validation
  if (!userEmail.includes('@') || !userEmail.includes('.')) {
    return {
      success: false,
      error: `Invalid SMS_USER_EMAIL: "${userEmail}" is not a valid email address`,
    };
  }

  return {
    success: true,
    data: {
      userEmail,
    },
  };
}

/**
 * Load full application configuration
 */
export function loadAppConfig(): Result<AppConfig, string> {
  const messagesResult = loadMessagesConfig();

  if (!messagesResult.success) {
    return messagesResult;
  }

  const portEnv = process.env['SMS_BRIDGE_PORT'];
  const port = portEnv !== undefined && portEnv !== '' ? parseInt(portEnv, 10) : DEFAULT_PORT;

  if (isNaN(port) || port < 1 || port > 65535) {
    return {
      success: false,
      error: `Invalid SMS_BRIDGE_PORT: ${portEnv ?? 'undefined'}`,
    };
  }

  const bridgeUrl = process.env['SMS_BRIDGE_URL'] ?? `http://localhost:${String(port)}`;

  return {
    success: true,
    data: {
      messages: messagesResult.data,
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
  return `${home}/.claude/claude-sms`;
}

/**
 * Get the state file path
 */
export function getStateFilePath(): string {
  return `${getStateDir()}/state.json`;
}
