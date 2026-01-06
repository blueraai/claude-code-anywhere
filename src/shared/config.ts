/**
 * Configuration loading from environment variables
 */

import type { AppConfig, TelnyxConfig, Result } from './types.js';

const DEFAULT_PORT = 3847;

/**
 * Load Telnyx configuration from environment variables
 */
export function loadTelnyxConfig(): Result<TelnyxConfig, string> {
  const apiKey = process.env['TELNYX_API_KEY'];
  const fromNumber = process.env['TELNYX_FROM_NUMBER'];
  const userPhone = process.env['SMS_USER_PHONE'];
  const webhookPublicKey = process.env['TELNYX_WEBHOOK_PUBLIC_KEY'];

  const missing: string[] = [];

  if (apiKey === undefined || apiKey === '') {
    missing.push('TELNYX_API_KEY');
  }
  if (fromNumber === undefined || fromNumber === '') {
    missing.push('TELNYX_FROM_NUMBER');
  }
  if (userPhone === undefined || userPhone === '') {
    missing.push('SMS_USER_PHONE');
  }
  if (webhookPublicKey === undefined || webhookPublicKey === '') {
    missing.push('TELNYX_WEBHOOK_PUBLIC_KEY');
  }

  if (
    apiKey === undefined ||
    apiKey === '' ||
    fromNumber === undefined ||
    fromNumber === '' ||
    userPhone === undefined ||
    userPhone === '' ||
    webhookPublicKey === undefined ||
    webhookPublicKey === ''
  ) {
    return {
      success: false,
      error: `Missing required environment variables: ${missing.join(', ')}`,
    };
  }

  return {
    success: true,
    data: {
      apiKey,
      fromNumber,
      userPhone,
      webhookPublicKey,
    },
  };
}

/**
 * Load full application configuration
 */
export function loadAppConfig(): Result<AppConfig, string> {
  const telnyxResult = loadTelnyxConfig();

  if (!telnyxResult.success) {
    return telnyxResult;
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
      telnyx: telnyxResult.data,
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
