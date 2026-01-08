import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';
import type { RouteContext } from '../src/server/routes.js';

// Mock the modules before importing the routes
vi.mock('../src/server/sessions.js', () => ({
  sessionManager: {
    hasSession: vi.fn(),
    isSessionEnabled: vi.fn(),
    enableSession: vi.fn(),
    disableSession: vi.fn(),
    registerSession: vi.fn(),
    storeMessageId: vi.fn(),
    consumeResponse: vi.fn(),
    getSessionCount: vi.fn(),
    getPendingResponseCount: vi.fn(),
  },
}));

vi.mock('../src/server/state.js', () => ({
  stateManager: {
    isHookEnabled: vi.fn(),
    isEnabled: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
}));

// Create a mock request that emits events
function createMockRequest(
  headers: Record<string, string | string[]> = {}
): IncomingMessage & EventEmitter {
  const req = new EventEmitter() as IncomingMessage &
    EventEmitter & { destroy: () => void; headers: Record<string, string | string[]> };
  req.destroy = vi.fn();
  req.headers = headers;
  return req;
}

// Create a mock response that captures writes
function createMockResponse(): ServerResponse & {
  _statusCode: number;
  _headers: Record<string, string>;
  _body: string;
} {
  const res = {
    _statusCode: 200,
    _headers: {} as Record<string, string>,
    _body: '',
    writeHead(statusCode: number, headers?: Record<string, string>) {
      this._statusCode = statusCode;
      if (headers) {
        Object.assign(this._headers, headers);
      }
      return this;
    },
    setHeader(name: string, value: string) {
      this._headers[name] = value;
      return this;
    },
    end(body?: string) {
      if (body) {
        this._body = body;
      }
      return this;
    },
  } as ServerResponse & { _statusCode: number; _headers: Record<string, string>; _body: string };
  return res;
}

describe('parseJSON', () => {
  it('throws SyntaxError on invalid JSON', async () => {
    const { parseJSON } = await import('../src/server/routes.js');
    expect(() => parseJSON('not valid json {{{')).toThrow(SyntaxError);
  });

  it('returns parsed object on valid JSON', async () => {
    const { parseJSON } = await import('../src/server/routes.js');
    const result = parseJSON('{"foo": "bar"}');
    expect(result).toEqual({ foo: 'bar' });
  });
});

describe('readBody', () => {
  it('rejects when request emits error', async () => {
    const { readBody } = await import('../src/server/routes.js');

    const req = createMockRequest();

    const bodyPromise = readBody(req);

    // Emit error
    req.emit('error', new Error('Connection reset'));

    await expect(bodyPromise).rejects.toThrow('Connection reset');
  });

  it('rejects when body exceeds size limit', async () => {
    const { readBody, MAX_BODY_SIZE } = await import('../src/server/routes.js');

    const req = createMockRequest();

    const bodyPromise = readBody(req);

    // Send data that exceeds the limit
    const largeChunk = Buffer.alloc(MAX_BODY_SIZE + 1, 'x');
    req.emit('data', largeChunk);

    await expect(bodyPromise).rejects.toThrow(/size limit|too large/i);
  });

  it('resolves with body when within size limit', async () => {
    const { readBody } = await import('../src/server/routes.js');

    const req = createMockRequest();

    const bodyPromise = readBody(req);

    req.emit('data', Buffer.from('hello '));
    req.emit('data', Buffer.from('world'));
    req.emit('end');

    const body = await bodyPromise;
    expect(body).toBe('hello world');
  });

  it('cleans up listeners after size limit rejection', async () => {
    const { readBody, MAX_BODY_SIZE } = await import('../src/server/routes.js');

    const req = createMockRequest();

    const bodyPromise = readBody(req);

    // Send data that exceeds the limit
    const largeChunk = Buffer.alloc(MAX_BODY_SIZE + 1, 'x');
    req.emit('data', largeChunk);

    await expect(bodyPromise).rejects.toThrow(/size limit/i);

    // Listeners should be removed after rejection
    expect(req.listenerCount('data')).toBe(0);
    expect(req.listenerCount('error')).toBe(0);
    expect(req.listenerCount('end')).toBe(0);
  });

  it('cleans up listeners after error', async () => {
    const { readBody } = await import('../src/server/routes.js');

    const req = createMockRequest();

    const bodyPromise = readBody(req);

    // Emit error
    req.emit('error', new Error('Connection reset'));

    await expect(bodyPromise).rejects.toThrow('Connection reset');

    // Listeners should be removed after rejection
    expect(req.listenerCount('data')).toBe(0);
    expect(req.listenerCount('error')).toBe(0);
    expect(req.listenerCount('end')).toBe(0);
  });

  it('cleans up listeners after successful read', async () => {
    const { readBody } = await import('../src/server/routes.js');

    const req = createMockRequest();

    const bodyPromise = readBody(req);

    req.emit('data', Buffer.from('hello'));
    req.emit('end');

    await bodyPromise;

    // Listeners should be removed after resolution
    expect(req.listenerCount('data')).toBe(0);
    expect(req.listenerCount('error')).toBe(0);
    expect(req.listenerCount('end')).toBe(0);
  });
});

describe('handleGetResponse', () => {
  let sessionManager: { consumeResponse: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null response when no response available', async () => {
    const { handleGetResponse } = await import('../src/server/routes.js');

    sessionManager.consumeResponse.mockReturnValue(null);

    const req = createMockRequest();
    const res = createMockResponse();

    handleGetResponse(req, res, 'nonexistent-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { response: unknown };
    expect(body.response).toBeNull();
  });

  it('returns response when available', async () => {
    const { handleGetResponse } = await import('../src/server/routes.js');

    const mockResponse = {
      sessionId: 'test-session',
      response: 'test response',
      from: 'user@example.com',
      timestamp: Date.now(),
    };
    sessionManager.consumeResponse.mockReturnValue(mockResponse);

    const req = createMockRequest();
    const res = createMockResponse();

    handleGetResponse(req, res, 'test-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as typeof mockResponse;
    expect(body.sessionId).toBe('test-session');
    expect(body.response).toBe('test response');
    expect(body.from).toBe('user@example.com');
  });
});

// Helper to create mock context with channel manager
function createMockContext(): RouteContext & {
  channelManager: { sendToAll: Mock };
} {
  return {
    channelManager: {
      sendToAll: vi.fn(),
    },
    startTime: Date.now() - 60000, // 1 minute ago
  };
}

// Helper to emit request body and end
function emitRequestBody(req: EventEmitter, body: string): void {
  setImmediate(() => {
    req.emit('data', Buffer.from(body));
    req.emit('end');
  });
}

describe('handleSendEmail', () => {
  let sessionManager: {
    hasSession: Mock;
    isSessionEnabled: Mock;
    storeMessageId: Mock;
  };
  let stateManager: { isHookEnabled: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    const stateMod = await import('../src/server/state.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    stateManager = stateMod.stateManager as typeof stateManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for invalid JSON body', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, 'not valid json {{{');
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toContain('Invalid JSON body');
  });

  it('returns 400 for missing sessionId', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ event: 'Notification', message: 'test' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid sessionId');
  });

  it('returns 400 for missing event', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', message: 'test' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid event');
  });

  it('returns 400 for invalid event', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'InvalidEvent', message: 'test' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid event');
  });

  it('returns 400 for missing message', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid message');
  });

  it('returns 200 with sent:false when hook is disabled', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test' }));
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { sent: boolean; reason: string };
    expect(body.sent).toBe(false);
    expect(body.reason).toBe('Hook disabled');
  });

  it('returns 200 with sent:false when session not found', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);
    sessionManager.hasSession.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test' }));
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { sent: boolean; reason: string };
    expect(body.sent).toBe(false);
    expect(body.reason).toBe('Session not found');
  });

  it('returns 200 with sent:true on successful send', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    ctx.channelManager.sendToAll.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      results: new Map([['email', { success: true, data: 'msg-id-123' }]]),
    });

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test message' }));
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { sent: boolean; channels: number };
    expect(body.sent).toBe(true);
    expect(body.channels).toBe(1);
    expect(sessionManager.storeMessageId).toHaveBeenCalledWith('test-123', 'msg-id-123');
  });

  it('returns 500 when all channels fail', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    ctx.channelManager.sendToAll.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      results: new Map([['email', { success: false, error: 'SMTP connection failed' }]]),
    });

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test message' }));
    await promise;

    expect(res._statusCode).toBe(500);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('All channels failed to send');
  });
});

