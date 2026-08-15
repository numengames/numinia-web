/**
 * Visual regression — pixel baselines for the pages whose look is the product.
 * Baselines live in e2e/visual.spec.ts-snapshots/ and are committed; update
 * intentionally with `npx playwright test visual --update-snapshots`.
 *
 * The 3D viewer is excluded: WebGL output is not deterministic enough across
 * GPUs/drivers for pixel equality (the spike test asserts it renders at all).
 */

import { test, expect, type Page } from '@playwright/test';
import { buildTriangleGlb } from './support/triangle-glb';

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
  // The typing headline (§10-01) must FINISH before pixels are compared:
  // while typing, the element carries aria-label and the block cursor, and a
  // half-typed headline wraps to fewer lines, shifting the whole page. The
  // reference implementation removes both when done (or never adds them
  // under reduced motion).
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('[data-tecleo]')].every(
          (el) => !el.hasAttribute('aria-label') && !el.querySelector('.cursor'),
        ),
      { timeout: 15_000 },
    )
    .catch(() => undefined);
}

for (const { path, name } of PAGES) {
  test(`visual: ${name} (${path})`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}

test('visual: archive detail (stable asset, viewer masked)', async ({ page }) => {
  // Hermetic: the viewer island fetches the real model from the storage
  // chain (R2/Arweave) — unreachable from this network on LaLiga block days
  // and a flake source anywhere. The canvas is masked in the baseline, so a
  // minimal local GLB keeps the pixels identical while letting the page
  // reach networkidle. Real-model rendering is the spike test's job.
  await page.route(/\.(glb|vrm)(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'model/gltf-binary',
      body: buildTriangleGlb(),
    }),
  );
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
