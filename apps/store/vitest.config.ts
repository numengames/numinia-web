import { defineConfig } from 'vitest/config';

// Unit tests cover the pure server-side lib; pages/components stay under the
// Playwright e2e + Gherkin acceptance suites (they need a browser or a build).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/lib/*.ts'],
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
