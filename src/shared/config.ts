/**
 * Configuration loading from environment variables
 */

import type { AppConfig, TwilioConfig, Result } from './types.js';

const DEFAULT_PORT = 3847;
const DEFAULT_BRIDGE_URL = 'http://localhost:3847';

/**
 * Load Twilio configuration from environment variables
 */
export function loadTwilioConfig(): Result<TwilioConfig, string> {
  const accountSid = process.env['TWILIO_ACCOUNT_SID'];
  const authToken = process.env['TWILIO_AUTH_TOKEN'];
  const fromNumber = process.env['TWILIO_FROM_NUMBER'];
  const userPhone = process.env['SMS_USER_PHONE'];

  const missing: string[] = [];

  if (accountSid === undefined || accountSid === '') {
    missing.push('TWILIO_ACCOUNT_SID');
  }
  if (authToken === undefined || authToken === '') {
    missing.push('TWILIO_AUTH_TOKEN');
  }
  if (fromNumber === undefined || fromNumber === '') {
    missing.push('TWILIO_FROM_NUMBER');
  }
  if (userPhone === undefined || userPhone === '') {
    missing.push('SMS_USER_PHONE');
  }

  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required environment variables: ${missing.join(', ')}`,
    };
  }

  return {
    success: true,
    data: {
      accountSid: accountSid as string,
      authToken: authToken as string,
      fromNumber: fromNumber as string,
      userPhone: userPhone as string,
    },
  };
}

/**
 * Load full application configuration
 */
export function loadAppConfig(): Result<AppConfig, string> {
  const twilioResult = loadTwilioConfig();

  if (!twilioResult.success) {
    return twilioResult;
  }

  const portEnv = process.env['SMS_BRIDGE_PORT'];
  const port = portEnv !== undefined && portEnv !== '' ? parseInt(portEnv, 10) : DEFAULT_PORT;

  if (isNaN(port) || port < 1 || port > 65535) {
    return {
      success: false,
      error: `Invalid SMS_BRIDGE_PORT: ${portEnv ?? 'undefined'}`,
    };
  }

  const bridgeUrl = process.env['SMS_BRIDGE_URL'] ?? DEFAULT_BRIDGE_URL;

  return {
    success: true,
    data: {
      twilio: twilioResult.data,
      bridgeUrl,
      port,
    },
  };
}

/**
 * Get the state directory path
 */
export function getStateDir(): string {
  const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.';
  return `${home}/.claude/claude-sms`;
}

/**
 * Get the state file path
 */
export function getStateFilePath(): string {
  return `${getStateDir()}/state.json`;
}
