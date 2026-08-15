/**
 * Finder island interaction — selection flows, preview, and the download
 * queue. Runs against the built server (fixture data).
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/finder/');
  await page.waitForSelector('[data-finder]');
});

test('selecting a collection fills the file list and preview follows the file', async ({
  page,
}) => {
  test.slow(); // the preview is a WebGL island — starved under parallel load
  const collections = page.locator('[data-metric="finder-collection"]');
  expect(await collections.count()).toBeGreaterThan(0);

  await collections.last().click();
  const files = page.locator('[data-metric="finder-file"]');
  expect(await files.count()).toBeGreaterThan(0);

  await expect(page.locator('[data-finder-preview-empty]')).toBeVisible();
  const firstFile = files.first();
  const fileName = (await firstFile.locator('.name').textContent()) ?? '';
  await firstFile.click();
  await expect(page.locator('[data-finder-preview] h3')).toHaveText(fileName);
  await expect(firstFile).toHaveAttribute('aria-pressed', 'true');
});

test('the queue accumulates, deduplicates, and empties', async ({ page }) => {
  const count = page.locator('[data-finder-queue-count]');
  await expect(count).toHaveText('0');

  const toggles = page.locator('[data-metric="finder-queue-toggle"]');
  await toggles.nth(0).click();
  await toggles.nth(1).click();
  await expect(count).toHaveText('2');
  await expect(page.locator('[data-metric="finder-download-all"]')).toBeEnabled();

  // Toggling the same file again removes it (no duplicates by construction).
  await toggles.nth(0).click();
  await expect(count).toHaveText('1');

  await page.locator('[data-metric="finder-queue-remove"]').click();
  await expect(count).toHaveText('0');
  await expect(page.locator('[data-metric="finder-download-all"]')).toHaveCount(0);
});

test('collection switch resets the file selection', async ({ page }) => {
  const collections = page.locator('[data-metric="finder-collection"]');
  await page.locator('[data-metric="finder-file"]').first().click();
  await expect(page.locator('[data-finder-preview] h3')).toBeVisible();
  await collections.last().click();
  await expect(page.locator('[data-finder-preview-empty]')).toBeVisible();
});
