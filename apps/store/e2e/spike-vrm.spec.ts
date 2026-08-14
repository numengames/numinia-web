/**
 * DECISION GATE evidence: the VRM island must actually render in a browser.
 * Loads the spike page, waits for hydration (client:visible) and for
 * @pixiv/three-vrm to finish loading the real avatar from the data repo.
 */

import { expect, test } from '@playwright/test';

test('VRM avatar renders inside the Astro React island', async ({ page }) => {
  await page.goto('/spike/');

  // Real catalog data validated at build time.
  const count = await page
    .locator('[data-spike-catalog-count]')
    .getAttribute('data-spike-catalog-count');
  expect(Number(count)).toBeGreaterThan(0);

  // client:visible: the island hydrates when scrolled into view.
  await page.locator('figure[data-vrm-status]').scrollIntoViewIfNeeded();

  // The island flips this attribute only after the VRM scene is added.
  await expect(page.locator('[data-vrm-loaded="true"]')).toBeVisible({ timeout: 90_000 });

  // The canvas must have real WebGL content (not a blank context).
  const pixelSum = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return -1;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return -2;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let sum = 0;
    for (const value of pixels) sum += value;
    return sum;
  });
  expect(pixelSum).toBeGreaterThan(0);
});
