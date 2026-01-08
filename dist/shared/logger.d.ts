/**
 * Application logging utility
 *
 * Writes logs to both console and file (logs/MM-DD-YY.log)
 */
interface Logger {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
    email: (action: string, details: {
        from?: string;
        to?: string;
        subject?: string;
        body?: string;
        messageId?: string;
        inReplyTo?: string;
        uid?: number;
        error?: string;
    }) => void;
}
/**
 * Create a logger for a specific component
 */
export declare function createLogger(component: string): Logger;
/**
 * Default logger instance
 */
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map