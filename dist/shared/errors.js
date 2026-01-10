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
//# sourceMappingURL=errors.js.map