import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('logger', () => {
  const loggerSource = readFileSync('src/shared/logger.ts', 'utf-8');

  describe('requires env vars (fail fast per CLAUDE.md)', () => {
    it('uses getRequiredEnvNumber for LOG_MAX_SIZE_MB', () => {
      // CLAUDE.md: Required env vars (no defaults - fail fast)
      expect(loggerSource).toContain("getRequiredEnvNumber('LOG_MAX_SIZE_MB')");
    });

    it('uses getRequiredEnvNumber for LOG_MAX_ROTATED_FILES', () => {
      // CLAUDE.md: Required env vars (no defaults - fail fast)
      expect(loggerSource).toContain("getRequiredEnvNumber('LOG_MAX_ROTATED_FILES')");
    });

    it('does not use nullish coalescing with hardcoded values', () => {
      // Must fail fast, not use ?? with hardcoded values
      expect(loggerSource).not.toMatch(/LOG_MAX_SIZE_MB.*\?\?/);
      expect(loggerSource).not.toMatch(/LOG_MAX_ROTATED_FILES.*\?\?/);
    });
  });

  describe('uses canonical log location', () => {
    it('imports getLogsDir from config', () => {
      expect(loggerSource).toMatch(/import \{[^}]*getLogsDir[^}]*\} from ['"]\.\/config\.js['"]/);
    });

    it('does not use __dirname', () => {
      expect(loggerSource).not.toContain('__dirname');
    });

    it('does not use fileURLToPath', () => {
      expect(loggerSource).not.toContain('fileURLToPath');
    });
  });
});
