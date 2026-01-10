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
    isSpecificHookEnabled: vi.fn(),
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
function createMockContext(): RouteContext {
  return {
    channelManager: {
      sendToAll: vi.fn(),
      getAllStatus: vi.fn().mockReturnValue([]),
    } as unknown as RouteContext['channelManager'],
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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'InvalidEvent', message: 'test' })
    );
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid event');
  });

  it('accepts ResponseSync as valid event', async () => {
    const { handleSendEmail } = await import('../src/server/routes.js');
    const sessionManager = await import('../src/server/sessions.js');

    vi.mocked(sessionManager.sessionManager.hasSession).mockReturnValue(true);
    vi.mocked(sessionManager.sessionManager.isSessionEnabled).mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    vi.mocked(ctx.channelManager.sendToAll).mockResolvedValue({
      results: new Map([['email', { success: true, data: 'msg-id' }]]),
      successCount: 1,
      failureCount: 0,
    });

    const promise = handleSendEmail(req, res, ctx);
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'ResponseSync', message: 'User responded' })
    );
    await promise;

    // Should NOT return 400 for invalid event - ResponseSync should be valid
    expect(res._statusCode).toBe(200);
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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test' })
    );
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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test' })
    );
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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test message' })
    );
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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test message' })
    );
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
  let stateManager: { isHookEnabled: Mock; isEnabled: Mock; isSpecificHookEnabled: Mock };

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
    stateManager.isSpecificHookEnabled.mockReturnValue(false); // Hook type is disabled

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: 'test prompt' })
    );
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { registered: boolean; reason: string };
    expect(body.registered).toBe(false);
    expect(body.reason).toBe('Hook disabled');
  });

  it('returns 200 with registered:true on successful registration', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);
    stateManager.isSpecificHookEnabled.mockReturnValue(true);
    stateManager.isEnabled.mockReturnValue(true); // Global enabled

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    ctx.channelManager.sendToAll.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      results: new Map([['email', { success: true, data: 'msg-id-456' }]]),
    });

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: 'test prompt' })
    );
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { registered: boolean; channels: number };
    expect(body.registered).toBe(true);
    expect(body.channels).toBe(1);
    expect(sessionManager.registerSession).toHaveBeenCalledWith(
      'test-123',
      'Notification',
      'test prompt'
    );
    expect(sessionManager.storeMessageId).toHaveBeenCalledWith('test-123', 'msg-id-456');
  });

  it('returns 500 when all channels fail', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    stateManager.isHookEnabled.mockReturnValue(true);
    stateManager.isSpecificHookEnabled.mockReturnValue(true);
    stateManager.isEnabled.mockReturnValue(true); // Global enabled

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    ctx.channelManager.sendToAll.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      results: new Map([['email', { success: false, error: 'Email server error' }]]),
    });

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: 'test prompt' })
    );
    await promise;

    expect(res._statusCode).toBe(500);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('All channels failed to send');
  });
});

