/**
 * The communities pages of the app shell (v0.83.0), in a real browser
 * against the built server: «Seguir» without a session is the door to sign
 * in (nothing is followed and no false state is shown), «Perteneces» lists
 * what this browser follows, the door «Perteneces a» shows a visitor without
 * a session, and the retired city addresses landing on «Cómo funciona» in
 * their own locale.
 */

import { expect, test } from '@playwright/test';

test('without a session, «Seguir» is the door to sign in and nothing is followed', async ({
  page,
}) => {
  await page.goto('/es/communities/trgcon/');
  const follow = page.locator('[data-metric="community-follow"]');
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await expect(follow).toContainText('Seguir');
  await follow.click();
  // The same door the rest of the site uses, coming back to this page.
  await expect(page).toHaveURL(
    `/es/lap/session/?vuelta=${encodeURIComponent('/es/communities/trgcon/')}`,
  );
  expect(await page.evaluate(() => localStorage.getItem('numinia-follows'))).toBeNull();

  // And back on the page: no «Sigues» that followed nobody.
  await page.goto('/es/communities/trgcon/');
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await expect(follow).toContainText('Seguir');
});

test('«Perteneces» lists what this browser follows', async ({ page }) => {
  // The list itself, seeded as a signed-in browser would have left it
  // (following needs a session; the list only reads the browser's own).
  await page.goto('/es/belong/');
  await page.evaluate(() => localStorage.setItem('numinia-follows', '["trgcon"]'));
  await page.reload();
  const card = page.locator('[data-follows-list] .seguida');
  await expect(card).toHaveCount(1);
  await expect(card.locator('h3 a')).toHaveAttribute('href', '/es/communities/trgcon/');
  await expect(card.locator('[data-next-title]')).toHaveAttribute('href', '/es/rituals/trg26/');
  await expect(page.locator('[data-follows-empty]')).toBeHidden();

  // And back: an empty list says so.
  await page.evaluate(() => localStorage.removeItem('numinia-follows'));
  await page.reload();
  await expect(page.locator('[data-follows-empty]')).toBeVisible();
  await expect(page.locator('[data-follows-list]')).toBeHidden();
});

test('without a session, «Perteneces a» is a door to sign in that comes back here', async ({
  page,
}) => {
  await page.goto('/belong/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-metric="belong-sign-in"]')).toHaveAttribute(
    'href',
    '/lap/session/?vuelta=%2Fbelong%2F',
  );
  await expect(page.locator('p.vacio[data-session-in]')).toBeHidden();
});

test('the retired city addresses open «Cómo funciona» in their own locale', async ({ page }) => {
  for (const [from, to] of [
    ['/city/', '/how-it-works/'],
    ['/es/city/', '/es/how-it-works/'],
    ['/ja/city/districts/', '/ja/how-it-works/'],
  ] as const) {
    const response = await page.goto(from);
    expect(new URL(page.url()).pathname).toBe(to);
    expect(response?.status()).toBe(200);
  }
});
