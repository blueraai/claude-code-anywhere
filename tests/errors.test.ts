import { describe, it, expect } from 'vitest';
import {
  ConfigError,
  TelegramConfigError,
  EmailConfigError,
  MissingConfigError,
  StateError,
  SessionError,
  ChannelError,
  ApiError,
  TelegramApiError,
  EmailApiError,
  ServerError,
  ValidationError,
} from '../src/shared/errors.js';

describe('errors', () => {
  describe('ConfigError', () => {
    it('sets correct name and message', () => {
      const error = new ConfigError('Test message', 'testField');
      expect(error.name).toBe('ConfigError');
      expect(error.message).toBe('Test message');
      expect(error.field).toBe('testField');
    });

    it('extends Error', () => {
      const error = new ConfigError('Test', 'field');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('TelegramConfigError', () => {
    it('sets correct name and message', () => {
      const error = new TelegramConfigError('botToken');
      expect(error.name).toBe('TelegramConfigError');
      expect(error.message).toBe(
        'Telegram botToken missing. Set in ~/.claude/claude-code-anywhere/config.json'
      );
      expect(error.field).toBe('botToken');
    });

    it('extends ConfigError', () => {
      const error = new TelegramConfigError('botToken');
      expect(error).toBeInstanceOf(ConfigError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('EmailConfigError', () => {
    it('sets correct name and message', () => {
      const error = new EmailConfigError('user');
      expect(error.name).toBe('EmailConfigError');
      expect(error.message).toBe(
        'Email user missing. Set in ~/.claude/claude-code-anywhere/config.json'
      );
      expect(error.field).toBe('user');
    });

    it('extends ConfigError', () => {
      const error = new EmailConfigError('user');
      expect(error).toBeInstanceOf(ConfigError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('MissingConfigError', () => {
    it('sets correct name and message', () => {
      const error = new MissingConfigError('smtpHost');
      expect(error.name).toBe('MissingConfigError');
      expect(error.message).toBe('Missing required config: smtpHost');
      expect(error.field).toBe('smtpHost');
    });

    it('extends ConfigError', () => {
      const error = new MissingConfigError('field');
      expect(error).toBeInstanceOf(ConfigError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StateError', () => {
    it('sets correct name, message, and path', () => {
      const error = new StateError('Invalid format', '/path/to/state.json');
      expect(error.name).toBe('StateError');
      expect(error.message).toBe('Invalid format at /path/to/state.json');
      expect(error.path).toBe('/path/to/state.json');
    });

    it('extends Error', () => {
      const error = new StateError('msg', '/path');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('SessionError', () => {
    it('sets correct name and message', () => {
      const error = new SessionError('abc-123');
      expect(error.name).toBe('SessionError');
      expect(error.message).toBe('Session abc-123 does not exist');
      expect(error.sessionId).toBe('abc-123');
    });

    it('extends Error', () => {
      const error = new SessionError('id');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ChannelError', () => {
    it('sets correct name and message without channel', () => {
      const error = new ChannelError('No enabled channels');
      expect(error.name).toBe('ChannelError');
      expect(error.message).toBe('No enabled channels');
      expect(error.channel).toBeUndefined();
    });

    it('sets correct name, message, and channel', () => {
      const error = new ChannelError('Channel already registered', 'telegram');
      expect(error.name).toBe('ChannelError');
      expect(error.message).toBe('Channel already registered');
      expect(error.channel).toBe('telegram');
    });

    it('extends Error', () => {
      const error = new ChannelError('msg');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ApiError', () => {
    it('sets correct name, message, and service', () => {
      const error = new ApiError('Request failed', 'telegram');
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Request failed');
      expect(error.service).toBe('telegram');
    });

    it('extends Error', () => {
      const error = new ApiError('msg', 'service');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('TelegramApiError', () => {
    it('sets correct name, message, and service', () => {
      const error = new TelegramApiError('Rate limit exceeded');
      expect(error.name).toBe('TelegramApiError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.service).toBe('telegram');
    });

    it('extends ApiError', () => {
      const error = new TelegramApiError('msg');
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('EmailApiError', () => {
    it('sets correct name, message, and service', () => {
      const error = new EmailApiError('SMTP connection failed');
      expect(error.name).toBe('EmailApiError');
      expect(error.message).toBe('SMTP connection failed');
      expect(error.service).toBe('email');
    });

    it('extends ApiError', () => {
      const error = new EmailApiError('msg');
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ServerError', () => {
    it('sets correct name and message', () => {
      const error = new ServerError('Server not started');
      expect(error.name).toBe('ServerError');
      expect(error.message).toBe('Server not started');
    });

    it('extends Error', () => {
      const error = new ServerError('msg');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('sets correct name and message without field', () => {
      const error = new ValidationError('Invalid format');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid format');
      expect(error.field).toBeUndefined();
    });

    it('sets correct name, message, and field', () => {
      const error = new ValidationError('Invalid callback data', 'callbackData');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid callback data');
      expect(error.field).toBe('callbackData');
    });

    it('extends Error', () => {
      const error = new ValidationError('msg');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
