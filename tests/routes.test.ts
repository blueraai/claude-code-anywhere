import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';

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
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null response when no response available', async () => {
    const { handleGetResponse } = await import('../src/server/routes.js');

    const req = createMockRequest();
    const res = createMockResponse();

    handleGetResponse(req, res, 'nonexistent-session');

    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body) as { response: unknown };
    expect(body.response).toBeNull();
  });
});
