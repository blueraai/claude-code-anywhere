/**
 * Custom error classes for configuration and validation errors
 */
/**
 * Base class for configuration errors
 */
export declare class ConfigError extends Error {
    readonly field: string;
    constructor(message: string, field: string);
}
/**
 * Error thrown when Telegram configuration is missing or invalid
 */
export declare class TelegramConfigError extends ConfigError {
    constructor(field: string);
}
/**
 * Error thrown when Email configuration is missing or invalid
 */
export declare class EmailConfigError extends ConfigError {
    constructor(field: string);
}
/**
 * Error thrown when a required configuration field is missing
 */
export declare class MissingConfigError extends ConfigError {
    constructor(field: string);
}
//# sourceMappingURL=errors.d.ts.map