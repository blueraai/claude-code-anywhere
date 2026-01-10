import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('logger', () => {
  const loggerSource = readFileSync('src/shared/logger.ts', 'utf-8');

  describe('uses defaults for logging config', () => {
    it('does not use getRequiredEnvNumber', () => {
      expect(loggerSource).not.toContain('getRequiredEnvNumber');
    });

    it('has default for LOG_MAX_SIZE_MB', () => {
      // Should use process.env['LOG_MAX_SIZE_MB'] ?? '10' or similar
      expect(loggerSource).toMatch(/LOG_MAX_SIZE_MB.*\?\?.*['"]10['"]/);
    });

    it('has default for LOG_MAX_ROTATED_FILES', () => {
      // Should use process.env['LOG_MAX_ROTATED_FILES'] ?? '5' or similar
      expect(loggerSource).toMatch(/LOG_MAX_ROTATED_FILES.*\?\?.*['"]5['"]/);
    });
  });

  describe('uses canonical log location', () => {
    it('imports getLogsDir from config', () => {
      expect(loggerSource).toContain('import { getLogsDir }');
    });

    it('does not use __dirname', () => {
      expect(loggerSource).not.toContain('__dirname');
    });

    it('does not use fileURLToPath', () => {
      expect(loggerSource).not.toContain('fileURLToPath');
    });
  });
});
