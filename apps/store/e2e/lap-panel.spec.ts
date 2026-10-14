/**
 * The LAP panel after the Oracle's walkthrough (2026-10-14): a quiet panel
 * by default whose choices stick, «Novedades» inside the panel, and the
 * «en construcción» marks on what does not work yet.
 */

import { expect, test, type Page } from '@playwright/test';

const QUIET = ['codex', 'portals', 'loot', 'stats'] as const;

const row = (page: Page, section: string) =>
  page.locator(`[data-lap-shell] #lap-nav-items a[data-section="${section}"]`);

/** The switch is a visually hidden checkbox: its label is what a person clicks. */
const toggleLabel = (page: Page, section: string) =>
  page.locator('.interruptores label').filter({
    has: page.locator(`[data-section-toggle="${section}"]`),
  });

test('a first visit gets a quiet panel, and a choice — even «show all» — is kept', async ({
  page,
}) => {
  await page.goto('/es/lap/');
  for (const section of QUIET) await expect(row(page, section)).toBeHidden();
  for (const section of ['overview', 'character', 'seasons', 'updates', 'settings']) {
    await expect(row(page, section)).toBeVisible();
  }
  // The page in view is never hidden.
  await page.goto('/es/lap/stats/');
  await expect(row(page, 'stats')).toBeVisible();
  await expect(row(page, 'codex')).toBeHidden();

  // The settings show the four off; turning one on stores the choice.
  await page.goto('/es/lap/settings/');
  for (const section of QUIET) {
    await expect(page.locator(`[data-section-toggle="${section}"]`)).not.toBeChecked();
  }
  await toggleLabel(page, 'stats').click();
  await expect(page.locator('[data-section-toggle="stats"]')).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('numinia-lap-hidden'))).toBe(
    'codex,portals,loot',
  );
  await page.goto('/es/lap/');
  await expect(row(page, 'stats')).toBeVisible();
  await expect(row(page, 'codex')).toBeHidden();

  // Everything on is a choice too: it persists as an empty value and wins.
  await page.goto('/es/lap/settings/');
  for (const section of ['codex', 'portals', 'loot']) await toggleLabel(page, section).click();
  expect(await page.evaluate(() => localStorage.getItem('numinia-lap-hidden'))).toBe('');
  await page.goto('/es/lap/');
  for (const section of QUIET) await expect(row(page, section)).toBeVisible();
});

test('«Novedades» opens inside the panel, with the site updates and no bell', async ({ page }) => {
  await page.goto('/es/lap/');
  const novedades = row(page, 'updates');
  await expect(novedades).toHaveAttribute('href', '/es/lap/updates/');
  await expect(novedades).toContainText('Novedades');
  await novedades.click();
  await page.waitForURL('**/es/lap/updates/');
  await expect(page.locator('[data-lap-shell]')).toBeVisible();
  await expect(row(page, 'updates')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-lap-updates] [data-updates] > li').first()).toBeVisible();
  // The public list and the panel's list carry the same versions.
  const inPanel = await page.locator('[data-updates] > li').count();
  await page.goto('/es/updates/');
  expect(await page.locator('[data-updates] > li').count()).toBe(inPanel);
});

test('what does not work yet says so: the rail mark and the page banner', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('numinia-lap-hidden', ''));
  await page.goto('/es/lap/loot/');
  for (const section of ['loot', 'portals']) {
    await expect(row(page, section)).toHaveAttribute('data-building', '');
    await expect(row(page, section)).toHaveAttribute('title', /En construcción/);
  }
  await expect(row(page, 'seasons')).not.toHaveAttribute('data-building', '');
  await expect(page.locator('[data-lap-building]')).toContainText('Todavía no funciona');
  await expect(page.locator('[data-metric="lap-loot-seasons"]')).toHaveAttribute(
    'href',
    '/es/lap/seasons/',
  );
  await page.goto('/es/lap/portals/');
  await expect(page.locator('[data-lap-building]')).toContainText('Fase 5');
});

test('Temporadas: the doors come first, the pass below them', async ({ page }) => {
  await page.goto('/es/lap/seasons/');
  const top = async (selector: string): Promise<number> =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => el.getBoundingClientRect().top);
  const progress = await top('[data-progress]');
  const doors = await top('.pista');
  const pass = await top('[data-season-pass]');
  expect(progress).toBeLessThan(doors);
  expect(doors).toBeLessThan(pass);
  await expect(page.locator('[data-progress]')).toHaveText('0 de 8 puertas cruzadas');
  await expect(page.locator('[data-season-pass]')).toContainText('9,99');
});

test('Estadísticas opens with the city, counted from the register, and «Ahora dentro» live', async ({
  page,
}) => {
  await page.goto('/es/lap/stats/');
  await expect(page.locator('h1')).toHaveText('Estadísticas de Numinia');
  await expect(page.locator('[data-stats-source]')).toContainText('no hace falta iniciar sesión');
  const city = page.locator('[data-city-stats]');
  await expect(city).toContainText('Comunidades');
  await expect(city).toContainText('Encuentros próximos');
  await expect(city).toContainText('Sedes abiertas');
  await expect(city).toContainText('Objetos en el Bazar');
  // The fixture's /api/live answers every home with 0.
  await expect(page.locator('[data-inside-total]')).toHaveText('0');
  // The city first, the archive below it.
  const headings = await page.locator('article h2').allTextContents();
  expect(headings).toEqual(['La ciudad', 'El archivo']);
});