describe('handleEnableSession', () => {
  let sessionManager: {
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

  it('auto-creates and enables new session', async () => {
    const { handleEnableSession } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();

    handleEnableSession(req, res, 'new-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { success: boolean };
    expect(body.success).toBe(true);
    expect(sessionManager.enableSession).toHaveBeenCalledWith('new-session');
  });

  it('enables existing session', async () => {
    const { handleEnableSession } = await import('../src/server/routes.js');

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

// Extended mock context with channel status support
function createMockContextWithChannels(): RouteContext {
  return {
    channelManager: {
      sendToAll: vi.fn(),
      getAllStatus: vi.fn().mockReturnValue([
        {
          name: 'email',
          enabled: true,
          connected: true,
          lastActivity: Date.now(),
          error: null,
          config: { from: 'claude@example.com', to: 'user@example.com' },
        },
        {
          name: 'telegram',
          enabled: true,
          connected: true,
          lastActivity: Date.now(),
          error: null,
          config: { chatId: '123456789' },
        },
      ]),
    } as unknown as RouteContext['channelManager'],
    startTime: Date.now() - 60000, // 1 minute ago
  };
}

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

  it('includes channel status in response', async () => {
    const { handleStatus } = await import('../src/server/routes.js');

    sessionManager.getSessionCount.mockReturnValue(1);
    sessionManager.getPendingResponseCount.mockReturnValue(0);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContextWithChannels();

    handleStatus(req, res, ctx);

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as {
      status: string;
      channels: Array<{
        name: string;
        enabled: boolean;
        connected: boolean;
        lastActivity: number | null;
        error: string | null;
      }>;
    };
    expect(body.channels).toBeDefined();
    expect(body.channels).toHaveLength(2);
    expect(body.channels[0].name).toBe('email');
    expect(body.channels[0].enabled).toBe(true);
    expect(body.channels[0].connected).toBe(true);
    expect(body.channels[0].config).toEqual({ from: 'claude@example.com', to: 'user@example.com' });
    expect(body.channels[1].name).toBe('telegram');
    expect(body.channels[1].config).toEqual({ chatId: '123456789' });
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

describe('handleCheckActive', () => {
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

  it('returns active:true when global is enabled (regardless of session)', async () => {
    const { handleCheckActive } = await import('../src/server/routes.js');

    stateManager.isEnabled.mockReturnValue(true);
    // Session state doesn't matter when global is enabled

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckActive(req, res, 'any-session-id');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { active: boolean };
    expect(body.active).toBe(true);
  });

  it('returns active:true when session is enabled (global disabled)', async () => {
    const { handleCheckActive } = await import('../src/server/routes.js');

    stateManager.isEnabled.mockReturnValue(false);
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckActive(req, res, 'enabled-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { active: boolean };
    expect(body.active).toBe(true);
  });

  it('returns active:false when session disabled and global disabled', async () => {
    const { handleCheckActive } = await import('../src/server/routes.js');

    stateManager.isEnabled.mockReturnValue(false);
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckActive(req, res, 'disabled-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { active: boolean };
    expect(body.active).toBe(false);
  });

  it('returns active:false when session not found and global disabled', async () => {
    const { handleCheckActive } = await import('../src/server/routes.js');

    stateManager.isEnabled.mockReturnValue(false);
    sessionManager.hasSession.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckActive(req, res, 'nonexistent-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { active: boolean };
    expect(body.active).toBe(false);
  });

  it('returns active:false when no sessionId provided and global disabled', async () => {
    const { handleCheckActive } = await import('../src/server/routes.js');

    stateManager.isEnabled.mockReturnValue(false);

    const req = createMockRequest();
    const res = createMockResponse();

    handleCheckActive(req, res, '');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { active: boolean };
    expect(body.active).toBe(false);
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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: '' })
    );
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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', message: 'test' })
    );
    await promise;

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { sent: boolean; reason: string };
    expect(body.sent).toBe(false);
    expect(body.reason).toBe('Session disabled');
  });
});

describe('handleRegisterSession session-enabled mode (BUG FIX)', () => {
  // BUG: When global is disabled but session is enabled, /api/session should
  // still send notifications. Previously it only checked isHookEnabled() which
  // required global enabled AND hook enabled. This broke session-only mode.

  let sessionManager: {
    registerSession: Mock;
    storeMessageId: Mock;
    hasSession: Mock;
    isSessionEnabled: Mock;
  };
  let stateManager: { isHookEnabled: Mock; isEnabled: Mock; isSpecificHookEnabled: Mock };

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

  it('sends notification when session is enabled but global is disabled', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    // Global disabled, but session is enabled
    stateManager.isEnabled.mockReturnValue(false);
    stateManager.isHookEnabled.mockReturnValue(false); // This is what old code checked
    stateManager.isSpecificHookEnabled.mockReturnValue(true); // Hook itself is enabled
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(true); // Session IS enabled

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();
    ctx.channelManager.sendToAll.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      results: new Map([['telegram', { success: true, data: 'msg-id-789' }]]),
    });

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'session-123', event: 'PreToolUse', prompt: 'Approve Bash?' })
    );
    await promise;

    // Should send notification even though global is disabled
    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { registered: boolean; channels: number };
    expect(body.registered).toBe(true);
    expect(body.channels).toBe(1);
    expect(ctx.channelManager.sendToAll).toHaveBeenCalled();
  });

  it('rejects when hook type is disabled in state (even if session enabled)', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    // Global disabled, session enabled, but PreToolUse hook is disabled
    stateManager.isEnabled.mockReturnValue(false);
    stateManager.isHookEnabled.mockReturnValue(false);
    stateManager.isSpecificHookEnabled.mockReturnValue(false); // Hook is disabled
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(true);

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'session-123', event: 'PreToolUse', prompt: 'Approve Bash?' })
    );
    await promise;

    // Should reject because PreToolUse hook is disabled
    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { registered: boolean; reason: string };
    expect(body.registered).toBe(false);
    expect(body.reason).toBe('Hook disabled');
  });

  it('rejects when neither global nor session is enabled', async () => {
    const { handleRegisterSession } = await import('../src/server/routes.js');

    // Both global and session disabled
    stateManager.isEnabled.mockReturnValue(false);
    stateManager.isHookEnabled.mockReturnValue(false);
    stateManager.isSpecificHookEnabled.mockReturnValue(true);
    sessionManager.hasSession.mockReturnValue(true);
    sessionManager.isSessionEnabled.mockReturnValue(false); // Session NOT enabled

    const req = createMockRequest();
    const res = createMockResponse();
    const ctx = createMockContext();

    const promise = handleRegisterSession(req, res, ctx);
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'session-123', event: 'PreToolUse', prompt: 'Approve Bash?' })
    );
    await promise;

    // Should reject because neither global nor session is enabled
    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { registered: boolean; reason: string };
    expect(body.registered).toBe(false);
    expect(body.reason).toBe('Notifications not active');
  });
});

describe('handleRegisterSession edge cases', () => {
  let stateManager: { isHookEnabled: Mock; isEnabled: Mock; isSpecificHookEnabled: Mock };

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
    emitRequestBody(
      req,
      JSON.stringify({ sessionId: 'test-123', event: 'Notification', prompt: '' })
    );
    await promise;

    expect(res._statusCode).toBe(400);
    const body = JSON.parse(res._body) as { error: string };
    expect(body.error).toBe('Missing or invalid prompt');
  });
});
