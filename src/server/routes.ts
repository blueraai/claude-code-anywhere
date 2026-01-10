/**
 * HTTP API routes for the notification bridge server
 */

import { sessionManager } from './sessions.js';
import { stateManager } from './state.js';
import packageJson from '../../package.json' with { type: 'json' };
import { createLogger } from '../shared/logger.js';
import type { ChannelManager } from './channels.js';
import type { ServerStatus, HookEvent } from '../shared/types.js';
import type { IncomingMessage, ServerResponse } from 'http';

const log = createLogger('routes');

const VALID_HOOK_EVENTS = new Set<string>([
  'Notification',
  'Stop',
  'PreToolUse',
  'UserPromptSubmit',
  'ResponseSync',
]);

/**
 * Type guard for HookEvent
 */
function isHookEvent(value: unknown): value is HookEvent {
  return typeof value === 'string' && VALID_HOOK_EVENTS.has(value);
}

/**
 * Route handler context
 */
export interface RouteContext {
  channelManager: ChannelManager;
  startTime: number;
}

/** Maximum request body size (1MB) */
export const MAX_BODY_SIZE = 1024 * 1024;

/**
 * Parse JSON body
 * @throws SyntaxError if body is not valid JSON
 */
export function parseJSON(body: string): unknown {
  return JSON.parse(body);
}

/**
 * Read request body with error handling and size limit
 */
