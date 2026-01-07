/**
 * HTTP API routes for the SMS bridge server
 */
import { sessionManager } from './sessions.js';
import { stateManager } from './state.js';
const VALID_HOOK_EVENTS = new Set(['Notification', 'Stop', 'PreToolUse', 'UserPromptSubmit']);
/**
 * Type guard for HookEvent
 */
function isHookEvent(value) {
    return typeof value === 'string' && VALID_HOOK_EVENTS.has(value);
}
/** Maximum request body size (1MB) */
export const MAX_BODY_SIZE = 1024 * 1024;
/**
 * Parse JSON body
 * @throws SyntaxError if body is not valid JSON
 */
export function parseJSON(body) {
    return JSON.parse(body);
}
/**
 * Read request body with error handling and size limit
 */
export async function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        const cleanup = () => {
            req.removeListener('data', onData);
            req.removeListener('error', onError);
            req.removeListener('end', onEnd);
        };
        const onData = (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                cleanup();
                req.destroy();
                reject(new Error(`Request body exceeds size limit of ${String(MAX_BODY_SIZE)} bytes`));
                return;
            }
            body += chunk.toString();
        };
        const onError = (err) => {
            cleanup();
            reject(err);
        };
        const onEnd = () => {
            cleanup();
            resolve(body);
        };
        req.on('data', onData);
        req.on('error', onError);
        req.on('end', onEnd);
    });
}
/**
 * Send JSON response
 */
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}
/**
 * Send error response
 */
function sendError(res, statusCode, error) {
    sendJSON(res, statusCode, { error });
}
/**
 * Handle POST /api/send - Send SMS for a hook event
 */
export async function handleSendSMS(req, res, ctx) {
    const body = await readBody(req);
    let rawData;
    try {
        rawData = parseJSON(body);
    }
    catch (error) {
        const message = error instanceof SyntaxError ? error.message : 'Invalid JSON';
        sendError(res, 400, `Invalid JSON body: ${message}`);
        return;
    }
    if (typeof rawData !== 'object' || rawData === null) {
        sendError(res, 400, 'Invalid JSON body: expected object');
        return;
    }
    if (!('sessionId' in rawData) ||
        typeof rawData.sessionId !== 'string' ||
        rawData.sessionId === '') {
        sendError(res, 400, 'Missing or invalid sessionId');
        return;
    }
    if (!('event' in rawData) || !isHookEvent(rawData.event)) {
        sendError(res, 400, 'Missing or invalid event');
        return;
    }
    if (!('message' in rawData) || typeof rawData.message !== 'string' || rawData.message === '') {
        sendError(res, 400, 'Missing or invalid message');
        return;
    }
    const sessionId = rawData.sessionId;
    const event = rawData.event;
    const message = rawData.message;
    // Check if enabled
    if (!stateManager.isHookEnabled(event)) {
        sendJSON(res, 200, { sent: false, reason: 'Hook disabled' });
        return;
    }
    if (!sessionManager.hasSession(sessionId)) {
        sendJSON(res, 200, { sent: false, reason: 'Session not found' });
        return;
    }
    if (!sessionManager.isSessionEnabled(sessionId)) {
        sendJSON(res, 200, { sent: false, reason: 'Session disabled' });
        return;
    }
    // Send the SMS
    const result = ctx.messagesClient.sendHookMessage(sessionId, event, message);
    if (result.success) {
        sendJSON(res, 200, { sent: true, messageId: result.data });
    }
    else {
        sendError(res, 500, result.error);
    }
}
/**
 * Handle POST /api/session - Register session waiting for response
 */
