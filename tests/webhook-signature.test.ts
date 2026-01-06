import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync, sign } from 'crypto';

// Generate test key pair for signing
const { publicKey, privateKey } = generateKeyPairSync('ed25519');

// Export public key in PEM format for tests
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

/**
 * Helper to create a valid signature for testing
 */
function createTestSignature(timestamp: string, body: string): string {
  const payload = `${timestamp}|${body}`;
  const signature = sign(null, Buffer.from(payload), privateKey);
  return signature.toString('base64');
}

describe('verifyTelnyxSignature', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set current time to a known value
    vi.setSystemTime(new Date('2026-01-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for valid signature within timestamp tolerance', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    const timestamp = String(Math.floor(Date.now() / 1000)); // Current time
    const signature = createTestSignature(timestamp, body);

    const result = verifyTelnyxSignature(body, signature, timestamp, publicKeyPem);
    expect(result).toBe(true);
  });

  it('returns false for invalid signature', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const invalidSignature = 'aW52YWxpZC1zaWduYXR1cmU='; // Invalid base64

    const result = verifyTelnyxSignature(body, invalidSignature, timestamp, publicKeyPem);
    expect(result).toBe(false);
  });

  it('returns false when body has been tampered', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const originalBody = '{"data":{"event_type":"message.received"}}';
    const tamperedBody = '{"data":{"event_type":"message.received","hacked":true}}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createTestSignature(timestamp, originalBody);

    const result = verifyTelnyxSignature(tamperedBody, signature, timestamp, publicKeyPem);
    expect(result).toBe(false);
  });

  it('returns false when timestamp is too old (> 5 minutes)', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    // 6 minutes ago
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 360);
    const signature = createTestSignature(oldTimestamp, body);

    const result = verifyTelnyxSignature(body, signature, oldTimestamp, publicKeyPem);
    expect(result).toBe(false);
  });

  it('returns false when timestamp is in the future (> 1 minute)', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    // 2 minutes in the future
    const futureTimestamp = String(Math.floor(Date.now() / 1000) + 120);
    const signature = createTestSignature(futureTimestamp, body);

    const result = verifyTelnyxSignature(body, signature, futureTimestamp, publicKeyPem);
    expect(result).toBe(false);
  });

  it('throws when signature header is empty', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    const timestamp = String(Math.floor(Date.now() / 1000));

    expect(() => verifyTelnyxSignature(body, '', timestamp, publicKeyPem)).toThrow(
      /signature.*required/i
    );
  });

  it('throws when timestamp header is empty', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    const signature = 'c29tZS1zaWduYXR1cmU=';

    expect(() => verifyTelnyxSignature(body, signature, '', publicKeyPem)).toThrow(
      /timestamp.*required/i
    );
  });

  it('throws when timestamp is not a valid number', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    const signature = 'c29tZS1zaWduYXR1cmU=';

    expect(() => verifyTelnyxSignature(body, signature, 'not-a-number', publicKeyPem)).toThrow(
      /timestamp.*invalid/i
    );
  });

  it('throws when public key is invalid', async () => {
    const { verifyTelnyxSignature } = await import('../src/server/webhook-signature.js');

    const body = '{"data":{"event_type":"message.received"}}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createTestSignature(timestamp, body);

    expect(() => verifyTelnyxSignature(body, signature, timestamp, 'invalid-public-key')).toThrow();
  });
});
