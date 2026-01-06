import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';

// We need to test the private readBody function, so we'll need to export it
// For now, let's create a test module that imports routes and tests via the handlers

// Create a mock request that emits events
function createMockRequest(): IncomingMessage & EventEmitter {
  const req = new EventEmitter() as IncomingMessage & EventEmitter & { destroy: () => void };
  req.destroy = vi.fn();
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

// Since readBody is not exported, we'll test it indirectly through handleTelnyxWebhook
// But first, let's create a direct test by temporarily making readBody accessible

// For TDD, we'll write the test assuming readBody will be exported
describe('parseJSON', () => {
  it('throws SyntaxError on invalid JSON', async () => {
    // parseJSON should throw instead of returning null
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
    // Import dynamically to get the function after it's exported
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

describe('handleTelnyxWebhook', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 on invalid JSON', async () => {
    const { handleTelnyxWebhook } = await import('../src/server/routes.js');
    const { TelnyxClient } = await import('../src/server/telnyx.js');

    const req = createMockRequest();
    const res = createMockResponse();

    const mockCtx = {
      telnyxClient: new TelnyxClient({
        apiKey: 'test',
        fromNumber: '+1555000000',
        userPhone: '+1555111111',
      }),
      tunnelUrl: null,
      startTime: Date.now(),
    };

    const handlerPromise = handleTelnyxWebhook(req, res, mockCtx);

    // Send invalid JSON
    req.emit('data', Buffer.from('not valid json {{{'));
    req.emit('end');

    await handlerPromise;

    // CLAUDE.md: fail early and fast - invalid input should return error status
    expect(res._statusCode).toBe(400);
  });

  it('returns 400 on invalid webhook payload structure', async () => {
    const { handleTelnyxWebhook } = await import('../src/server/routes.js');
    const { TelnyxClient } = await import('../src/server/telnyx.js');

    const req = createMockRequest();
    const res = createMockResponse();

    const mockCtx = {
      telnyxClient: new TelnyxClient({
        apiKey: 'test',
        fromNumber: '+1555000000',
        userPhone: '+1555111111',
      }),
      tunnelUrl: null,
      startTime: Date.now(),
    };

    const handlerPromise = handleTelnyxWebhook(req, res, mockCtx);

    // Send valid JSON but invalid payload structure
    req.emit('data', Buffer.from(JSON.stringify({ foo: 'bar' })));
    req.emit('end');

    await handlerPromise;

    // CLAUDE.md: fail early and fast - invalid payload should return error status
    expect(res._statusCode).toBe(400);
  });
});
