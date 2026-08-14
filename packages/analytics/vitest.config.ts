import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      thresholds: {
        perFile: true,
        statements: 100,
        lines: 100,
        functions: 100,
        branches: 95,
      },
    },
  },
});
