/**
 * User configuration file management
 *
 * Stores user credentials (Telegram, Email) in a JSON file at:
 * ~/.claude/claude-code-anywhere/config.json
 *
 * This is separate from state.json (which stores enabled/disabled state)
 * and is used for production deployments where .env is not available.
 */
/**
 * User configuration structure
 */
export interface UserConfig {
    telegram?: {
        botToken: string;
        chatId: string;
    };
    email?: {
        user: string;
        pass: string;
        recipient: string;
    };
}
/**
 * Get the path to the user config file
 */
export declare function getUserConfigPath(): string;
/**
 * Load user configuration from file
 * Returns empty object if file does not exist
 * Throws if file exists but contains invalid JSON
 */
export declare function loadUserConfig(): UserConfig;
/**
 * Save user configuration to file
 * Creates directory if needed
 */
export declare function saveUserConfig(config: UserConfig): void;
//# sourceMappingURL=user-config.d.ts.map