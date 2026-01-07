import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatMessage, MessagesClient, checkImsgInstalled } from '../src/server/messages.js';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('formatMessage', () => {
  it('formats notification message with emoji and prefix', () => {
    const result = formatMessage('abc123', 'Notification', 'Task completed');

    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Notification:');
    expect(result).toContain('Task completed');
    expect(result).toContain('Reply with your response');
  });

  it('formats Stop event with checkmark emoji', () => {
    const result = formatMessage('abc123', 'Stop', 'Session ended');

    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Session ended:');
  });

  it('formats PreToolUse event with warning emoji', () => {
    const result = formatMessage('abc123', 'PreToolUse', 'Execute bash command?');

    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Approve tool use?');
    expect(result).toContain('Execute bash command?');
  });

  it('formats UserPromptSubmit event with robot emoji', () => {
    const result = formatMessage('abc123', 'UserPromptSubmit', 'What would you like?');

    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Claude needs input:');
    expect(result).toContain('What would you like?');
  });

  it('truncates long messages', () => {
    const longMessage = 'x'.repeat(2000);
    const result = formatMessage('abc123', 'Notification', longMessage);

    expect(result.length).toBeLessThanOrEqual(1500);
    expect(result).toContain('...');
  });

  it('preserves short messages without truncation', () => {
    const shortMessage = 'Short message';
    const result = formatMessage('abc123', 'Notification', shortMessage);

    expect(result).toContain(shortMessage);
    expect(result).not.toContain('...');
  });
});

describe('checkImsgInstalled', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns true when imsg is found', () => {
    vi.mocked(execSync).mockReturnValueOnce('/opt/homebrew/bin/imsg');
    expect(checkImsgInstalled()).toBe(true);
  });

  it('returns false when imsg is not found', () => {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('not found');
    });
    expect(checkImsgInstalled()).toBe(false);
  });
});

