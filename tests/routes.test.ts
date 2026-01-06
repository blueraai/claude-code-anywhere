import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { IncomingMessage } from 'http';

// We need to test the private readBody function, so we'll need to export it
// For now, let's create a test module that imports routes and tests via the handlers

// Create a mock request that emits events
function createMockRequest(): IncomingMessage & EventEmitter {
  const req = new EventEmitter() as IncomingMessage & EventEmitter & { destroy: () => void };
  req.destroy = vi.fn();
  return req;
}

// Since readBody is not exported, we'll test it indirectly through handleTelnyxWebhook
// But first, let's create a direct test by temporarily making readBody accessible

// For TDD, we'll write the test assuming readBody will be exported
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
});
