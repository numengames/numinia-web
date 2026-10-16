/**
 * The notifications and the updates' one door (the Oracle, 2026-10-15):
 * the «Más» bell opens «Notificaciones» — two tabs, empty states that tell
 * the truth today, the door when signed out — and the updates are reached
 * through the version alone, each card linking to its merge on GitHub.
 * The session is played by the browser (`page.route`): the e2e server runs
 * without auth secrets, and what is under test is the page's response.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WALLET = '0x42e6000000000000000000000000000000ca26';

async function signedIn(page: Page): Promise<void> {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank: 'oracle' } }),
  );
}

const tab = (page: Page, id: string) => page.locator(`[data-metric="notifications-tab-${id}"]`);
const panel = (page: Page, id: string) => page.locator(`[data-panel="${id}"]`);

test('your rail rings the bell for the notices, and nothing lists the updates', async ({
  page,
}) => {
  await page.goto('/es/');
  const bell = page.locator('.rail-tu [data-metric="you-notices"]');
  await expect(bell).toBeVisible();
  await expect(bell).toHaveAttribute('href', '/es/notifications/');
  await expect(bell).toHaveText('Avisos');
  await expect(page.locator('[data-metric="footer-updates"]')).toHaveCount(0);
  // The version in the footer is the updates' one door.
  await expect(page.locator('.rail-ciudad [data-metric="footer-version"]')).toHaveAttribute(
    'href',
    '/es/updates/',
  );
  // No link to the updates anywhere but the footer's version (the rail's
  // copy and the phone's copy of the same footer).
  const doors = await page
    .locator('a[href$="/updates/"]')
    .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('data-metric')))]);
  expect(doors).toEqual(['footer-version']);
});

test('on a phone the «Tú» sheet carries the notices too', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/es/');
  await page.locator('[data-metric="tab-you"]').click();
  const item = page.locator('#hoja-tu [data-metric="sheet-notices"]');
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute('href', '/es/notifications/');
});

test('signed out, the page offers the door and comes back here', async ({ page }) => {
  await page.goto('/es/notifications/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toHaveText('Notificaciones');
  const door = page.locator('[data-metric="notifications-sign-in"]');
  await expect(door).toBeVisible();
  await expect(door).toHaveAttribute('href', '/es/lap/session/?vuelta=%2Fes%2Fnotifications%2F');
  await expect(page.getByText('Entra para ver tus notificaciones')).toBeVisible();
  await expect(page.locator('[role="tablist"]')).toBeHidden();
});

test('signed in, two tabs with their empty states; the chrome reads the session once', async ({
  page,
}) => {
  await signedIn(page);
  const reads: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/auth/session')) reads.push(request.url());
  });
  await page.goto('/es/notifications/');
  await expect(page.locator('[role="tablist"]')).toBeVisible();
  await expect(page.locator('[data-metric="notifications-sign-in"]')).toBeHidden();

  await expect(tab(page, 'updates')).toHaveAttribute('aria-selected', 'true');
  await expect(tab(page, 'updates')).toHaveText('Actualizaciones');
  await expect(panel(page, 'updates')).toContainText('Estás al día');
  await expect(panel(page, 'updates')).toContainText(
    'Los avisos y anuncios de tu cuenta aparecerán aquí.',
  );
  await expect(panel(page, 'requests')).toBeHidden();

  await tab(page, 'requests').click();
  await expect(tab(page, 'requests')).toHaveAttribute('aria-selected', 'true');
  await expect(tab(page, 'updates')).toHaveAttribute('aria-selected', 'false');
  await expect(panel(page, 'requests')).toContainText('No tienes solicitudes');
  await expect(panel(page, 'requests')).toContainText(
    'Las invitaciones y peticiones que te lleguen aparecerán aquí.',
  );
  await expect(panel(page, 'updates')).toBeHidden();
  expect(new URL(page.url()).search).toBe('?tab=requests');

  // The arrow keys move between the tabs (ARIA tabs pattern).
  await page.keyboard.press('ArrowLeft');
  await expect(tab(page, 'updates')).toBeFocused();
  await expect(tab(page, 'updates')).toHaveAttribute('aria-selected', 'true');
  expect(new URL(page.url()).search).toBe('');

  await page.waitForLoadState('networkidle');
  expect(reads).toHaveLength(1);
});

test('?tab=requests opens on the requests', async ({ page }) => {
  await signedIn(page);
  await page.goto('/es/notifications/?tab=requests');
  await expect(tab(page, 'requests')).toHaveAttribute('aria-selected', 'true');
  await expect(panel(page, 'requests')).toBeVisible();
  await expect(panel(page, 'updates')).toBeHidden();
  // The tabs pass WCAG A/AA signed in too (axe).
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('every version card links to its merge on GitHub; the legacy line has none', async ({
  page,
}) => {
  await page.goto('/es/updates/');
  const card = page.locator('[data-updates] > li[data-version="v0.88.0"]');
  const merge = card.locator('[data-metric="updates-merge"]');
  await expect(merge).toHaveText('Ver en GitHub');
  await expect(merge).toHaveAttribute('href', 'https://github.com/numengames/numinia-web/pull/120');
  await expect(merge).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(merge).toHaveAttribute('target', '_blank');
  const search = page.locator(
    '[data-updates] > li[data-version="v0.50.0"] [data-metric="updates-merge"]',
  );
  const href = (await search.getAttribute('href')) ?? '';
  expect(new URL(href).origin + new URL(href).pathname).toBe(
    'https://github.com/numengames/numinia-web/pulls',
  );
  expect(new URL(href).searchParams.get('q')).toBe('is:pr is:merged in:title "v0.50.0"');
  await expect(
    page.locator('[data-updates] > li[data-version="v0.15.0"] [data-metric="updates-merge"]'),
  ).toHaveCount(0);
});
