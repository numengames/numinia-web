import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'node dist/server/entry.mjs',
    port: 4321,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