describe('handleRegisterSession', () => {
  let sessionManager: {
    registerSession: Mock;
    storeMessageId: Mock;
  };
  let stateManager: { isHookEnabled: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    const stateMod = await import('../src/server/state.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    stateManager = stateMod.stateManager as typeof stateManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for invalid JSON body', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, 'not valid json');
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toContain('Invalid JSON body');
  });

  it('returns 400 for missing sessionId', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ event: 'Notification', prompt: 'test' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid sessionId');
  });

  it('returns 400 for missing event', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', prompt: 'test' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid event');
  });

  it('returns 400 for missing prompt', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid prompt');
  });

  it('returns 200 with registered:false when hook is disabled', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: 'test prompt' }));
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { registered: boolean; reason: string };
    expect(body.registered).toBe(false);
    expect(body.reason).toBe('Hook disabled');
  });

  it('returns 200 with registered:true on successful registration', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    ctx.channelManager.sendToAll.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      results: new Map([['email', { success: true, data: 'msg-id-456' }]]),
    });

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: 'test prompt' }));
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { registered: boolean; channels: number };
    expect(body.registered).toBe(true);
    expect(body.channels).toBe(1);
    expect(sessionManager.registerSession).toHaveBeenCalledWith('test-123', 'Notification', 'test prompt');
    expect(sessionManager.storeMessageId).toHaveBeenCalledWith('test-123', 'msg-id-456');
  });

  it('returns 500 when all channels fail', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    ctx.channelManager.sendToAll.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      results: new Map([['email', { success: false, error: 'Email server error' }]]),
    });

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: 'test prompt' }));
    await promise;

    expect(res._statusCode).toBe(500);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('All channels failed to send');
  });
});

