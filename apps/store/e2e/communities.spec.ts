/**
 * The communities pages of the app shell (v0.83.0), in a real browser
 * against the built server: «Seguir» without a session is the door to sign
 * in (nothing is followed and no false state is shown), «Perteneces» shows
 * its empty «Sigues» to a visitor without a session (the list lives in the
 * account since cut «Seguir»: e2e/follows.spec.ts), the door «Perteneces a» shows a visitor without
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

test('without a session, «Sigues» is empty and the browser list is not read', async ({ page }) => {
  await page.goto('/es/belong/');
  await page.evaluate(() => localStorage.setItem('numinia-follows', '["trgcon"]'));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-belong-sections]')).toBeHidden();
  await expect(page.locator('[data-belong-follow]')).toBeHidden();
  // Not carried over either: that takes a session.
  expect(await page.evaluate(() => localStorage.getItem('numinia-follows'))).toBe('["trgcon"]');
  await page.evaluate(() => localStorage.removeItem('numinia-follows'));
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
  await expect(page.locator('[data-belong-sections]')).toBeHidden();
  await expect(page.locator('[data-session-out] [data-metric="belong-sign-in"]')).toBeVisible();
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
