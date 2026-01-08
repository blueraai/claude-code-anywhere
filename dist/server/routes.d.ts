/**
 * HTTP API routes for the notification bridge server
 */
import type { ChannelManager } from './channels.js';
import type { IncomingMessage, ServerResponse } from 'http';
/**
 * Route handler context
 */
export interface RouteContext {
    channelManager: ChannelManager;
    startTime: number;
}
/** Maximum request body size (1MB) */
export declare const MAX_BODY_SIZE: number;
/**
 * Parse JSON body
 * @throws SyntaxError if body is not valid JSON
 */
export declare function parseJSON(body: string): unknown;
/**
 * Read request body with error handling and size limit
 */
export declare function readBody(req: IncomingMessage): Promise<string>;
/**
 * Handle POST /api/send - Send email for a hook event
 */
export declare function handleSendEmail(req: IncomingMessage, res: ServerResponse, ctx: RouteContext): Promise<void>;
/**
 * Handle POST /api/session - Register session waiting for response
 */
export declare function handleRegisterSession(req: IncomingMessage, res: ServerResponse, ctx: RouteContext): Promise<void>;
/**
 * Handle GET /api/response/:sessionId - Poll for response
 */
export declare function handleGetResponse(_req: IncomingMessage, res: ServerResponse, sessionId: string): void;
/**
 * Handle POST /api/session/:id/enable - Enable session
 */
export declare function handleEnableSession(_req: IncomingMessage, res: ServerResponse, sessionId: string): void;
/**
 * Handle POST /api/session/:id/disable - Disable session
 */
export declare function handleDisableSession(_req: IncomingMessage, res: ServerResponse, sessionId: string): void;
/**
 * Handle GET /api/session/:id/enabled - Check if session is enabled
 */
export declare function handleCheckSessionEnabled(_req: IncomingMessage, res: ServerResponse, sessionId: string): void;
/**
 * Handle POST /api/enable - Enable globally
 */
export declare function handleEnableGlobal(_req: IncomingMessage, res: ServerResponse): void;
/**
 * Handle POST /api/disable - Disable globally
 */
export declare function handleDisableGlobal(_req: IncomingMessage, res: ServerResponse): void;
/**
 * Handle GET /api/status - Server status
 */
export declare function handleStatus(_req: IncomingMessage, res: ServerResponse, ctx: RouteContext): void;
/**
 * Handle GET / - Server info
 */
export declare function handleRoot(_req: IncomingMessage, res: ServerResponse): void;
//# sourceMappingURL=routes.d.ts.map