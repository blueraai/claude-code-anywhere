import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelnyxClient } from '../src/server/telnyx.js';

describe('TelnyxClient', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    fromNumber: '+15551234567',
    userPhone: '+15559876543',
    webhookPublicKey: 'test-public-key',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('sendSMS', () => {
    it('returns message ID on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: 'msg-123',
            },
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TelnyxClient(mockConfig);
      const result = await client.sendSMS('Hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('msg-123');
      }
    });

    it('returns error when response is missing message ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              // Missing 'id' field
              status: 'sent',
            },
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TelnyxClient(mockConfig);
      const result = await client.sendSMS('Hello');

      // Should return error instead of 'unknown'
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/message ID/i);
      }
    });

    it('returns error when response has unexpected structure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            // Completely wrong structure
            result: 'ok',
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TelnyxClient(mockConfig);
      const result = await client.sendSMS('Hello');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/message ID/i);
      }
    });

    it('returns error result on API failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TelnyxClient(mockConfig);
      const result = await client.sendSMS('Hello');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('400');
      }
    });
  });
});