export async function handleRegisterSession(req, res, ctx) {
    const body = await readBody(req);
    let rawData;
    try {
        rawData = parseJSON(body);
    }
    catch (error) {
        const message = error instanceof SyntaxError ? error.message : 'Invalid JSON';
        sendError(res, 400, `Invalid JSON body: ${message}`);
        return;
    }
    if (typeof rawData !== 'object' || rawData === null) {
        sendError(res, 400, 'Invalid JSON body: expected object');
        return;
    }
    if (!('sessionId' in rawData) ||
        typeof rawData.sessionId !== 'string' ||
        rawData.sessionId === '') {
        sendError(res, 400, 'Missing or invalid sessionId');
        return;
    }
    if (!('event' in rawData) || !isHookEvent(rawData.event)) {
        sendError(res, 400, 'Missing or invalid event');
        return;
    }
    if (!('prompt' in rawData) || typeof rawData.prompt !== 'string' || rawData.prompt === '') {
        sendError(res, 400, 'Missing or invalid prompt');
        return;
    }
    const sessionId = rawData.sessionId;
    const event = rawData.event;
    const prompt = rawData.prompt;
    // Check if enabled
    if (!stateManager.isHookEnabled(event)) {
        sendJSON(res, 200, { registered: false, reason: 'Hook disabled' });
        return;
    }
    // Register the session
    sessionManager.registerSession(sessionId, event, prompt);
    // Send the SMS
    const result = ctx.messagesClient.sendHookMessage(sessionId, event, prompt);
    if (result.success) {
        sendJSON(res, 200, { registered: true, messageId: result.data });
    }
    else {
        sendError(res, 500, result.error);
    }
}
/**
 * Handle GET /api/response/:sessionId - Poll for response
 */
export function handleGetResponse(_req, res, sessionId) {
    const response = sessionManager.consumeResponse(sessionId);
    if (response !== null) {
        console.log(`[api] Response delivered for session ${sessionId}`);
        sendJSON(res, 200, response);
    }
    else {
        sendJSON(res, 200, { response: null });
    }
}
/**
 * Handle POST /api/session/:id/enable - Enable session
 */
export function handleEnableSession(_req, res, sessionId) {
    if (!sessionManager.hasSession(sessionId)) {
        sendError(res, 404, `Session ${sessionId} not found`);
        return;
    }
    sessionManager.enableSession(sessionId);
    sendJSON(res, 200, { success: true });
}
/**
 * Handle POST /api/session/:id/disable - Disable session
 */
export function handleDisableSession(_req, res, sessionId) {
    if (!sessionManager.hasSession(sessionId)) {
        sendError(res, 404, `Session ${sessionId} not found`);
        return;
    }
    sessionManager.disableSession(sessionId);
    sendJSON(res, 200, { success: true });
}
/**
 * Handle GET /api/session/:id/enabled - Check if session is enabled
 */
export function handleCheckSessionEnabled(_req, res, sessionId) {
    if (!sessionManager.hasSession(sessionId)) {
        sendError(res, 404, 'Session not found');
        return;
    }
    const enabled = sessionManager.isSessionEnabled(sessionId);
    const globalEnabled = stateManager.isEnabled();
    sendJSON(res, 200, { enabled: enabled && globalEnabled });
}
/**
 * Handle POST /api/enable - Enable globally
 */
export function handleEnableGlobal(_req, res) {
    const success = stateManager.enable();
    sendJSON(res, 200, { success });
}
/**
 * Handle POST /api/disable - Disable globally
 */
export function handleDisableGlobal(_req, res) {
    const success = stateManager.disable();
    sendJSON(res, 200, { success });
}
/**
 * Handle GET /api/status - Server status
 */
export function handleStatus(_req, res, ctx) {
    const status = {
        status: 'running',
        activeSessions: sessionManager.getSessionCount(),
        pendingResponses: sessionManager.getPendingResponseCount(),
        uptime: Math.floor((Date.now() - ctx.startTime) / 1000),
        tunnelUrl: null, // No longer using tunnel
    };
    sendJSON(res, 200, status);
}
/**
 * Handle GET / - Server info
 */
export function handleRoot(_req, res) {
    sendJSON(res, 200, {
        name: 'Claude Code SMS Bridge',
        version: '0.1.0',
        backend: 'macOS Messages (imsg)',
        endpoints: [
            'POST /api/send - Send SMS for hook event',
            'POST /api/session - Register session waiting for response',
            'GET /api/response/:sessionId - Poll for SMS response',
            'POST /api/session/:id/enable - Enable session',
            'POST /api/session/:id/disable - Disable session',
            'GET /api/session/:id/enabled - Check if session enabled',
            'POST /api/enable - Enable globally',
            'POST /api/disable - Disable globally',
            'GET /api/status - Server status',
        ],
    });
}
//# sourceMappingURL=routes.js.map