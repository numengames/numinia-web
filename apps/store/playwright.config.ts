import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  // Visual baselines are keyed by platform; a small ratio absorbs font
  // antialiasing drift between local Linux and CI runners.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:4321',
    viewport: { width: 1280, height: 720 },
    // Khepri §10: with reduced motion everything is instant — deterministic
    // pixels for baselines, and the accessibility path gets exercised.
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'node dist/server/entry.mjs',
    port: 4321,
    // NEVER reuse: a lingering dev daemon on 4321 poisoned three runs with
    // HMR state (phantom island failures). If the port is busy, fail loudly
    // and stop the dev server first: `npx astro dev stop`.
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
