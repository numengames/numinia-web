import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The relay carries numinia-web's bar for libraries on every file it owns:
// per file, 100 % lines, functions and statements and 95 % branches.
export default defineConfig({
  resolve: {
    alias: {
      // workerd's own module does not resolve in Node: the OAuth library's
      // `WorkerEntrypoint` comes from the same kind of stand-in the till uses.
      'cloudflare:workers': fileURLToPath(
        new URL('./test/cloudflare-workers.ts', import.meta.url).href,
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Runs before any module is imported: the runtime's compatibility flags,
    // as workerd exposes them (`Cloudflare.compatibilityFlags`).
    setupFiles: ['test/runtime.ts'],
    // The OAuth library imports `cloudflare:workers` itself: it is bundled
    // through vite (not loaded by Node) so the alias above reaches it.
    server: { deps: { inline: ['@cloudflare/workers-oauth-provider'] } },
    coverage: {
      provider: 'v8',
      reporter: [['text', { skipFull: false }], 'lcov'],
      include: ['src/**/*.ts'],
      thresholds: {
        'src/**': {
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
