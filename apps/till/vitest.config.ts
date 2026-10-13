import { defineConfig } from 'vitest/config';

// The till's libraries carry numinia-web's bar for libraries: per file,
// 100 % lines, functions and statements and 95 % branches (MIS-177). The
// meter, the repository and the Worker are measured and reported too; the
// bar is enforced on src/lib/**, as in the rest of the repository.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: [['text', { skipFull: false }], 'lcov'],
      include: ['src/**/*.ts'],
      thresholds: {
        'src/lib/**': {
          perFile: true,
          statements: 100,
          lines: 100,
          functions: 100,
          branches: 95,
        },
      },
    },
  },
});
