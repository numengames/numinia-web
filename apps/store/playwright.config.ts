import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  /**
   * Engines: the suite runs on Chromium; the cross-browser gate ALSO runs on
   * Firefox and WebKit (Safari/iPhone share that engine). Visual baselines
   * and island specs stay Chromium-only — pixels and WebGL differ per engine
   * by nature, and duplicating them would only produce noise.
   */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      testMatch: /cross-browser\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    // WebKit is the iPhone/Safari engine and the gate is written for it, but
    // its launch needs system libs this workstation lacks (libicu, libjpeg).
    // Opt in where they exist — `PLAYWRIGHT_WEBKIT=1 npm run e2e` — or in CI
    // after `npx playwright install-deps`. Silence here would be a lie.
    ...(process.env['PLAYWRIGHT_WEBKIT'] === '1' || process.env['CI']
      ? [
          {
            name: 'webkit',
            testMatch: /cross-browser\.spec\.ts/,
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
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
