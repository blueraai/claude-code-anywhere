import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { TelegramClient, getEventEmoji, getEventHeader } from '../src/server/telegram.js';
import type { TelegramConfig } from '../src/shared/types.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
  },
}));

const mockAxiosCreate = vi.mocked(axios.create);

describe('TelegramClient', () => {
  const validConfig: TelegramConfig = {
    botToken: 'test-bot-token',
    chatId: '123456789',
  };

  let mockAxiosInstance: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
    };
    mockAxiosCreate.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateConfig', () => {
    it('throws when botToken is missing', () => {
      const client = new TelegramClient({ botToken: '', chatId: '123' });
      expect(() => client.validateConfig()).toThrow('TELEGRAM_BOT_TOKEN is required');
    });

    it('throws when chatId is missing', () => {
      const client = new TelegramClient({ botToken: 'token', chatId: '' });
      expect(() => client.validateConfig()).toThrow('TELEGRAM_CHAT_ID is required');
    });

    it('does not throw with valid config', () => {
      const client = new TelegramClient(validConfig);
      expect(() => client.validateConfig()).not.toThrow();
    });
  });

  describe('initialize', () => {
    it('creates axios client with correct base URL', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: 'https://api.telegram.org/bottest-bot-token',
        timeout: expect.any(Number),
      });
    });

    it('verifies bot token by calling getMe', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/getMe');
    });

    it('throws when getMe returns error', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: false, description: 'Invalid token' },
      });

      const client = new TelegramClient(validConfig);
      await expect(client.initialize()).rejects.toThrow('Invalid token');
    });

    it('throws when API request fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const client = new TelegramClient(validConfig);
      await expect(client.initialize()).rejects.toThrow('Network error');
    });
  });

  describe('send', () => {
    it('sends message to configured chat', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });
      mockAxiosInstance.post.mockResolvedValue({
        data: { ok: true, result: { message_id: 456 } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const result = await client.send({
        sessionId: 'abc123',
        event: 'Notification',
        title: 'Test',
        message: 'Hello world',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('456');
      }

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/sendMessage', {
        chat_id: '123456789',
        text: expect.stringContaining('abc123'),
        parse_mode: 'MarkdownV2',
      });
    });

    it('returns error when not initialized', async () => {
      const client = new TelegramClient(validConfig);
      const result = await client.send({
        sessionId: 'abc123',
        event: 'Notification',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not initialized');
      }
    });

    it('returns error when API fails', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });
      mockAxiosInstance.post.mockResolvedValue({
        data: { ok: false, description: 'Chat not found' },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const result = await client.send({
        sessionId: 'abc123',
        event: 'Notification',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Chat not found');
      }
    });
  });

  describe('getStatus', () => {
    it('returns correct status when not initialized', () => {
      const client = new TelegramClient(validConfig);
      const status = client.getStatus();

      expect(status.name).toBe('telegram');
      expect(status.enabled).toBe(true);
      expect(status.connected).toBe(false);
      expect(status.lastActivity).toBeNull();
      expect(status.error).toBeNull();
    });

    it('returns connected status after initialization', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const status = client.getStatus();
      expect(status.connected).toBe(true);
    });
  });

  describe('dispose', () => {
    it('cleans up resources', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      client.dispose();

      const status = client.getStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe('polling', () => {
    it('starts polling with callback', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);

      // Cleanup
      client.stopPolling();
    });

    it('does not start polling twice', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);
      client.startPolling(callback); // Second call should be ignored

      client.stopPolling();
    });

    it('stops polling on stopPolling call', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);
      client.stopPolling();

      // Verify no error is thrown on second stop
      client.stopPolling();
    });
  });

  describe('pollForUpdates edge cases', () => {
    it('matches session via reply_to_message', async () => {
      // First call is getMe, then getUpdates calls
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockResolvedValueOnce({
          // First getUpdates returns reply matching our sent message
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 200,
                  chat: { id: 123456789, type: 'private' },
                  from: { id: 999, username: 'user' },
                  text: 'My reply',
                  reply_to_message: {
                    message_id: 100,
                  },
                  date: 1700000000,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          data: { ok: true, result: [] },
        });
      mockAxiosInstance.post.mockResolvedValue({
        data: { ok: true, result: { message_id: 100 } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      // Send a message to track the message_id -> sessionId mapping
      await client.send({
        sessionId: 'abc123',
        event: 'Notification',
        title: 'Test',
        message: 'Hello',
      });

      const callback = vi.fn();
      client.startPolling(callback);

      // Wait for the poll cycle
      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'abc123',
          response: 'My reply',
          channel: 'telegram',
        })
      );

      client.stopPolling();
    });

    it('matches session via [CC-xxx] in text', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockResolvedValueOnce({
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 200,
                  chat: { id: 123456789, type: 'private' },
                  from: { id: 999, username: 'user' },
                  text: '[CC-def456] This is my response',
                  date: 1700000000,
                },
              },
            ],
          },
        });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'def456',
          response: '[CC-def456] This is my response',
          channel: 'telegram',
        })
      );

      client.stopPolling();
    });

    it('ignores messages from wrong chat ID', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockResolvedValueOnce({
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 200,
                  chat: { id: 999999999, type: 'private' }, // Wrong chat ID
                  from: { id: 999, username: 'user' },
                  text: '[CC-abc123] Message from wrong chat',
                  date: 1700000000,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          data: { ok: true, result: [] },
        });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);

      // Give polling time to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(callback).not.toHaveBeenCalled();

      client.stopPolling();
    });

    it('skips messages without text', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockResolvedValueOnce({
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 200,
                  chat: { id: 123456789, type: 'private' },
                  from: { id: 999, username: 'user' },
                  // No text field - like a photo or sticker
                  date: 1700000000,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          data: { ok: true, result: [] },
        });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);

      // Give polling time to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(callback).not.toHaveBeenCalled();

      client.stopPolling();
    });

    it('warns when no valid session ID found', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockResolvedValueOnce({
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 200,
                  chat: { id: 123456789, type: 'private' },
                  from: { id: 999, username: 'user' },
                  text: 'Random message without session ID',
                  date: 1700000000,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          data: { ok: true, result: [] },
        });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);

      // Give polling time to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Callback should not be called since no session ID was found
      expect(callback).not.toHaveBeenCalled();

      client.stopPolling();
    });

    it('updates lastActivity on message receipt', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockResolvedValueOnce({
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 200,
                  chat: { id: 123456789, type: 'private' },
                  from: { id: 999, username: 'user' },
                  text: '[CC-abc123] Response',
                  date: 1700000000,
                },
              },
            ],
          },
        });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      // Status before polling
      const statusBefore = client.getStatus();
      expect(statusBefore.lastActivity).toBeNull();

      const callback = vi.fn();
      client.startPolling(callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });

      const statusAfter = client.getStatus();
      expect(statusAfter.lastActivity).not.toBeNull();
      expect(typeof statusAfter.lastActivity).toBe('number');

      client.stopPolling();
    });
  });

  describe('error handling', () => {
    it('stops polling and sets lastError when API error occurs (fail-fast)', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({
          data: { ok: true, result: [] },
        });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);

      // Wait for the error poll to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = client.getStatus();
      expect(status.error).toBe('Network timeout');

      // Polling is already stopped due to fail-fast behavior
      client.stopPolling();
    });

    it('keeps lastError set after polling stops due to error', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { ok: true, result: { id: 123, username: 'testbot' } },
        })
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          data: { ok: true, result: [] },
        });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const callback = vi.fn();
      client.startPolling(callback);

      // Wait for error poll - polling stops due to fail-fast
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(client.getStatus().error).toBe('Network timeout');

      // Error remains set after polling stops
      expect(client.getStatus().error).toBe('Network timeout');

      client.stopPolling();
    });
  });

  describe('state tracking', () => {
    it('send() updates lastActivity on success', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });
      mockAxiosInstance.post.mockResolvedValue({
        data: { ok: true, result: { message_id: 456 } },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const statusBefore = client.getStatus();
      expect(statusBefore.lastActivity).toBeNull();

      await client.send({
        sessionId: 'abc123',
        event: 'Notification',
        title: 'Test',
        message: 'Hello',
      });

      const statusAfter = client.getStatus();
      expect(statusAfter.lastActivity).not.toBeNull();
      expect(typeof statusAfter.lastActivity).toBe('number');
    });

    it('getStatus() reflects lastError after failure', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });
      mockAxiosInstance.post.mockResolvedValue({
        data: { ok: false, description: 'Rate limited' },
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      const statusBefore = client.getStatus();
      expect(statusBefore.error).toBeNull();

      await client.send({
        sessionId: 'abc123',
        event: 'Notification',
        title: 'Test',
        message: 'Hello',
      });

      const statusAfter = client.getStatus();
      expect(statusAfter.error).toBe('Rate limited');
    });
  });

  describe('sentMessageIds bounded size', () => {
    it('limits sentMessageIds to MAX_SENT_MESSAGE_IDS entries', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      // Mock post to return incrementing message IDs
      let messageIdCounter = 0;
      mockAxiosInstance.post.mockImplementation(() => {
        messageIdCounter += 1;
        return Promise.resolve({
          data: { ok: true, result: { message_id: messageIdCounter } },
        });
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      // Send more messages than the maximum limit (10000)
      // We'll use a smaller number for the test but verify the pruning mechanism
      const MAX_SENT_MESSAGE_IDS = 10000;
      const messagesToSend = MAX_SENT_MESSAGE_IDS + 100;

      for (let i = 0; i < messagesToSend; i++) {
        await client.send({
          sessionId: `session-${String(i)}`,
          event: 'Notification',
          title: 'Test',
          message: `Message ${String(i)}`,
        });
      }

      // Check that a recent message ID (the last one sent) can still be matched
      // but an old one (message ID 1) should have been pruned
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 99999,
                  chat: { id: 123456789, type: 'private' },
                  from: { id: 999, username: 'user' },
                  text: 'Reply to old message',
                  reply_to_message: {
                    message_id: 1, // This should have been pruned (oldest)
                  },
                  date: 1700000000,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          data: { ok: true, result: [] },
        });

      const callback = vi.fn();
      client.startPolling(callback);

      // Wait for poll
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The callback should NOT have been called with session-0 because
      // message ID 1 should have been pruned (it was the first/oldest)
      // Instead, it should fall back to lastSentSessionId
      const calls = callback.mock.calls;
      if (calls.length > 0) {
        // Should use lastSentSessionId (the most recent one) not session-0
        expect(calls[0][0].sessionId).not.toBe('session-0');
        expect(calls[0][0].sessionId).toBe(`session-${String(messagesToSend - 1)}`);
      }

      client.stopPolling();
    });

    it('preserves newest entries when pruning sentMessageIds', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      });

      // Mock post to return incrementing message IDs
      let messageIdCounter = 0;
      mockAxiosInstance.post.mockImplementation(() => {
        messageIdCounter += 1;
        return Promise.resolve({
          data: { ok: true, result: { message_id: messageIdCounter } },
        });
      });

      const client = new TelegramClient(validConfig);
      await client.initialize();

      // Send exactly MAX + 50 messages
      const MAX_SENT_MESSAGE_IDS = 10000;
      const messagesToSend = MAX_SENT_MESSAGE_IDS + 50;

      for (let i = 0; i < messagesToSend; i++) {
        await client.send({
          sessionId: `session-${String(i)}`,
          event: 'Notification',
          title: 'Test',
          message: `Message ${String(i)}`,
        });
      }

      // Check that a recent message ID (the last one sent) can still be matched
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 99999,
                  chat: { id: 123456789, type: 'private' },
                  from: { id: 999, username: 'user' },
                  text: 'Reply to recent message',
                  reply_to_message: {
                    message_id: messagesToSend, // The most recent message
                  },
                  date: 1700000000,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          data: { ok: true, result: [] },
        });

      const callback = vi.fn();
      client.startPolling(callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });

      // Should match the newest session ID
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: `session-${String(messagesToSend - 1)}`,
        })
      );

      client.stopPolling();
    });
  });
});

