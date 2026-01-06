/**
 * HTTP API routes for the SMS bridge server
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { ServerStatus, HookEvent, TelnyxWebhookPayload } from '../shared/types.js';
import { sessionManager } from './sessions.js';
import { stateManager } from './state.js';
import { TelnyxClient } from './telnyx.js';
import { verifyTelnyxSignature } from './webhook-signature.js';

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
  telnyxClient: TelnyxClient;
  tunnelUrl: string | null;
  startTime: number;
  webhookPublicKey: string;
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
 * Send plain text response (for Telnyx webhook acknowledgment)
 */
function sendText(res: ServerResponse, statusCode: number, message: string): void {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
  res.end(message);
}

/**
 * Send error response
 */
function sendError(res: ServerResponse, statusCode: number, error: string): void {
  sendJSON(res, statusCode, { error });
}

/**
 * Type guard for Telnyx webhook payload
 */
function isTelnyxWebhookPayload(value: unknown): value is TelnyxWebhookPayload {
  if (typeof value !== 'object' || value === null) return false;
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false;
  const data = value.data;
  if (!('event_type' in data) || typeof data.event_type !== 'string') return false;
  if (!('payload' in data) || typeof data.payload !== 'object' || data.payload === null) return false;
  const payload = data.payload;
  if (!('from' in payload) || typeof payload.from !== 'object' || payload.from === null) return false;
  if (!('phone_number' in payload.from) || typeof payload.from.phone_number !== 'string') return false;
  if (!('text' in payload) || typeof payload.text !== 'string') return false;
  return true;
}

/**
 * Handle POST /webhook/telnyx - Incoming SMS from Telnyx
 */
export async function handleTelnyxWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  // Extract signature headers
  const signatureHeader = req.headers['telnyx-signature-ed25519'];
  const timestampHeader = req.headers['telnyx-timestamp'];

  // Read body first (needed for signature verification)
  const body = await readBody(req);

  // Verify webhook signature (fail-fast per CLAUDE.md)
  try {
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const timestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;

    if (!verifyTelnyxSignature(body, signature ?? '', timestamp ?? '', ctx.webhookPublicKey)) {
      console.warn('[webhook] Invalid webhook signature');
      sendError(res, 401, 'Invalid webhook signature');
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signature verification failed';
    console.warn(`[webhook] Signature verification error: ${message}`);
    sendError(res, 401, message);
    return;
  }

  let rawData: unknown;
  try {
    rawData = parseJSON(body);
  } catch (error) {
    console.warn('[webhook] Invalid JSON in Telnyx webhook:', error);
    sendError(res, 400, 'Invalid JSON');
    return;
  }

  if (!isTelnyxWebhookPayload(rawData)) {
    console.warn('[webhook] Invalid Telnyx webhook payload');
    sendError(res, 400, 'Invalid webhook payload');
    return;
  }

  // Only process message.received events
  if (rawData.data.event_type !== 'message.received') {
    sendText(res, 200, '');
    return;
  }

  const from = rawData.data.payload.from.phone_number;
  const messageBody = rawData.data.payload.text;

  console.log(`[webhook] SMS received from ${from}: ${messageBody}`);

  // Verify sender (optional but recommended)
  if (!ctx.telnyxClient.verifyFromNumber(from)) {
    console.warn(`[webhook] Unauthorized sender: ${from}`);
    sendText(res, 200, '');
    return;
  }

  // Parse session ID from message
  const { sessionId, response } = sessionManager.parseSessionFromSMS(messageBody);

  if (sessionId === null) {
    // Can't determine which session
    const activeIds = sessionManager.getActiveSessionIds();
    if (activeIds.length === 0) {
      await ctx.telnyxClient.sendSMS('No active Claude Code sessions.');
    } else {
      const idList = activeIds.map((id) => `CC-${id}`).join(', ');
      await ctx.telnyxClient.sendSMS(`Multiple sessions active. Reply with [CC-ID] prefix. Active: ${idList}`);
    }
    sendText(res, 200, '');
    return;
  }

  if (!sessionManager.hasSession(sessionId)) {
    const activeIds = sessionManager.getActiveSessionIds();
    if (activeIds.length === 0) {
      await ctx.telnyxClient.sendSMS(`Session CC-${sessionId} expired. No active sessions.`);
    } else {
      const idList = activeIds.map((id) => `CC-${id}`).join(', ');
      await ctx.telnyxClient.sendSMS(`❌ Session CC-${sessionId} expired or not found. Active: ${idList}`);
    }
    sendText(res, 200, '');
    return;
  }

  // Store the response
  sessionManager.storeResponse(sessionId, response, from);
  console.log(`[webhook] Response stored for session ${sessionId}`);

  await ctx.telnyxClient.sendSMS(`✓ Response received for CC-${sessionId}`);
  sendText(res, 200, '');
}

/**
 * Handle POST /api/send - Send SMS for a hook event
 */
export async function handleSendSMS(
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

  // Send the SMS
  const result = await ctx.telnyxClient.sendHookMessage(sessionId, event, message);

  if (result.success) {
    sendJSON(res, 200, { sent: true, messageId: result.data });
  } else {
    sendError(res, 500, result.error);
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

  // Send the SMS
  const result = await ctx.telnyxClient.sendHookMessage(sessionId, event, prompt);

  if (result.success) {
    sendJSON(res, 200, { registered: true, messageId: result.data });
  } else {
    sendError(res, 500, result.error);
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
    tunnelUrl: ctx.tunnelUrl,
  };
  sendJSON(res, 200, status);
}

/**
 * Handle GET / - Server info
 */
export function handleRoot(_req: IncomingMessage, res: ServerResponse): void {
  sendJSON(res, 200, {
    name: 'Claude Code SMS Bridge',
    version: '0.1.0',
    endpoints: [
      'POST /webhook/telnyx - Telnyx webhook for incoming SMS',
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
