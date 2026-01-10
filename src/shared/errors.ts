/**
 * Custom error classes for configuration and validation errors
 */

/**
 * Base class for configuration errors
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Error thrown when Telegram configuration is missing or invalid
 */
export class TelegramConfigError extends ConfigError {
  constructor(field: string) {
    super(`Telegram ${field} missing. Set in ~/.claude/claude-code-anywhere/config.json`, field);
    this.name = 'TelegramConfigError';
  }
}

/**
 * Error thrown when Email configuration is missing or invalid
 */
export class EmailConfigError extends ConfigError {
  constructor(field: string) {
    super(`Email ${field} missing. Set in ~/.claude/claude-code-anywhere/config.json`, field);
    this.name = 'EmailConfigError';
  }
}

/**
 * Error thrown when a required configuration field is missing
 */
export class MissingConfigError extends ConfigError {
  constructor(field: string) {
    super(`Missing required config: ${field}`, field);
    this.name = 'MissingConfigError';
  }
}

/**
 * Error thrown when state file is invalid or corrupted
 */
export class StateError extends Error {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(`${message} at ${path}`);
    this.name = 'StateError';
  }
}

/**
 * Error thrown when a session does not exist
 */
export class SessionError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Session ${sessionId} does not exist`);
    this.name = 'SessionError';
  }
}

/**
 * Error thrown for channel-related issues
 */
export class ChannelError extends Error {
  constructor(
    message: string,
    public readonly channel?: string
  ) {
    super(message);
    this.name = 'ChannelError';
  }
}

/**
 * Base class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly service: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error thrown for Telegram API failures
 */
export class TelegramApiError extends ApiError {
  constructor(message: string) {
    super(message, 'telegram');
    this.name = 'TelegramApiError';
  }
}

/**
 * Error thrown for Email API failures
 */
export class EmailApiError extends ApiError {
  constructor(message: string) {
    super(message, 'email');
    this.name = 'EmailApiError';
  }
}

/**
 * Error thrown for server-related issues
 */
export class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

/**
 * Error thrown for invalid data or validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
