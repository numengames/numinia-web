/**
 * The communities pages of the app shell (v0.83.0), in a real browser
 * against the built server: following a community from its page and finding
 * it on «Perteneces», the door «Perteneces a» shows a visitor without a
 * session, and the retired city addresses landing on «Cómo funciona» in
 * their own locale.
 */

import { expect, test } from '@playwright/test';

test('following a community keeps it in this browser and «Perteneces» lists it', async ({
  page,
}) => {
  await page.goto('/es/communities/trgcon/');
  const follow = page.locator('[data-metric="community-follow"]');
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await expect(follow).toContainText('Seguir');
  await follow.click();
  await expect(follow).toHaveAttribute('aria-pressed', 'true');
  await expect(follow).toContainText('Sigues');
  expect(await page.evaluate(() => localStorage.getItem('numinia-follows'))).toBe('["trgcon"]');

  await page.goto('/es/belong/');
  const card = page.locator('[data-follows-list] .seguida');
  await expect(card).toHaveCount(1);
  await expect(card.locator('h3 a')).toHaveAttribute('href', '/es/communities/trgcon/');
  await expect(card.locator('[data-next-title]')).toHaveAttribute('href', '/es/rituals/trg26/');
  await expect(page.locator('[data-follows-empty]')).toBeHidden();

  // And back: unfollowing empties the list again.
  await page.goto('/es/communities/trgcon/');
  await expect(follow).toHaveAttribute('aria-pressed', 'true');
  await follow.click();
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/es/belong/');
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
