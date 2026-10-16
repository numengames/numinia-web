/**
 * «Encuentros» (/calendar/, v3 lane 2) in a real browser against the built
 * site: the list by month is what a person sees first, each row opens its
 * encounter, and «Mes» swaps the list for the month grid and back.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Encuentros opens on the list by month, and «Mes» swaps it for the grid', async ({ page }) => {
  await page.goto('/es/calendar/');
  await expect(page.locator('h1')).toHaveText('Encuentros');

  const list = page.locator('[data-enc-panel="list"]');
  const grid = page.locator('[data-enc-panel="month"]');
  await expect(list).toBeVisible();
  await expect(grid).toBeHidden();
  await expect(list.locator('.mes-lista h2').first()).toHaveText(/de 20\d\d$/);
  const rows = list.locator('[data-enc-row]');
  expect(await rows.count()).toBeGreaterThan(0);

  const listButton = page.locator('[data-metric="encuentros-view-list"]');
  const monthButton = page.locator('[data-metric="encuentros-view-month"]');
  await expect(listButton).toHaveAttribute('aria-pressed', 'true');
  await monthButton.click();
  await expect(monthButton).toHaveAttribute('aria-pressed', 'true');
  await expect(listButton).toHaveAttribute('aria-pressed', 'false');
  await expect(grid).toBeVisible();
  await expect(list).toBeHidden();
  await expect(grid.locator('.ev').first()).toBeVisible();

  await listButton.click();
  await expect(list).toBeVisible();
  await expect(grid).toBeHidden();

  // A row opens its encounter.
  const first = rows.first().locator('h3 a');
  const href = await first.getAttribute('href');
  await first.click();
  await page.waitForURL(`**${href}`);
});

test('without JavaScript the list is there and no dead switch shows', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/calendar/');
  await expect(page.locator('h1')).toHaveText('Gatherings');
  await expect(page.locator('[data-enc-panel="list"] [data-enc-row]').first()).toBeVisible();
  await expect(page.locator('[data-enc-views]')).toBeHidden();
  await context.close();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Encuentros passes axe in both views (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/es/calendar/');
    const list = await new AxeBuilder({ page }).analyze();
    expect(list.violations).toEqual([]);
    await page.locator('[data-metric="encuentros-view-month"]').click();
    const grid = await new AxeBuilder({ page }).analyze();
    expect(grid.violations).toEqual([]);
  });
}
