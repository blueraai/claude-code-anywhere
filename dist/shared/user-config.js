/**
 * User configuration file management
 *
 * Stores user credentials (Telegram, Email) in a JSON file at:
 * ~/.claude/claude-code-anywhere/config.json
 *
 * This is separate from state.json (which stores enabled/disabled state)
 * and is used for production deployments where .env is not available.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getStateDir } from './config.js';
/**
 * Get the path to the user config file
 */
export function getUserConfigPath() {
    return `${getStateDir()}/config.json`;
}
/**
 * Type guard to check if value is a record
 */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Validate and extract telegram config from parsed object
 */
function extractTelegramConfig(obj) {
    const telegram = obj['telegram'];
    if (!isRecord(telegram)) {
        return undefined;
    }
    const botToken = telegram['botToken'];
    const chatId = telegram['chatId'];
    if (typeof botToken === 'string' && typeof chatId === 'string') {
        return { botToken, chatId };
    }
    return undefined;
}
/**
 * Validate and extract email config from parsed object
 */
function extractEmailConfig(obj) {
    const email = obj['email'];
    if (!isRecord(email)) {
        return undefined;
    }
    const user = email['user'];
    const pass = email['pass'];
    const recipient = email['recipient'];
    if (typeof user === 'string' && typeof pass === 'string' && typeof recipient === 'string') {
        return { user, pass, recipient };
    }
    return undefined;
}
/**
 * Load user configuration from file
 * Returns empty object if file does not exist
 * Throws if file exists but contains invalid JSON
 */
export function loadUserConfig() {
    const configPath = getUserConfigPath();
    if (!existsSync(configPath)) {
        return {};
    }
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    // Basic validation - must be an object
    if (!isRecord(parsed)) {
        throw new Error(`Invalid config file: expected object, got ${typeof parsed}`);
    }
    const config = {};
    const telegram = extractTelegramConfig(parsed);
    if (telegram !== undefined) {
        config.telegram = telegram;
    }
    const email = extractEmailConfig(parsed);
    if (email !== undefined) {
        config.email = email;
    }
    return config;
}
/**
 * Save user configuration to file
 * Creates directory if needed
 */
export function saveUserConfig(config) {
    const configPath = getUserConfigPath();
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2));
}
//# sourceMappingURL=user-config.js.map