describe('getEventEmoji', () => {
  it('returns correct emoji for Notification', () => {
    expect(getEventEmoji('Notification')).toBe('\u{1F4E2}');
  });

  it('returns correct emoji for Stop', () => {
    expect(getEventEmoji('Stop')).toBe('\u{2705}');
  });

  it('returns correct emoji for PreToolUse', () => {
    expect(getEventEmoji('PreToolUse')).toBe('\u{26A0}');
  });

  it('returns correct emoji for UserPromptSubmit', () => {
    expect(getEventEmoji('UserPromptSubmit')).toBe('\u{1F916}');
  });

  it('throws on invalid event type', () => {
    expect(() => getEventEmoji('InvalidEvent' as never)).toThrow(
      'Unexpected HookEvent: InvalidEvent'
    );
  });
});

describe('getEventHeader', () => {
  it('returns correct header for Notification', () => {
    expect(getEventHeader('Notification')).toBe('Notification');
  });

  it('returns correct header for Stop', () => {
    expect(getEventHeader('Stop')).toBe('Session ended');
  });

  it('returns correct header for PreToolUse', () => {
    expect(getEventHeader('PreToolUse')).toBe('Approve tool use?');
  });

  it('returns correct header for UserPromptSubmit', () => {
    expect(getEventHeader('UserPromptSubmit')).toBe('Claude needs input');
  });

  it('throws on invalid event type', () => {
    expect(() => getEventHeader('InvalidEvent' as never)).toThrow(
      'Unexpected HookEvent: InvalidEvent'
    );
  });
});

describe('TelegramClient - polling error propagation (fail-fast)', () => {
  const validConfig: TelegramConfig = {
    botToken: 'test-bot-token',
    chatId: '123456789',
  };

  let mockAxiosInstance: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
    };
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('stops polling and sets lastError when API error occurs', async () => {
    mockAxiosInstance.get
      .mockResolvedValueOnce({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      })
      .mockRejectedValueOnce(new Error('Network timeout'));

    const client = new TelegramClient(validConfig);
    await client.initialize();

    const callback = vi.fn();
    client.startPolling(callback);

    // Wait for the error poll to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = client.getStatus();
    expect(status.error).toBe('Network timeout');

    client.stopPolling();
  });

  it('sets lastError when polling fails', async () => {
    mockAxiosInstance.get
      .mockResolvedValueOnce({
        data: { ok: true, result: { id: 123, username: 'testbot' } },
      })
      .mockRejectedValueOnce(new Error('Connection refused'));

    const client = new TelegramClient(validConfig);
    await client.initialize();

    const callback = vi.fn();
    client.startPolling(callback);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(client.getStatus().error).toBe('Connection refused');

    client.stopPolling();
  });
});
