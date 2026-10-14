/**
 * You sign in and you look signed in (v0.84.0). The pages are prerendered
 * for everyone, so the chrome asks `/api/auth/session` after load; here the
 * answer is played by the browser (`page.route`), because the e2e server
 * runs without auth secrets — what is under test is what the page does with
 * each answer, in a real browser against the built site.
 */

import { expect, test, type Page } from '@playwright/test';

const WALLET = '0x42e6000000000000000000000000000000ca26';

async function signedInAs(page: Page, rank: string): Promise<void> {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank } }),
  );
}

test('without a session the bar offers the door, and the door comes back here', async ({
  page,
}) => {
  await page.goto('/es/communities/trgcon/');
  await page.waitForLoadState('networkidle');
  const door = page.locator('[data-metric="chrome-sign-in"]');
  await expect(door).toBeVisible();
  await expect(door).toHaveAttribute(
    'href',
    '/es/lap/session/?vuelta=%2Fes%2Fcommunities%2Ftrgcon%2F',
  );
  await expect(page.locator('[data-metric="chrome-account"]')).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-session', 'out');
});

test('with a session the bar shows your account, your rank and the one way out', async ({
  page,
}) => {
  await signedInAs(page, 'oracle');
  await page.goto('/es/communities/');
  const account = page.locator('[data-metric="chrome-account"]');
  await expect(account).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-session', 'in');
  await expect(page.locator('[data-metric="chrome-sign-in"]')).toBeHidden();
  await expect(page.locator('[data-metric="nav-sign-in"]')).toBeHidden();
  await expect(account).toContainText('0x42e6…ca26');
  // The full wallet never reaches the page.
  expect(await page.content()).not.toContain(WALLET);

  await account.click();
  await expect(page.locator('.cima-rango [data-rank-name="oracle"]')).toBeVisible();
  await expect(page.locator('.cima-rango [data-rank-name="oracle"]')).toHaveText('Oráculo');
  await expect(page.locator('[data-metric="chrome-sign-out"]')).toHaveAttribute(
    'href',
    '/es/lap/session/?salir=1',
  );
});

test('Perfil and Ajustes name your real rank, never «Nómada» by default', async ({ page }) => {
  await signedInAs(page, 'oracle');
  await page.goto('/es/lap/');
  const card = page.locator('[data-citizen]');
  await expect(card.locator('[data-session-short]')).toHaveText('0x42e6…ca26');
  await expect(card.locator('[data-rank-name="oracle"]')).toBeVisible();
  await expect(card.locator('[data-rank-name="nomad"]')).toBeHidden();
  await expect(card.locator('[data-metric="citizen-enter"]')).toBeHidden();

  await page.goto('/es/lap/settings/');
  await expect(page.locator('[data-session-card] [data-rank-name="oracle"]')).toBeVisible();
  // Every rank up to yours is granted; an Oracle holds them all.
  const pills = page.locator('[data-rank-level] .pildora');
  await expect(pills.first()).toHaveAttribute('data-estado', 'granted');
  await expect(pills.last()).toHaveAttribute('data-estado', 'granted');
  await expect(page.locator('[data-metric="settings-sign-out"]')).toHaveAttribute(
    'href',
    '/es/lap/session/?salir=1',
  );
});

test('a Nomad sees only the first rank granted', async ({ page }) => {
  await signedInAs(page, 'nomad');
  await page.goto('/es/lap/settings/');
  const pills = page.locator('[data-rank-level] .pildora');
  await expect(pills.first()).toHaveAttribute('data-estado', 'granted');
  await expect(pills.nth(1)).toHaveAttribute('data-estado', 'locked');
});

test('signed in, the sign-in page shows who you are and leads to your profile, in Spanish', async ({
  page,
}) => {
  await signedInAs(page, 'oracle');
  // Opened from a community page: «Continuar» — like a fresh sign-in — goes
  // to your profile, not back to the community (Pablo, 2026-10-14).
  await page.goto('/es/lap/session/?vuelta=%2Fes%2Fbelong%2F');
  const panel = page.locator('[data-session-panel]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Has entrado en Numinia.');
  await expect(panel).toContainText('Oráculo');
  await expect(panel.locator('[data-metric="auth-continue"]')).toHaveAttribute('href', '/es/lap/');
  await expect(panel.locator('[data-metric="auth-logout"]')).toHaveText('Salir');
  // No wallet widget and no legal gate for someone already in.
  await expect(page.locator('[data-metric="auth-connect"]')).toHaveCount(0);
  await expect(page.locator('[data-legal-gate]')).toHaveCount(0);
});

test('a door opened from a room of the player area leads back to that room', async ({ page }) => {
  await signedInAs(page, 'oracle');
  await page.goto('/es/lap/session/?vuelta=%2Fes%2Flap%2Fadmin%2Fworlds%2F');
  await expect(page.locator('[data-metric="auth-continue"]')).toHaveAttribute(
    'href',
    '/es/lap/admin/worlds/',
  );
});

test('a foreign way back is ignored: «Continuar» stays on the site', async ({ page }) => {
  await signedInAs(page, 'nomad');
  await page.goto('/es/lap/session/?vuelta=https%3A%2F%2Fevil.example%2F');
  await expect(page.locator('[data-metric="auth-continue"]')).toHaveAttribute('href', '/es/lap/');
});

test('«Salir» signs out and goes home', async ({ page }) => {
  let signedIn = true;
  await page.route('**/api/auth/session', (route) =>
    signedIn
      ? route.fulfill({ status: 200, json: { address: WALLET, rank: 'nomad' } })
      : route.fulfill({ status: 401, json: { error: 'No session' } }),
  );
  await page.route('**/api/auth/logout', (route) => {
    signedIn = false;
    return route.fulfill({ status: 200, json: { ok: true } });
  });
  await page.goto('/es/lap/session/?salir=1');
  await page.waitForURL('**/es/');
  await expect(page.locator('[data-metric="chrome-sign-in"]')).toBeVisible();
  expect(signedIn).toBe(false);
});