describe('handleEnableSession', () => {
  let sessionManager: {
    hasSession: Mock;
    enableSession: Mock;
  };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when session not found', async () => {
    const { handleEnableSession } = await import('../src/server/routes.js');

    sessionManager.hasSession.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();

    handleEnableSession(req, res, 'nonexistent-session');

    expect(res._statusCode).toBe(404);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Session nonexistent-session not found');
  });

  it('returns 200 with success:true when session exists', async () => {
    const { handleEnableSession } = await import('../src/server/routes.js');

    sessionManager.hasSession.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();

    handleEnableSession(req, res, 'existing-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { success: boolean };
    expect(body.success).toBe(true);
    expect(sessionManager.enableSession).toHaveBeenCalledWith('existing-session');
  });
});

describe('handleDisableSession', () => {
  let sessionManager: {
    hasSession: Mock;
    disableSession: Mock;
  };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when session not found', async () => {
    const { handleDisableSession } = await import('../src/server/routes.js');

    sessionManager.hasSession.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();

    handleDisableSession(req, res, 'nonexistent-session');

    expect(res._statusCode).toBe(404);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Session nonexistent-session not found');
  });

  it('returns 200 with success:true when session exists', async () => {
    const { handleDisableSession } = await import('../src/server/routes.js');

    sessionManager.hasSession.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();

    handleDisableSession(req, res, 'existing-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { success: boolean };
    expect(body.success).toBe(true);
    expect(sessionManager.disableSession).toHaveBeenCalledWith('existing-session');
  });
});

