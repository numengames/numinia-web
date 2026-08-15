/**
 * Archive behavior — search/filter narrowing, detail navigation, and the
 * accessibility of a real detail page (the index is covered by a11y.spec).
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('archive lists assets and filters narrow the grid', async ({ page }) => {
  await page.goto('/archive/');
  const cards = page.locator('[data-archive-card]');
  const total = await cards.count();
  expect(total).toBeGreaterThanOrEqual(30);

  // Format filter narrows.
  await page.locator('[data-filter-format="vrm"]').click();
  const visibleAfterFilter = await cards.locator('visible=true').count();
  expect(visibleAfterFilter).toBeGreaterThan(0);
  expect(visibleAfterFilter).toBeLessThan(total);

  // Search narrows further and the empty message appears for garbage.
  await page.locator('#archive-search').fill('zzz-no-match');
  await expect(page.locator('[data-archive-no-results]')).toBeVisible();
  await page.locator('#archive-search').fill('');
  await page.locator('[data-filter-format=""]').click();
  await expect(page.locator('[data-archive-no-results]')).toBeHidden();
});

test('a detail page renders, passes WCAG A/AA, and offers a download', async ({ page }) => {
  await page.goto('/archive/');
  const firstCard = page.locator('[data-archive-card]').first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/archive\/.+/);
  await expect(page.locator('h1')).toBeVisible();

  const hasDownload = await page.locator('[data-metric="archive-download"]').count();
  const hasNotice = await page.locator('[data-download-unavailable]').count();
  expect(hasDownload + hasNotice).toBeGreaterThan(0);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Same exemption as a11y.spec: the binaria is decoration (WCAG 1.4.3).
    .exclude('.binaria')
    .analyze();
  expect(
    results.violations.map((violation) => violation.id),
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
});
