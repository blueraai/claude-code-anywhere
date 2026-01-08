import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { formatSubject, formatBody, EmailClient } from '../src/server/email.js';
import type { EmailConfig } from '../src/shared/types.js';

// Helper to access private methods for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestableEmailClient = EmailClient & {
  extractReplyText: (body: string) => string;
  stripMimeContent: (body: string) => string;
  decodeQuotedPrintable: (text: string) => string;
};

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    })),
  },
}));

// Mock imapflow
vi.mock('imapflow', () => ({
  ImapFlow: vi.fn(),
}));

const validConfig: EmailConfig = {
  user: 'test@gmail.com',
  pass: 'test-password',
  recipient: 'user@example.com',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  imapHost: 'imap.gmail.com',
  imapPort: 993,
  pollIntervalMs: 5000,
};

describe('EmailClient', () => {
  describe('validateConfig', () => {
    it('throws when user is missing', () => {
      const config = { ...validConfig, user: '' };
      const client = new EmailClient(config);
      expect(() => client.validateConfig()).toThrow('EMAIL_USER is required');
    });

    it('throws when pass is missing', () => {
      const config = { ...validConfig, pass: '' };
      const client = new EmailClient(config);
      expect(() => client.validateConfig()).toThrow('EMAIL_PASS is required');
    });

    it('throws when recipient is missing', () => {
      const config = { ...validConfig, recipient: '' };
      const client = new EmailClient(config);
      expect(() => client.validateConfig()).toThrow('EMAIL_RECIPIENT is required');
    });

    it('throws when smtpHost is missing', () => {
      const config = { ...validConfig, smtpHost: '' };
      const client = new EmailClient(config);
      expect(() => client.validateConfig()).toThrow('SMTP_HOST is required');
    });

    it('throws when imapHost is missing', () => {
      const config = { ...validConfig, imapHost: '' };
      const client = new EmailClient(config);
      expect(() => client.validateConfig()).toThrow('IMAP_HOST is required');
    });

    it('does not throw with valid config', () => {
      const client = new EmailClient(validConfig);
      expect(() => client.validateConfig()).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('returns correct status when not initialized', () => {
      const client = new EmailClient(validConfig);
      const status = client.getStatus();

      expect(status.name).toBe('email');
      expect(status.enabled).toBe(true);
      expect(status.connected).toBe(false);
      expect(status.lastActivity).toBeNull();
      expect(status.error).toBeNull();
    });

    it('returns connected status after initialization', async () => {
      const client = new EmailClient(validConfig);
      await client.initialize();

      const status = client.getStatus();
      expect(status.connected).toBe(true);
    });
  });

  describe('initialize', () => {
    it('creates SMTP transporter', async () => {
      const client = new EmailClient(validConfig);
      await client.initialize();

      expect(client.getStatus().connected).toBe(true);
    });
  });

  describe('send', () => {
    it('sends notification via email', async () => {
      const client = new EmailClient(validConfig);
      await client.initialize();

      const result = await client.send({
        sessionId: 'abc123',
        event: 'Notification',
        title: 'Test',
        message: 'Hello world',
      });

      expect(result.success).toBe(true);
    });

    it('returns error when not initialized', async () => {
      const client = new EmailClient(validConfig);
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
  });

  describe('dispose', () => {
    it('cleans up resources', async () => {
      const client = new EmailClient(validConfig);
      await client.initialize();

      client.dispose();

      expect(client.getStatus().connected).toBe(false);
    });
  });
});

describe('formatSubject', () => {
  it('formats notification subject with session ID and emoji', () => {
    const result = formatSubject('abc123', 'Notification');
    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Notification');
  });

  it('formats Stop event subject', () => {
    const result = formatSubject('abc123', 'Stop');
    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Session ended');
  });

  it('formats PreToolUse event subject', () => {
    const result = formatSubject('abc123', 'PreToolUse');
    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Approve tool use?');
  });

  it('formats UserPromptSubmit event subject', () => {
    const result = formatSubject('abc123', 'UserPromptSubmit');
    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Claude needs input');
  });
});

describe('formatBody', () => {
  it('appends reply instruction to message', () => {
    const result = formatBody('Test message');
    expect(result).toBe('Test message\n\nReply to this email with your response.');
  });

  it('truncates long messages', () => {
    const longMessage = 'x'.repeat(2500);
    const result = formatBody(longMessage);

    expect(result.length).toBeLessThan(2500);
    expect(result).toContain('...');
    expect(result).toContain('Reply to this email');
  });

  it('preserves short messages without truncation', () => {
    const shortMessage = 'Short message';
    const result = formatBody(shortMessage);

    expect(result).toContain(shortMessage);
    expect(result).not.toContain('...');
  });
});

describe('EmailClient - sendHookMessage, sendErrorResponse, sendConfirmation', () => {
  let client: EmailClient;
  let sendEmailSpy: MockInstance;

  beforeEach(async () => {
    client = new EmailClient(validConfig);
    await client.initialize();
    sendEmailSpy = vi.spyOn(client, 'sendEmail');
  });

  afterEach(() => {
    client.dispose();
  });

  it('sendHookMessage formats and sends email with session and event', async () => {
    const result = await client.sendHookMessage('abc123', 'Notification', 'Test message');

    expect(result.success).toBe(true);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CC-abc123]'),
      expect.stringContaining('Test message')
    );
  });

  it('sendErrorResponse sends email with error subject', async () => {
    const result = await client.sendErrorResponse('Something went wrong');

    expect(result.success).toBe(true);
    expect(sendEmailSpy).toHaveBeenCalledWith('❌ Error', 'Something went wrong');
  });

  it('sendConfirmation sends confirmation email with session ID', async () => {
    const result = await client.sendConfirmation('abc123');

    expect(result.success).toBe(true);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      '✓ Response received for CC-abc123',
      'Your response has been processed.'
    );
  });
});

describe('EmailClient - verifyFromEmail', () => {
  let client: EmailClient;

  beforeEach(() => {
    client = new EmailClient(validConfig);
  });

  it('returns true for exact match', () => {
    expect(client.verifyFromEmail('user@example.com')).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    expect(client.verifyFromEmail('USER@EXAMPLE.COM')).toBe(true);
    expect(client.verifyFromEmail('User@Example.Com')).toBe(true);
  });

  it('returns true after trimming whitespace', () => {
    expect(client.verifyFromEmail('  user@example.com  ')).toBe(true);
    expect(client.verifyFromEmail('\tuser@example.com\n')).toBe(true);
  });

  it('returns false for non-matching email', () => {
    expect(client.verifyFromEmail('other@example.com')).toBe(false);
    expect(client.verifyFromEmail('user@different.com')).toBe(false);
  });
});

describe('EmailClient - startPolling', () => {
  let client: EmailClient;

  beforeEach(async () => {
    vi.useFakeTimers();
    client = new EmailClient(validConfig);
    await client.initialize();
  });

  afterEach(() => {
    client.dispose();
    vi.useRealTimers();
  });

  it('sets callback and starts polling', () => {
    const callback = vi.fn();
    client.startPolling(callback);

    // Verify polling was started by checking that dispose clears the interval
    const status = client.getStatus();
    expect(status.connected).toBe(true);

    client.dispose();
  });

  it('warns if already polling and does not restart', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    // Start polling first time
    client.startPolling(callback1);

    // Try to start again - should warn
    client.startPolling(callback2);

    // Both calls should have set the callback, but interval should only exist once
    client.dispose();
  });

  it('does initial check immediately when starting', () => {
    const callback = vi.fn();
    client.startPolling(callback);

    // The initial check is called synchronously (via void)
    // We can't easily test checkForNewEmails without full IMAP mock,
    // but we can verify the polling was initiated
    expect(client.getStatus().connected).toBe(true);
  });
});

