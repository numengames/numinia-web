/**
 * Personal settings in five parts (MIS-268, wireframe v3 «Tus ajustes»):
 * a side navigation of anchors, in the design's words, and every anchor
 * lands on its part. First story: the parts live on the one page.
 */

import { expect, test } from '@playwright/test';

const PARTS = [
  ['cuenta', 'Cuenta'],
  ['avisos', 'Avisos'],
  ['aspecto', 'Aspecto e idioma'],
  ['saldo', 'Saldo y consumo'],
  ['datos', 'Tus datos'],
] as const;

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`the settings show five parts and every link reaches its part (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/es/lap/settings/');
    const nav = page.getByRole('navigation', { name: 'Tus ajustes' });
    await expect(nav.getByRole('link')).toHaveText(PARTS.map(([, name]) => name));
    for (const [id, name] of PARTS) {
      await nav.getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      const heading = page.locator(`#${id}`).getByRole('heading', { level: 2, name });
      await expect(heading).toBeInViewport();
    }
  });
}

test('the parts that live elsewhere lead there', async ({ page }) => {
  await page.goto('/es/lap/settings/');
  await expect(page.locator('#avisos').getByRole('link', { name: 'Ir a Avisos' })).toHaveAttribute(
    'href',
    '/es/notifications/',
  );
  await expect(page.locator('#saldo').getByRole('link', { name: 'Ir a Tu saldo' })).toHaveAttribute(
    'href',
    '/es/saldo/',
  );
});
