/**
 * Configuration loading from user config file and environment variables
 *
 * Priority order:
 * 1. User config file (~/.claude/claude-code-anywhere/config.json)
 * 2. Environment variables (for development/override)
 * 3. Hardcoded defaults (for operational params only)
 */
import type { AppConfig, EmailConfig, TelegramConfig, Result } from './types.js';
/**
 * Load Email configuration from user config file or environment variables
 */
export declare function loadEmailConfig(): Result<EmailConfig, string>;
/**
 * Load Telegram configuration from user config file or environment variables
 * Returns success: false if neither source has TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
 */
export declare function loadTelegramConfig(): Result<TelegramConfig, string>;
/**
 * Load full application configuration
 */
export declare function loadAppConfig(): Result<AppConfig, string>;
/**
 * Get the state directory path
 * @throws Error if neither HOME nor USERPROFILE environment variable is set
 */
export declare function getStateDir(): string;
/**
 * Get the state file path
 */
export declare function getStateFilePath(): string;
/**
 * Get the logs directory path (canonical location)
 */
export declare function getLogsDir(): string;
//# sourceMappingURL=config.d.ts.map