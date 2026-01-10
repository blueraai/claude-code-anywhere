/**
 * Application logging utility
 *
 * Writes logs to both console and file (logs/YY-MM-DD.log)
 * Implements size-based rotation (default 10MB, keeps 5 rotated files)
 */

import {
  appendFileSync,
  mkdirSync,
  existsSync,
  statSync,
  renameSync,
  unlinkSync,
  readdirSync,
} from 'fs';
import { join } from 'path';
import { getLogsDir } from './config.js';

const LOGS_DIR = getLogsDir();

/** Maximum log file size in bytes (default 10MB, override with LOG_MAX_SIZE_MB env var) */
const MAX_LOG_SIZE = parseInt(process.env['LOG_MAX_SIZE_MB'] ?? '10', 10) * 1024 * 1024;

/** Number of rotated log files to keep (default 5, override with LOG_MAX_ROTATED_FILES env var) */
const MAX_ROTATED_FILES = parseInt(process.env['LOG_MAX_ROTATED_FILES'] ?? '5', 10);

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Get current date formatted as YY-MM-DD
 */
function getDateString(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
 * Rotate log file if it exceeds MAX_LOG_SIZE
 * Creates numbered backups: file.log.1, file.log.2, etc.
 * Keeps only MAX_ROTATED_FILES rotated files
 */
function rotateLogIfNeeded(logPath: string): void {
  if (!existsSync(logPath)) {
    return;
  }

  const stats = statSync(logPath);
  if (stats.size < MAX_LOG_SIZE) {
    return;
  }

  // Rotate existing backups (shift numbers up)
  for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
    const oldPath = `${logPath}.${String(i)}`;
    const newPath = `${logPath}.${String(i + 1)}`;
    if (existsSync(oldPath)) {
      if (i === MAX_ROTATED_FILES - 1) {
        // Delete oldest backup
        unlinkSync(oldPath);
      } else {
        renameSync(oldPath, newPath);
      }
    }
  }

  // Move current log to .1
  renameSync(logPath, `${logPath}.1`);
}

/**
 * Clean up old rotated log files beyond MAX_ROTATED_FILES
 */
function cleanupOldLogs(): void {
  if (!existsSync(LOGS_DIR)) {
    return;
  }

  const files = readdirSync(LOGS_DIR);
  const rotatedPattern = /^(\d{2}-\d{2}-\d{2})\.log\.(\d+)$/;

  // Group rotated files by base name
  const rotatedByBase = new Map<string, number[]>();
  for (const file of files) {
    const match = rotatedPattern.exec(file);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      const base = match[1];
      const num = parseInt(match[2], 10);
      const existing = rotatedByBase.get(base) ?? [];
      existing.push(num);
      rotatedByBase.set(base, existing);
    }
  }

  // Delete excess rotated files for each base
  for (const [base, nums] of rotatedByBase) {
    nums.sort((a, b) => b - a); // Descending order
    for (let i = MAX_ROTATED_FILES; i < nums.length; i++) {
      const filePath = join(LOGS_DIR, `${base}.log.${String(nums[i])}`);
      unlinkSync(filePath);
    }
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

  // Write to file (fail fast if logging fails)
  ensureLogsDir();
  const logPath = getLogFilePath();

  // Rotate if file exceeds size limit
  rotateLogIfNeeded(logPath);

  // Write the log entry
  appendFileSync(logPath, `${formatted}\n`);

  // Periodically clean up old rotated files (1% chance per write to avoid overhead)
  if (Math.random() < 0.01) {
    cleanupOldLogs();
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