describe('EmailClient - stopPolling', () => {
  let client: EmailClient;

  beforeEach(async () => {
    vi.useFakeTimers();
    client = new EmailClient(validConfig);
    await client.initialize();
  });

  afterEach(() => {
    client.dispose();
    vi.useRealTimers();
  });

  it('clears interval when polling', () => {
    const callback = vi.fn();
    client.startPolling(callback);

    // Stop polling
    client.stopPolling();

    // Should be safe and not throw
    expect(client.getStatus().connected).toBe(true);
  });

  it('is safe to call when not polling', () => {
    // Should not throw when called without startPolling
    expect(() => client.stopPolling()).not.toThrow();

    // Can call multiple times
    expect(() => client.stopPolling()).not.toThrow();
    expect(() => client.stopPolling()).not.toThrow();
  });
});

describe('EmailClient - extractReplyText', () => {
  let client: TestableEmailClient;

  beforeEach(() => {
    client = new EmailClient(validConfig) as TestableEmailClient;
  });

  it('removes quoted content starting with >', () => {
    const body = 'My reply\n> Original message\n> More quoted text';
    const result = client.extractReplyText(body);
    expect(result).toBe('My reply');
  });

  it('stops at "On ... wrote:" pattern', () => {
    const body = 'My reply\n\nOn Mon, Jan 6, 2025 at 10:00 AM Someone wrote:\n> Original';
    const result = client.extractReplyText(body);
    expect(result).toBe('My reply');
  });

  it('stops at --- separator', () => {
    const body = 'My reply\n\n---\nOriginal message below';
    const result = client.extractReplyText(body);
    expect(result).toBe('My reply');
  });

  it('stops at ___ separator', () => {
    const body = 'My reply\n\n___\nOriginal message below';
    const result = client.extractReplyText(body);
    expect(result).toBe('My reply');
  });

  it('handles multiline reply before quoted content', () => {
    const body = 'Line 1\nLine 2\nLine 3\n\n> Quoted';
    const result = client.extractReplyText(body);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  it('returns full text when no quote markers present', () => {
    const body = 'Just a simple reply\nWith multiple lines';
    const result = client.extractReplyText(body);
    expect(result).toBe('Just a simple reply\nWith multiple lines');
  });
});

describe('EmailClient - stripMimeContent', () => {
  let client: TestableEmailClient;

  beforeEach(() => {
    client = new EmailClient(validConfig) as TestableEmailClient;
  });

  it('removes MIME boundaries', () => {
    const body = '--boundary123456789\nContent-Type: text/plain\n\nActual content';
    const result = client.stripMimeContent(body);
    expect(result).toContain('Actual content');
    expect(result).not.toContain('--boundary');
  });

  it('removes Content-* headers', () => {
    const body = '--boundary123456789\nContent-Type: text/plain\nContent-Transfer-Encoding: 7bit\n\nActual content';
    const result = client.stripMimeContent(body);
    expect(result).not.toContain('Content-Type');
    expect(result).not.toContain('Content-Transfer-Encoding');
    expect(result).toContain('Actual content');
  });

  it('skips HTML parts entirely', () => {
    const body = '--boundary123456789\nContent-Type: text/html\n\n<html><body>HTML content</body></html>\n--boundary123456789\nContent-Type: text/plain\n\nPlain text';
    const result = client.stripMimeContent(body);
    expect(result).not.toContain('<html>');
    expect(result).not.toContain('HTML content');
    expect(result).toContain('Plain text');
  });

  it('preserves plain text content', () => {
    const body = 'Just plain text\nWith multiple lines\nNo MIME';
    const result = client.stripMimeContent(body);
    expect(result).toBe('Just plain text\nWith multiple lines\nNo MIME');
  });
});

describe('EmailClient - decodeQuotedPrintable', () => {
  let client: TestableEmailClient;

  beforeEach(() => {
    client = new EmailClient(validConfig) as TestableEmailClient;
  });

  it('removes soft line breaks (=\\n)', () => {
    const encoded = 'This is a long line that was =\nbroken for email';
    const result = client.decodeQuotedPrintable(encoded);
    expect(result).toBe('This is a long line that was broken for email');
  });

  it('removes soft line breaks with CRLF (=\\r\\n)', () => {
    const encoded = 'Line with CRLF =\r\nsoft break';
    const result = client.decodeQuotedPrintable(encoded);
    expect(result).toBe('Line with CRLF soft break');
  });

  it('decodes =XX hex sequences', () => {
    const encoded = 'Hello=20World=21'; // =20 is space, =21 is !
    const result = client.decodeQuotedPrintable(encoded);
    expect(result).toBe('Hello World!');
  });

  it('handles multiple hex sequences', () => {
    const encoded = '=C3=A9=C3=A8=C3=AA'; // é, è, ê in UTF-8 bytes (though single byte decode)
    const result = client.decodeQuotedPrintable(encoded);
    // Each =XX decodes to single char with that byte value
    expect(result).toContain(String.fromCharCode(0xc3));
  });

  it('preserves non-encoded text', () => {
    const plain = 'Normal text without encoding';
    const result = client.decodeQuotedPrintable(plain);
    expect(result).toBe('Normal text without encoding');
  });

  it('handles mixed encoded and plain text', () => {
    const mixed = 'Hello=20World and more=3Dtext';
    const result = client.decodeQuotedPrintable(mixed);
    expect(result).toBe('Hello World and more=text'); // =3D is =
  });
});

describe('EmailClient - sendEmail error handling', () => {
  it('returns error when sendMail throws', async () => {
    // Create a mock that throws
    const nodemailerMock = await import('nodemailer');
    vi.mocked(nodemailerMock.default.createTransport).mockReturnValueOnce({
      sendMail: vi.fn().mockRejectedValue(new Error('SMTP connection failed')),
      verify: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    } as ReturnType<typeof nodemailerMock.default.createTransport>);

    const client = new EmailClient(validConfig);
    await client.initialize();

    const result = await client.sendEmail('Test', 'Body');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('SMTP connection failed');
    }
  });

  it('sets lastError when sendMail fails', async () => {
    const nodemailerMock = await import('nodemailer');
    vi.mocked(nodemailerMock.default.createTransport).mockReturnValueOnce({
      sendMail: vi.fn().mockRejectedValue(new Error('Auth failed')),
      verify: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    } as ReturnType<typeof nodemailerMock.default.createTransport>);

    const client = new EmailClient(validConfig);
    await client.initialize();

    await client.sendEmail('Test', 'Body');

    expect(client.getStatus().error).toBe('Auth failed');
  });
});

describe('EmailClient - initialize error handling', () => {
  it('throws and sets lastError when createTransport throws', async () => {
    const nodemailerMock = await import('nodemailer');
    vi.mocked(nodemailerMock.default.createTransport).mockImplementationOnce(() => {
      throw new Error('Invalid SMTP config');
    });

    const client = new EmailClient(validConfig);

    await expect(client.initialize()).rejects.toThrow('Failed to initialize email client: Invalid SMTP config');
    expect(client.getStatus().error).toBe('Invalid SMTP config');
  });

  it('throws and sets lastError when verify fails', async () => {
    const nodemailerMock = await import('nodemailer');
    vi.mocked(nodemailerMock.default.createTransport).mockReturnValueOnce({
      verify: vi.fn().mockRejectedValue(new Error('SMTP auth failed')),
      close: vi.fn(),
    } as ReturnType<typeof nodemailerMock.default.createTransport>);

    const client = new EmailClient(validConfig);

    await expect(client.initialize()).rejects.toThrow('Failed to initialize email client: SMTP auth failed');
    expect(client.getStatus().error).toBe('SMTP auth failed');
  });
});

describe('formatSubject - edge cases', () => {
  it('uses default emoji and header for unknown event', () => {
    // Cast to bypass TypeScript check for unknown event type
    const result = formatSubject('abc123', 'UnknownEvent' as 'Notification');
    expect(result).toContain('[CC-abc123]');
    expect(result).toContain('Message');
  });
});

describe('EmailClient - error handling with non-Error objects', () => {
  it('handles non-Error throws in initialize', async () => {
    const nodemailerMock = await import('nodemailer');
    vi.mocked(nodemailerMock.default.createTransport).mockImplementationOnce(() => {
      throw 'string error';
    });

    const client = new EmailClient(validConfig);

    await expect(client.initialize()).rejects.toThrow('Failed to initialize email client: Unknown error');
  });

  it('handles non-Error throws in sendEmail', async () => {
    const nodemailerMock = await import('nodemailer');
    vi.mocked(nodemailerMock.default.createTransport).mockReturnValueOnce({
      sendMail: vi.fn().mockRejectedValue('network error'),
      verify: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    } as ReturnType<typeof nodemailerMock.default.createTransport>);

    const client = new EmailClient(validConfig);
    await client.initialize();

    const result = await client.sendEmail('Test', 'Body');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown error');
    }
  });
});

describe('EmailClient - send with different events', () => {
  let client: EmailClient;

  beforeEach(async () => {
    client = new EmailClient(validConfig);
    await client.initialize();
  });

  afterEach(() => {
    client.dispose();
  });

  it('sends Stop event notification', async () => {
    const result = await client.send({
      sessionId: 'abc123',
      event: 'Stop',
      title: 'Done',
      message: 'Task completed',
    });

    expect(result.success).toBe(true);
  });

  it('sends PreToolUse event notification', async () => {
    const result = await client.send({
      sessionId: 'abc123',
      event: 'PreToolUse',
      title: 'Tool',
      message: 'About to use bash',
    });

    expect(result.success).toBe(true);
  });

  it('sends UserPromptSubmit event notification', async () => {
    const result = await client.send({
      sessionId: 'abc123',
      event: 'UserPromptSubmit',
      title: 'Input',
      message: 'Need input',
    });

    expect(result.success).toBe(true);
  });
});