export async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    const cleanup = (): void => {
      req.removeListener('data', onData);
      req.removeListener('error', onError);
      req.removeListener('end', onEnd);
    };

    const onData = (chunk: Buffer): void => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        cleanup();
        req.destroy();
        reject(new Error(`Request body exceeds size limit of ${String(MAX_BODY_SIZE)} bytes`));
        return;
      }
      body += chunk.toString();
    };

    const onError = (err: Error): void => {
      cleanup();
      reject(err);
    };

    const onEnd = (): void => {
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
function sendJSON(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
function sendError(res: ServerResponse, statusCode: number, error: string): void {
  sendJSON(res, statusCode, { error });
}

/**
 * Handle POST /api/send - Send email for a hook event
 */
export async function handleSendEmail(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const body = await readBody(req);

  let rawData: unknown;
  try {
    rawData = parseJSON(body);
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : 'Invalid JSON';
    sendError(res, 400, `Invalid JSON body: ${message}`);
    return;
  }

  if (typeof rawData !== 'object' || rawData === null) {
    sendError(res, 400, 'Invalid JSON body: expected object');
    return;
  }

  if (
    !('sessionId' in rawData) ||
    typeof rawData.sessionId !== 'string' ||
    rawData.sessionId === ''
  ) {
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

  // Send to all channels
  let result;
  try {
    result = await ctx.channelManager.sendToAll({
      sessionId,
      event,
      title: `[CC-${sessionId.slice(0, 6)}] ${event}`,
      message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, message);
    return;
  }

  if (result.successCount > 0) {
    // Store first successful message ID for reply matching
    for (const [, channelResult] of result.results) {
      if (channelResult.success) {
        sessionManager.storeMessageId(sessionId, channelResult.data);
        break;
      }
    }
    sendJSON(res, 200, { sent: true, channels: result.successCount });
  } else {
    sendError(res, 500, 'All channels failed to send');
  }
}

/**
 * Handle POST /api/session - Register session waiting for response
 */
export async function handleRegisterSession(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const body = await readBody(req);

  let rawData: unknown;
  try {
    rawData = parseJSON(body);
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : 'Invalid JSON';
    sendError(res, 400, `Invalid JSON body: ${message}`);
    return;
  }

  if (typeof rawData !== 'object' || rawData === null) {
    sendError(res, 400, 'Invalid JSON body: expected object');
    return;
  }

  if (
    !('sessionId' in rawData) ||
    typeof rawData.sessionId !== 'string' ||
    rawData.sessionId === ''
  ) {
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

  // Check if specific hook type is enabled (e.g., PreToolUse, Stop, etc.)
  if (!stateManager.isSpecificHookEnabled(event)) {
    sendJSON(res, 200, { registered: false, reason: 'Hook disabled' });
    return;
  }

  // Check if notifications are active for this session (global OR session-specific)
  // This matches the logic in /api/active endpoint
  const globalEnabled = stateManager.isEnabled();
  const sessionEnabled =
    sessionManager.hasSession(sessionId) && sessionManager.isSessionEnabled(sessionId);

  if (!globalEnabled && !sessionEnabled) {
    sendJSON(res, 200, { registered: false, reason: 'Notifications not active' });
    return;
  }

  // Register the session
  sessionManager.registerSession(sessionId, event, prompt);

  // Send to all channels
  let result;
  try {
    result = await ctx.channelManager.sendToAll({
      sessionId,
      event,
      title: `[CC-${sessionId.slice(0, 6)}] ${event}`,
      message: prompt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, errorMessage);
    return;
  }

  if (result.successCount > 0) {
    // Store first successful message ID for reply matching
    for (const [, channelResult] of result.results) {
      if (channelResult.success) {
        sessionManager.storeMessageId(sessionId, channelResult.data);
        break;
      }
    }
    sendJSON(res, 200, { registered: true, channels: result.successCount });
  } else {
    sendError(res, 500, 'All channels failed to send');
  }
}

/**
 * Handle GET /api/response/:sessionId - Poll for response
 */
export function handleGetResponse(
  _req: IncomingMessage,
  res: ServerResponse,
  sessionId: string
): void {
  const response = sessionManager.consumeResponse(sessionId);

  if (response !== null) {
    log.info(`Response delivered for session ${sessionId}`);
    sendJSON(res, 200, response);
  } else {
    sendJSON(res, 200, { response: null });
  }
}

/**
 * Handle POST /api/session/:id/enable - Enable session
 * Auto-creates session if it doesn't exist
 */
export function handleEnableSession(
  _req: IncomingMessage,
  res: ServerResponse,
  sessionId: string
): void {
  // enableSession auto-creates if needed
  sessionManager.enableSession(sessionId);
  sendJSON(res, 200, { success: true });
}

/**
 * Handle POST /api/session/:id/disable - Disable session
 */
export function handleDisableSession(
  _req: IncomingMessage,
  res: ServerResponse,
  sessionId: string
): void {
  if (!sessionManager.hasSession(sessionId)) {
    sendError(res, 404, `Session ${sessionId} not found`);
    return;
  }
  sessionManager.disableSession(sessionId);
  sendJSON(res, 200, { success: true });
}

/**
 * Handle POST /api/enable - Enable globally
 */
export function handleEnableGlobal(_req: IncomingMessage, res: ServerResponse): void {
  const success = stateManager.enable();
  sendJSON(res, 200, { success });
}

/**
 * Handle POST /api/disable - Disable globally
 */
export function handleDisableGlobal(_req: IncomingMessage, res: ServerResponse): void {
  const success = stateManager.disable();
  sendJSON(res, 200, { success });
}

/**
 * Handle GET /api/active - Check if notifications are active for a session
 * Returns active: true if global is enabled OR if the specific session is enabled
 */
export function handleCheckActive(
  _req: IncomingMessage,
  res: ServerResponse,
  sessionId: string
): void {
  // If global is enabled, always active
  if (stateManager.isEnabled()) {
    sendJSON(res, 200, { active: true });
    return;
  }

  // If no session ID or session doesn't exist, not active
  if (!sessionId || !sessionManager.hasSession(sessionId)) {
    sendJSON(res, 200, { active: false });
    return;
  }

  // Check session-specific enabled state
  const active = sessionManager.isSessionEnabled(sessionId);
  sendJSON(res, 200, { active });
}

/**
 * Handle GET /api/status - Server status
 */
export function handleStatus(_req: IncomingMessage, res: ServerResponse, ctx: RouteContext): void {
  const status: ServerStatus = {
    status: 'running',
    activeSessions: sessionManager.getSessionCount(),
    pendingResponses: sessionManager.getPendingResponseCount(),
    uptime: Math.floor((Date.now() - ctx.startTime) / 1000),
    channels: ctx.channelManager.getAllStatus(),
  };
  sendJSON(res, 200, status);
}

/**
 * Handle GET / - Server info
 */
export function handleRoot(_req: IncomingMessage, res: ServerResponse): void {
  sendJSON(res, 200, {
    name: 'Claude Code Anywhere',
    version: packageJson.version,
    endpoints: [
      'POST /api/send - Send notification for hook event',
      'POST /api/session - Register session waiting for response',
      'GET /api/response/:sessionId - Poll for response',
      'POST /api/session/:id/enable - Enable session',
      'POST /api/session/:id/disable - Disable session',
      'POST /api/enable - Enable globally',
      'POST /api/disable - Disable globally',
      'GET /api/active?sessionId=xxx - Check if active for session',
      'GET /api/status - Server status',
    ],
  });
}
