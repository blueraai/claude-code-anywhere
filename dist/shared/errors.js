/**
 * Custom error classes for configuration and validation errors
 */
/**
 * Base class for configuration errors
 */
export class ConfigError extends Error {
    field;
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ConfigError';
    }
}
/**
 * Error thrown when Telegram configuration is missing or invalid
 */
export class TelegramConfigError extends ConfigError {
    constructor(field) {
        super(`Telegram ${field} missing. Set in ~/.claude/claude-code-anywhere/config.json`, field);
        this.name = 'TelegramConfigError';
    }
}
/**
 * Error thrown when Email configuration is missing or invalid
 */
export class EmailConfigError extends ConfigError {
    constructor(field) {
        super(`Email ${field} missing. Set in ~/.claude/claude-code-anywhere/config.json`, field);
        this.name = 'EmailConfigError';
    }
}
/**
 * Error thrown when a required configuration field is missing
 */
export class MissingConfigError extends ConfigError {
    constructor(field) {
        super(`Missing required config: ${field}`, field);
        this.name = 'MissingConfigError';
    }
}
/**
 * Error thrown when state file is invalid or corrupted
 */
export class StateError extends Error {
    path;
    constructor(message, path) {
        super(`${message} at ${path}`);
        this.path = path;
        this.name = 'StateError';
    }
}
/**
 * Error thrown when a session does not exist
 */
export class SessionError extends Error {
    sessionId;
    constructor(sessionId) {
        super(`Session ${sessionId} does not exist`);
        this.sessionId = sessionId;
        this.name = 'SessionError';
    }
}
/**
 * Error thrown for channel-related issues
 */
export class ChannelError extends Error {
    channel;
    constructor(message, channel) {
        super(message);
        this.channel = channel;
        this.name = 'ChannelError';
    }
}
/**
 * Base class for API errors
 */
export class ApiError extends Error {
    service;
    constructor(message, service) {
        super(message);
        this.service = service;
        this.name = 'ApiError';
    }
}
/**
 * Error thrown for Telegram API failures
 */
export class TelegramApiError extends ApiError {
    constructor(message) {
        super(message, 'telegram');
        this.name = 'TelegramApiError';
    }
}
/**
 * Error thrown for Email API failures
 */
export class EmailApiError extends ApiError {
    constructor(message) {
        super(message, 'email');
        this.name = 'EmailApiError';
    }
}
/**
 * Error thrown for server-related issues
 */
export class ServerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ServerError';
    }
}
/**
 * Error thrown for invalid data or validation failures
 */
export class ValidationError extends Error {
    field;
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
//# sourceMappingURL=errors.js.map