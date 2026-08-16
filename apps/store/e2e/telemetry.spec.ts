/**
 * Telemetry intake (MISSION-021/022): the beacon endpoint accepts an honest
 * report and swallows garbage without becoming an error mirror.
 */

import { expect, test } from '@playwright/test';

test('a client error report is accepted silently', async ({ request }) => {
  const response = await request.post('/api/telemetry', {
    data: { message: 'TypeError: x is not a function', source: 'app.js:1', path: '/es/' },
  });
  expect(response.status()).toBe(204);
});

test('garbage is dropped, never mirrored', async ({ request }) => {
  for (const body of [{ nonsense: true }, { message: '' }, 'not-json-object']) {
    const response = await request.post('/api/telemetry', { data: body });
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');
  }
});

test('the beacon script travels on every page', async ({ page }) => {
  await page.goto('/es/');
  const hasBeacon = await page.evaluate(() =>
    document.documentElement.outerHTML.includes('/api/telemetry'),
  );
  expect(hasBeacon).toBe(true);
});

test('the walls are up on SSR routes (middleware)', async ({ request }) => {
  // Prerendered pages never reach the middleware — their walls come from
  // public/_headers, which only Cloudflare applies: the deploy smoke test
  // asserts them against the LIVE site. Here we pin the SSR half.
  const api = await request.get('/api/auth/session');
  expect(api.headers()['x-content-type-options']).toBe('nosniff');
  expect(api.headers()['strict-transport-security']).toContain('max-age=');
  expect(api.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

test('the doorman throttles a telemetry flood with Retry-After', async ({ request }) => {
  let throttled = 0;
  for (let i = 0; i < 14; i += 1) {
    const response = await request.post('/api/telemetry', {
      data: { message: `flood ${i}` },
    });
    if (response.status() === 429) {
      throttled += 1;
      expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0);
    }
  }
  expect(throttled).toBeGreaterThan(0);
});

test('the media proxy refuses foreign hosts and empty input', async ({ request }) => {
  const missing = await request.get('/api/media');
  expect(missing.status()).toBe(400);
  const foreign = await request.get(
    '/api/media?src=' + encodeURIComponent('https://evil.com/x.glb'),
  );
  expect(foreign.status()).toBe(403);
});
