import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        'dist',
        'tests',
        '.ignore',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js',
        'src/index.ts', // Re-exports only
        'src/cli.ts', // Entry point
        'src/shared/types.ts', // Type definitions only
        'src/shared/channel.ts', // Type definitions only
        'src/server/index.ts', // Entry point / wiring
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