describe('handleCheckSessionEnabled', () => {
  let sessionManager: {
    hasSession: Mock;
    isSessionEnabled: Mock;
  };
  let stateManager: { isEnabled: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    const stateMod = await import('../src/server/state.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    stateManager = stateMod.stateManager as typeof stateManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when session not found', async () => {
    const { handleCheckSessionEnabled } = await import('../src/server/routes.js');

    sessionManager.hasSession.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckSessionEnabled(req, res, 'nonexistent-session');

    expect(res._statusCode).toBe(404);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Session not found');
  });

  it('returns 200 with enabled status when session exists', async () => {
    const { handleCheckSessionEnabled } = await import('../src/server/routes.js');

    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(true);
    stateManager.isEnabled.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckSessionEnabled(req, res, 'existing-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { enabled: boolean };
    expect(body.enabled).toBe(true);
  });

  it('returns enabled:false when session is enabled but global is disabled', async () => {
    const { handleCheckSessionEnabled } = await import('../src/server/routes.js');

    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(true);
    stateManager.isEnabled.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckSessionEnabled(req, res, 'existing-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { enabled: boolean };
    expect(body.enabled).toBe(false);
  });
});

describe('handleStatus', () => {
  let sessionManager: {
    getSessionCount: Mock;
    getPendingResponseCount: Mock;
  };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns correct status JSON structure', async () => {
    const { handleStatus } = await import('../src/server/routes.js');

    sessionManager.getSessionCount.mockReturnValue(5);
    sessionManager.getPendingResponseCount.mockReturnValue(2);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    handleStatus(req, res, ctx);

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as {
      status: string;
      activeSessions: number;
      pendingResponses: number;
      uptime: number;
    };
    expect(body.status).toBe('running');
    expect(body.activeSessions).toBe(5);
    expect(body.pendingResponses).toBe(2);
    expect(body.uptime).toBeGreaterThanOrEqual(60);
  });
});

describe('handleRoot', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns correct server info JSON structure', async () => {
    const { handleRoot } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();

    handleRoot(req, res);

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as {
      name: string;
      version: string;
      endpoints: string[];
    };
    expect(body.name).toBe('Claude Code Anywhere');
    expect(typeof body.version).toBe('string');
    expect(Array.isArray(body.endpoints)).toBe(true);
    expect(body.endpoints.length).toBeGreaterThan(0);
  });
});

describe('handleEnableGlobal', () => {
  let stateManager: { enable: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const stateMod = await import('../src/server/state.js');
    stateManager = stateMod.stateManager as typeof stateManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with success:true', async () => {
    const { handleEnableGlobal } = await import('../src/server/routes.js');

    stateManager.enable.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();

    handleEnableGlobal(req, res);

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { success: boolean };
    expect(body.success).toBe(true);
    expect(stateManager.enable).toHaveBeenCalled();
  });
});

describe('handleDisableGlobal', () => {
  let stateManager: { disable: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const stateMod = await import('../src/server/state.js');
    stateManager = stateMod.stateManager as typeof stateManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with success:true', async () => {
    const { handleDisableGlobal } = await import('../src/server/routes.js');

    stateManager.disable.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();

    handleDisableGlobal(req, res);

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { success: boolean };
    expect(body.success).toBe(true);
    expect(stateManager.disable).toHaveBeenCalled();
  });
});

describe('handleSendEmail edge cases', () => {
  let sessionManager: {
    hasSession: Mock;
    isSessionEnabled: Mock;
    storeMessageId: Mock;
  };
  let stateManager: { isHookEnabled: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const sessionsMod = await import('../src/server/sessions.js');
    const stateMod = await import('../src/server/state.js');
    sessionManager = sessionsMod.sessionManager as typeof sessionManager;
    stateManager = stateMod.stateManager as typeof stateManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for non-object JSON body', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify('just a string'));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Invalid JSON body: expected object');
  });

  it('returns 400 for empty sessionId', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: '', event: 'Notification', message: 'test' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid sessionId');
  });

  it('returns 400 for empty message', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: '' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid message');
  });

  it('returns 200 with sent:false when session is disabled', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test' }));
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { sent: boolean; reason: string };
    expect(body.sent).toBe(false);
    expect(body.reason).toBe('Session disabled');
  });
});

describe('handleRegisterSession edge cases', () => {
  let stateManager: { isHookEnabled: Mock };

  beforeEach(async () => {
    vi.resetModules();
    const stateMod = await import('../src/server/state.js');
    stateManager = stateMod.stateManager as typeof stateManager;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for non-object JSON body', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify(null));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Invalid JSON body: expected object');
  });

  it('returns 400 for empty prompt', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(req, JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: '' }));
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid prompt');
  });
});
