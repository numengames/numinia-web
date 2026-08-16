/**
 * Automatic preferences (MISSION-029): the OS decides only while the
 * citizen has not — mode follows prefers-color-scheme, language follows
 * navigator.language once, on the root, on first visit. Stored choices
 * always win, and the no-JS layer never depends on any of it.
 */

import { expect, test } from '@playwright/test';

test('a dark OS gets Nocturno without asking', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/es/city/');
  await expect(page.locator('html')).toHaveAttribute('data-modo', 'nocturno');
  await context.close();
});

test('a stored Diurno beats a dark OS — the citizen already chose', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('numinia-modo', 'diurno'));
  await page.goto('/es/city/');
  await expect(page.locator('html')).toHaveAttribute('data-modo', 'diurno');
  await context.close();
});

test('a Spanish browser lands on /es/ once, and only once', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-ES' });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForURL('**/es/');
  expect(new URL(page.url()).pathname).toBe('/es/');
  // The detection stored itself: revisiting the root now respects it.
  await page.goto('/');
  await page.waitForTimeout(400);
  expect(new URL(page.url()).pathname).toBe('/');
  await context.close();
});

test('an unsupported locale stays on the English root', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForTimeout(400);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(await page.evaluate(() => localStorage.getItem('numinia-lang'))).toBe('en');
  await context.close();
});

test('choosing a language in the menu is remembered', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/es/');
  await page.locator('[data-lang-menu] summary').click();
  await page.locator('[data-metric="lang-ja"]').click();
  await page.waitForURL('**/ja/');
  expect(await page.evaluate(() => localStorage.getItem('numinia-lang'))).toBe('ja');
  await context.close();
});
