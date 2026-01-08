import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelManager } from '../src/server/channels.js';
import type {
  Channel,
  ChannelNotification,
  ChannelStatus,
  ResponseCallback,
} from '../src/shared/channel.js';
import type { Result } from '../src/shared/types.js';

/**
 * Create a mock channel for testing
 */
function createMockChannel(name: string, enabled: boolean = true): Channel {
  return {
    name,
    enabled,
    initialize: vi.fn().mockResolvedValue(undefined),
    send: vi
      .fn()
      .mockResolvedValue({ success: true, data: `${name}-msg-123` } as Result<string, string>),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    dispose: vi.fn(),
    validateConfig: vi.fn(),
    getStatus: vi.fn().mockReturnValue({
      name,
      enabled,
      connected: true,
      lastActivity: Date.now(),
      error: null,
    } as ChannelStatus),
  };
}

describe('ChannelManager', () => {
  let manager: ChannelManager;

  beforeEach(() => {
    manager = new ChannelManager();
  });

  describe('register', () => {
    it('registers a channel', () => {
      const channel = createMockChannel('test');
      manager.register(channel);

      expect(manager.get('test')).toBe(channel);
      expect(manager.size).toBe(1);
    });

    it('throws when registering duplicate channel', () => {
      const channel1 = createMockChannel('test');
      const channel2 = createMockChannel('test');

      manager.register(channel1);
      expect(() => manager.register(channel2)).toThrow("Channel 'test' is already registered");
    });

    it('registers multiple channels', () => {
      manager.register(createMockChannel('email'));
      manager.register(createMockChannel('telegram'));

      expect(manager.size).toBe(2);
      expect(manager.getChannelNames()).toEqual(['email', 'telegram']);
    });
  });

  describe('get', () => {
    it('returns channel by name', () => {
      const channel = createMockChannel('email');
      manager.register(channel);

      expect(manager.get('email')).toBe(channel);
    });

    it('returns undefined for unknown channel', () => {
      expect(manager.get('unknown')).toBeUndefined();
    });
  });

  describe('initializeAll', () => {
    it('initializes all registered channels', async () => {
      const email = createMockChannel('email');
      const telegram = createMockChannel('telegram');

      manager.register(email);
      manager.register(telegram);

      await manager.initializeAll();

      expect(email.initialize).toHaveBeenCalled();
      expect(telegram.initialize).toHaveBeenCalled();
    });

    it('throws on first initialization failure', async () => {
      const email = createMockChannel('email');
      vi.mocked(email.initialize).mockRejectedValue(new Error('Email init failed'));

      const telegram = createMockChannel('telegram');

      manager.register(email);
      manager.register(telegram);

      await expect(manager.initializeAll()).rejects.toThrow('Email init failed');
    });
  });

  describe('sendToAll', () => {
    const notification: ChannelNotification = {
      sessionId: 'abc123',
      event: 'Notification',
      title: 'Test',
      message: 'Hello',
    };

    it('sends to all enabled channels in parallel', async () => {
      const email = createMockChannel('email');
      const telegram = createMockChannel('telegram');

      manager.register(email);
      manager.register(telegram);

      const result = await manager.sendToAll(notification);

      expect(email.send).toHaveBeenCalledWith(notification);
      expect(telegram.send).toHaveBeenCalledWith(notification);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('skips disabled channels', async () => {
      const email = createMockChannel('email', true);
      const telegram = createMockChannel('telegram', false);

      manager.register(email);
      manager.register(telegram);

      const result = await manager.sendToAll(notification);

      expect(email.send).toHaveBeenCalled();
      expect(telegram.send).not.toHaveBeenCalled();
      expect(result.successCount).toBe(1);
    });

    it('reports failures without stopping other sends', async () => {
      const email = createMockChannel('email');
      vi.mocked(email.send).mockResolvedValue({ success: false, error: 'Email failed' });

      const telegram = createMockChannel('telegram');

      manager.register(email);
      manager.register(telegram);

      const result = await manager.sendToAll(notification);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results.get('email')?.success).toBe(false);
      expect(result.results.get('telegram')?.success).toBe(true);
    });

    it('throws when no enabled channels exist', async () => {
      await expect(manager.sendToAll(notification)).rejects.toThrow(
        'No enabled channels to send to'
      );
    });

    it('throws when all channels are disabled', async () => {
      const email = createMockChannel('email', false);
      const telegram = createMockChannel('telegram', false);

      manager.register(email);
      manager.register(telegram);

      await expect(manager.sendToAll(notification)).rejects.toThrow(
        'No enabled channels to send to'
      );
    });
  });

  describe('startAllPolling', () => {
    it('starts polling on all enabled channels', () => {
      const email = createMockChannel('email');
      const telegram = createMockChannel('telegram');

      manager.register(email);
      manager.register(telegram);

      const callback: ResponseCallback = vi.fn();
      manager.startAllPolling(callback);

      expect(email.startPolling).toHaveBeenCalledWith(callback);
      expect(telegram.startPolling).toHaveBeenCalledWith(callback);
    });

    it('skips disabled channels', () => {
      const email = createMockChannel('email', true);
      const telegram = createMockChannel('telegram', false);

      manager.register(email);
      manager.register(telegram);

      const callback: ResponseCallback = vi.fn();
      manager.startAllPolling(callback);

      expect(email.startPolling).toHaveBeenCalled();
      expect(telegram.startPolling).not.toHaveBeenCalled();
    });
  });

  describe('stopAllPolling', () => {
    it('stops polling on all channels', () => {
      const email = createMockChannel('email');
      const telegram = createMockChannel('telegram');

      manager.register(email);
      manager.register(telegram);

      manager.stopAllPolling();

      expect(email.stopPolling).toHaveBeenCalled();
      expect(telegram.stopPolling).toHaveBeenCalled();
    });
  });

  describe('disposeAll', () => {
    it('disposes all channels and clears the registry', () => {
      const email = createMockChannel('email');
      const telegram = createMockChannel('telegram');

      manager.register(email);
      manager.register(telegram);

      manager.disposeAll();

      expect(email.dispose).toHaveBeenCalled();
      expect(telegram.dispose).toHaveBeenCalled();
      expect(manager.size).toBe(0);
    });
  });

  describe('getEnabledChannels', () => {
    it('returns only enabled channels', () => {
      manager.register(createMockChannel('email', true));
      manager.register(createMockChannel('telegram', false));
      manager.register(createMockChannel('slack', true));

      const enabled = manager.getEnabledChannels();
      expect(enabled).toHaveLength(2);
      expect(enabled.map((c) => c.name)).toEqual(['email', 'slack']);
    });
  });

  describe('getAllStatus', () => {
    it('returns status from all channels', () => {
      manager.register(createMockChannel('email'));
      manager.register(createMockChannel('telegram'));

      const statuses = manager.getAllStatus();
      expect(statuses).toHaveLength(2);
      expect(statuses[0].name).toBe('email');
      expect(statuses[1].name).toBe('telegram');
    });
  });
});