describe('MessagesClient', () => {
  let client: MessagesClient;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    client = new MessagesClient({ userEmail: 'test@icloud.com' });
  });

  afterEach(() => {
    client.dispose();
    vi.useRealTimers();
  });

  describe('initialize', () => {
    it('fails when imsg is not installed', async () => {
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('not found');
      });

      const result = client.initialize();
      expect(result.success).toBe(false);
      expect(result.error).toContain('imsg not installed');
    });

    it('finds existing chat by phone number', async () => {
      // Mock which imsg
      vi.mocked(execSync).mockReturnValueOnce('/opt/homebrew/bin/imsg');
      // Mock chats list
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":1,"identifier":"test@icloud.com","service":"SMS"}\n'
      );
      // Mock history for last message ID
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":100,"is_from_me":true,"text":"hello","guid":"abc","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );

      const result = client.initialize();
      expect(result.success).toBe(true);
    });

    it('succeeds when no existing chat found', async () => {
      vi.mocked(execSync).mockReturnValueOnce('/opt/homebrew/bin/imsg');
      vi.mocked(execSync).mockReturnValueOnce(''); // No chats

      const result = client.initialize();
      expect(result.success).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('sends message via imsg', async () => {
      vi.mocked(execSync).mockReturnValueOnce(''); // Send succeeds

      const result = client.sendMessage('test message');
      expect(result.success).toBe(true);
      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('imsg send'),
        expect.any(Object)
      );
    });

    it('returns error when send fails', async () => {
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('send failed');
      });

      const result = client.sendMessage('test message');
      expect(result.success).toBe(false);
      expect(result.error).toContain('send failed');
    });

    it('escapes double quotes in message', async () => {
      vi.mocked(execSync).mockReturnValueOnce('');

      client.sendMessage('test "quoted" message');
      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('test \\"quoted\\" message'),
        expect.any(Object)
      );
    });
  });

  describe('echo filtering (hash tracking)', () => {
    beforeEach(async () => {
      // Initialize client with a chat
      vi.mocked(execSync).mockReturnValueOnce('/opt/homebrew/bin/imsg');
      vi.mocked(execSync).mockReturnValueOnce('{"id":1,"identifier":"test@icloud.com","service":"SMS"}\n');
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.initialize();
    });

    it('filters echoed messages after send', async () => {
      const callback = vi.fn();

      // Send a message
      vi.mocked(execSync).mockReturnValueOnce(''); // send succeeds
      client.sendMessage('test message');

      // Start polling
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback);

      // Mock history with echo of our sent message (higher ID, is_from_me: false)
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":101,"is_from_me":false,"text":"test message","guid":"echo","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );

      // Trigger poll
      vi.advanceTimersByTime(2000);

      // Echo should be filtered - callback not called
      expect(callback).not.toHaveBeenCalled();
    });

    it('does not filter different messages', async () => {
      const callback = vi.fn();

      // Send a message
      vi.mocked(execSync).mockReturnValueOnce('');
      client.sendMessage('test message');

      // Start polling
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback);

      // Mock history with a different message
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":101,"is_from_me":false,"text":"user reply","guid":"diff","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );

      // Trigger poll
      vi.advanceTimersByTime(2000);

      // Different message should be delivered
      expect(callback).toHaveBeenCalledWith({
        sessionId: null,
        response: 'user reply',
      });
    });

    it('expires hashes after TTL (1 minute)', async () => {
      const callback = vi.fn();

      // Send a message
      vi.mocked(execSync).mockReturnValueOnce('');
      client.sendMessage('test message');

      // Start polling
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback);

      // Advance past TTL (60 seconds)
      vi.advanceTimersByTime(61000);

      // Send another message to trigger cleanup
      vi.mocked(execSync).mockReturnValueOnce('');
      client.sendMessage('another');

      // Now the old hash should be expired
      // Mock history with the old message text (would have been filtered before TTL)
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":102,"is_from_me":false,"text":"test message","guid":"late","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );

      // Trigger poll
      vi.advanceTimersByTime(2000);

      // Should now be delivered since hash expired
      expect(callback).toHaveBeenCalledWith({
        sessionId: null,
        response: 'test message',
      });
    });
  });

  describe('polling', () => {
    beforeEach(async () => {
      vi.mocked(execSync).mockReturnValueOnce('/opt/homebrew/bin/imsg');
      vi.mocked(execSync).mockReturnValueOnce('{"id":1,"identifier":"test@icloud.com","service":"SMS"}\n');
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.initialize();
    });

    it('starts polling at specified interval', () => {
      const callback = vi.fn();
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback, 5000);

      // Should poll after 5 seconds
      vi.mocked(execSync).mockReturnValue('');
      vi.advanceTimersByTime(5000);

      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('imsg history'),
        expect.any(Object)
      );
    });

    it('stops polling when stopPolling is called', () => {
      const callback = vi.fn();
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback);

      client.stopPolling();

      vi.mocked(execSync).mockClear();
      vi.advanceTimersByTime(10000);

      // Should not have called imsg history after stopping
      expect(vi.mocked(execSync)).not.toHaveBeenCalled();
    });

    it('skips messages with is_from_me: true', async () => {
      const callback = vi.fn();
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback);

      // Mock history with is_from_me: true message
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":101,"is_from_me":true,"text":"from me","guid":"mine","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );

      vi.advanceTimersByTime(2000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('skips already-processed message IDs', async () => {
      const callback = vi.fn();
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback);

      // First poll with new message
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":101,"is_from_me":false,"text":"new msg","guid":"new","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );
      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(1);

      // Second poll returns same message
      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":101,"is_from_me":false,"text":"new msg","guid":"new","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );
      vi.advanceTimersByTime(2000);

      // Should not be called again
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('parses session ID from [CC-xxx] prefix', async () => {
      const callback = vi.fn();
      vi.mocked(execSync).mockReturnValueOnce('{"id":100,"is_from_me":true,"text":"old","guid":"x","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n');
      client.startPolling(callback);

      vi.mocked(execSync).mockReturnValueOnce(
        '{"id":101,"is_from_me":false,"text":"[CC-abc123] yes","guid":"reply","chat_id":1,"sender":"test@icloud.com","created_at":"2024-01-01"}\n'
      );
      vi.advanceTimersByTime(2000);

      expect(callback).toHaveBeenCalledWith({
        sessionId: 'abc123',
        response: 'yes',
      });
    });
  });

  describe('verifyFromEmail', () => {
    it('returns true for matching normalized emails', () => {
      expect(client.verifyFromEmail('test@icloud.com')).toBe(true);
      expect(client.verifyFromEmail('TEST@ICLOUD.COM')).toBe(true);
      expect(client.verifyFromEmail('  test@icloud.com  ')).toBe(true);
    });

    it('returns false for different emails', () => {
      expect(client.verifyFromEmail('other@icloud.com')).toBe(false);
    });
  });
});
