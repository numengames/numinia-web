/**
 * Inspector island — a minimal single-triangle GLB is built in-test (no
 * binaries in git) and fed through the file input; the island must render
 * it and report correct graph statistics. Files never leave the browser.
 */

import { test, expect } from '@playwright/test';
import { buildTriangleGlb } from './support/triangle-glb';

test.beforeEach(async ({ page }) => {
  await page.goto('/inspector/');
  // The beacon guarantees the file handler is attached (hydration race).
  await page.waitForSelector('[data-inspector][data-hydrated]');
});

test('renders a local GLB and reports its statistics', async ({ page }) => {
  await page.locator('[data-inspector] input[type="file"]').setInputFiles({
    name: 'triangle.glb',
    mimeType: 'model/gltf-binary',
    buffer: buildTriangleGlb(),
  });
  // 30s, not 15: alone this takes <1s, but a WebGL context under full
  // parallel suite load on a busy machine has hit 15s exactly once.
  await expect(page.locator('[data-inspector]')).toHaveAttribute('data-inspector-status', 'ready', {
    timeout: 30_000,
  });
  await expect(page.locator('[data-inspector] canvas')).toBeVisible();
  const stats = page.locator('[data-inspector-stats]');
  await expect(stats).toContainText('triangle.glb');
  const rows = stats.locator('.row');
  await expect(rows.nth(2)).toContainText('1'); // meshes
  await expect(rows.nth(4)).toContainText('1'); // triangles
});

test('rejects unsupported files without leaving the page', async ({ page }) => {
  await page.locator('[data-inspector] input[type="file"]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a model'),
  });
  await expect(page.locator('[data-inspector-unsupported]')).toBeVisible();
  await expect(page.locator('[data-inspector] canvas')).toHaveCount(0);
});

test('surfaces a load error for corrupt models', async ({ page }) => {
  await page.locator('[data-inspector] input[type="file"]').setInputFiles({
    name: 'broken.glb',
    mimeType: 'model/gltf-binary',
    buffer: Buffer.from('glTF-but-not-really'),
  });
  await expect(page.locator('[data-inspector-error]')).toBeVisible({ timeout: 15_000 });
});
