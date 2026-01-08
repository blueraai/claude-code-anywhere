/**
 * Application logging utility
 *
 * Writes logs to both console and file (logs/MM-DD-YY.log)
 */
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = join(__dirname, '../../logs');
/**
 * Get current date formatted as MM-DD-YY
 */
function getDateString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `${month}-${day}-${year}`;
}
/**
 * Get current timestamp formatted as HH:MM:SS.mmm
 */
function getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
}
/**
 * Get the log file path for today
 */
function getLogFilePath() {
    return join(LOGS_DIR, `${getDateString()}.log`);
}
/**
 * Ensure logs directory exists
 */
function ensureLogsDir() {
    if (!existsSync(LOGS_DIR)) {
        mkdirSync(LOGS_DIR, { recursive: true });
    }
}
/**
 * Format a log message
 */
function formatMessage(level, component, message, data) {
    const timestamp = getTimestamp();
    const dataStr = data !== undefined ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${level}] [${component}] ${message}${dataStr}`;
}
/**
 * Write a log entry
 */
function writeLog(level, component, message, data) {
    const formatted = formatMessage(level, component, message, data);
    // Always write to console
    if (level === 'ERROR') {
        console.error(formatted);
    }
    else if (level === 'WARN') {
        console.warn(formatted);
    }
    else {
        console.log(formatted);
    }
    // Write to file
    try {
        ensureLogsDir();
        appendFileSync(getLogFilePath(), `${formatted}\n`);
    }
    catch (error) {
        // Don't crash if logging fails
        console.error(`[logger] Failed to write to log file: ${String(error)}`);
    }
}
/**
 * Create a logger for a specific component
 */
export function createLogger(component) {
    return {
        debug: (message, data) => {
            writeLog('DEBUG', component, message, data);
        },
        info: (message, data) => {
            writeLog('INFO', component, message, data);
        },
        warn: (message, data) => {
            writeLog('WARN', component, message, data);
        },
        error: (message, data) => {
            writeLog('ERROR', component, message, data);
        },
        email: (action, details) => {
            writeLog('INFO', component, `EMAIL ${action}`, details);
        },
    };
}
/**
 * Default logger instance
 */
export const logger = createLogger('app');
//# sourceMappingURL=logger.js.map