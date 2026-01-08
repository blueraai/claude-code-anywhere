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

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Get current date formatted as MM-DD-YY
 */
function getDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${month}-${day}-${year}`;
}

/**
 * Get current timestamp formatted as HH:MM:SS.mmm
 */
function getTimestamp(): string {
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
function getLogFilePath(): string {
  return join(LOGS_DIR, `${getDateString()}.log`);
}

/**
 * Ensure logs directory exists
 */
function ensureLogsDir(): void {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Format a log message
 */
function formatMessage(
  level: LogLevel,
  component: string,
  message: string,
  data?: unknown
): string {
  const timestamp = getTimestamp();
  const dataStr = data !== undefined ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] [${level}] [${component}] ${message}${dataStr}`;
}

/**
 * Write a log entry
 */
function writeLog(level: LogLevel, component: string, message: string, data?: unknown): void {
  const formatted = formatMessage(level, component, message, data);

  // Always write to console
  if (level === 'ERROR') {
    console.error(formatted);
  } else if (level === 'WARN') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }

  // Write to file
  try {
    ensureLogsDir();
    appendFileSync(getLogFilePath(), `${formatted}\n`);
  } catch (error) {
    // Don't crash if logging fails
    console.error(`[logger] Failed to write to log file: ${String(error)}`);
  }
}

interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  email: (
    action: string,
    details: {
      from?: string;
      to?: string;
      subject?: string;
      body?: string;
      messageId?: string;
      inReplyTo?: string;
      uid?: number;
      error?: string;
    }
  ) => void;
}

/**
 * Create a logger for a specific component
 */
export function createLogger(component: string): Logger {
  return {
    debug: (message: string, data?: unknown): void => {
      writeLog('DEBUG', component, message, data);
    },
    info: (message: string, data?: unknown): void => {
      writeLog('INFO', component, message, data);
    },
    warn: (message: string, data?: unknown): void => {
      writeLog('WARN', component, message, data);
    },
    error: (message: string, data?: unknown): void => {
      writeLog('ERROR', component, message, data);
    },
    email: (
      action: string,
      details: {
        from?: string;
        to?: string;
        subject?: string;
        body?: string;
        messageId?: string;
        inReplyTo?: string;
        uid?: number;
        error?: string;
      }
    ): void => {
      writeLog('INFO', component, `EMAIL ${action}`, details);
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger('app');
