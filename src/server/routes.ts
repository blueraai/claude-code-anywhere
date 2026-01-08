/**
 * HTTP API routes for the notification bridge server
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { ServerStatus, HookEvent } from '../shared/types.js';
import { sessionManager } from './sessions.js';
import { stateManager } from './state.js';
import type { ChannelManager } from './channels.js';
import packageJson from '../../package.json' with { type: 'json' };

const VALID_HOOK_EVENTS = new Set<string>(['Notification', 'Stop', 'PreToolUse', 'UserPromptSubmit']);

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
  const result = await ctx.channelManager.sendToAll({
    sessionId,
    event,
    title: `[CC-${sessionId.slice(0, 6)}] ${event}`,
    message,
  });

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

  // Check if enabled
  if (!stateManager.isHookEnabled(event)) {
    sendJSON(res, 200, { registered: false, reason: 'Hook disabled' });
    return;
  }

  // Register the session
  sessionManager.registerSession(sessionId, event, prompt);

  // Send to all channels
  const result = await ctx.channelManager.sendToAll({
    sessionId,
    event,
    title: `[CC-${sessionId.slice(0, 6)}] ${event}`,
    message: prompt,
  });

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
    console.log(`[api] Response delivered for session ${sessionId}`);
    sendJSON(res, 200, response);
  } else {
    sendJSON(res, 200, { response: null });
  }
}

/**
 * Handle POST /api/session/:id/enable - Enable session
 */
export function handleEnableSession(
  _req: IncomingMessage,
  res: ServerResponse,
  sessionId: string
): void {
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
 * Handle GET /api/session/:id/enabled - Check if session is enabled
 */
export function handleCheckSessionEnabled(
  _req: IncomingMessage,
  res: ServerResponse,
  sessionId: string
): void {
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
 * Handle GET /api/status - Server status
 */
export function handleStatus(_req: IncomingMessage, res: ServerResponse, ctx: RouteContext): void {
  const status: ServerStatus = {
    status: 'running',
    activeSessions: sessionManager.getSessionCount(),
    pendingResponses: sessionManager.getPendingResponseCount(),
    uptime: Math.floor((Date.now() - ctx.startTime) / 1000),
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
      'POST /api/send - Send email for hook event',
      'POST /api/session - Register session waiting for response',
      'GET /api/response/:sessionId - Poll for email response',
      'POST /api/session/:id/enable - Enable session',
      'POST /api/session/:id/disable - Disable session',
      'GET /api/session/:id/enabled - Check if session enabled',
      'POST /api/enable - Enable globally',
      'POST /api/disable - Disable globally',
      'GET /api/status - Server status',
    ],
  });
}
