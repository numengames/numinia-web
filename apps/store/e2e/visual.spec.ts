/**
 * Visual regression — pixel baselines for the pages whose look is the product.
 * Baselines live in e2e/visual.spec.ts-snapshots/ and are committed; update
 * intentionally with `npx playwright test visual --update-snapshots`.
 *
 * The 3D viewer is excluded: WebGL output is not deterministic enough across
 * GPUs/drivers for pixel equality (the spike test asserts it renders at all).
 */

import { test, expect, type Page } from '@playwright/test';

// Baselines were rendered on the dev machine; CI runners draw fonts
// differently, so the suite is local-only until baselines are regenerated
// inside the CI image (tracked in docs/remote-checklist.md, push day).
test.skip(!!process.env.CI, 'visual baselines are local-only until CI regenerates them');

const PAGES = [
  { path: '/', name: 'landing-en' },
  { path: '/es/', name: 'landing-es' },
  { path: '/archive/', name: 'archive-index' },
  { path: '/es/archive/', name: 'archive-index-es' },
  { path: '/gallery/', name: 'gallery' },
  { path: '/es/gallery/', name: 'gallery-es' },
  { path: '/finder/', name: 'finder' },
] as const;

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Fonts finish layout-shifting after load; wait for the ready promise.
  await page.evaluate(() => document.fonts.ready);
}

for (const { path, name } of PAGES) {
  test(`visual: ${name} (${path})`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}

test('visual: archive detail (stable asset, viewer masked)', async ({ page }) => {
  // Navigate via the index so the test breaks loudly if the archive is empty.
  await page.goto('/archive/');
  await settle(page);
  const firstCard = page.locator('[data-metric="archive-card"]').first();
  await firstCard.click();
  await page.waitForURL(/\/archive\/.+/);
  await settle(page);
  await expect(page).toHaveScreenshot('archive-detail.png', {
    fullPage: true,
    mask: [page.locator('canvas')],
  });
});
