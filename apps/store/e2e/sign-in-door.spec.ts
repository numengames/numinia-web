/**
 * The sign-in door (QA 2026-10-15): /lap/session/ is a modal over the app,
 * like TikTok's and Airbnb's sign-in — the shell behind DES-009's veil, one
 * centred panel with the ×, the mark, the title, the way in live from the
 * first paint and one legal line. No LAP rail, no «← Ajustes», no checkbox:
 * continuing is accepting (MIS-086 as a sign-in-wrap; the server still
 * refuses a stale acceptance — lib/__tests__/login-gate.test.ts).
 */

import { expect, test } from '@playwright/test';
import { LEGAL_DOC_VERSION } from '../src/lib/legal';

const TITLES = {
  es: 'Inicia sesión en Numinia',
  en: 'Sign in to Numinia',
  ja: 'ヌミニアにログイン',
  ko: '누미니아에 로그인',
  'pt-br': 'Entrar em Numinia',
} as const;

/** The words on the Google button (sign-in.ts `google`), drawn by the door. */
const GOOGLE = {
  es: 'Continuar con Google',
  en: 'Continue with Google',
  ja: 'Google で続ける',
  ko: 'Google로 계속하기',
  'pt-br': 'Continuar com o Google',
} as const;

test('the door is one panel over the app, labelled by its title, with no rail and no checkbox', async ({
  page,
}) => {
  await page.goto('/es/lap/session/?vuelta=%2Fes%2Fcommunities%2Ftrgcon%2F');
  await page.waitForLoadState('networkidle');
  const dialog = page.getByRole('dialog', { name: 'Inicia sesión en Numinia' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  // The app shell is behind it, out of the keyboard's way.
  await expect(page.locator('aside.rail-ciudad')).toHaveCount(1);
  expect(
    await page.locator('aside.rail-ciudad').evaluate((el) => el.closest('[inert]') !== null),
  ).toBe(true);
  // DES-009's canonical veil and a 480 px panel.
  const veil = await page
    .locator('[data-sign-in-door]')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(veil).toBe('rgba(20, 17, 15, 0.72)');
  const box = await dialog.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBe(480);
  // What the old page had is gone.
  await expect(page.locator('[data-lap-shell]')).toHaveCount(0);
  await expect(page.locator('[data-metric="session-back"]')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.locator('[data-legal-gate]')).toHaveCount(0);
  await expect(page.locator('[data-login-progress]')).toHaveCount(0);
});

test('the way in is live from the first paint, with nothing to tick first', async ({ page }) => {
  await page.goto('/es/lap/session/');
  // Server-rendered: the widget's place is in the HTML before any script.
  await expect(page.locator('[data-metric="auth-connect"]')).toHaveCount(1);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-metric="auth-connect"]')).toBeVisible();
});

// Continuing is accepting, and the accepted version still travels with the
// login (the endpoint refuses a stale one: lib/__tests__/login-gate.test.ts).
// Read in the built island here, not in the acceptance suite: only this
// suite's build carries a thirdweb client id, without which the widget's
// code is not in the bundle at all.
test('the login request still carries the current legal corpus version', async ({ page }) => {
  await page.goto('/es/lap/session/');
  const island = await page
    .locator('astro-island[component-export="LoginSpike"]')
    .getAttribute('component-url');
  expect(island, 'the door mounts no LoginSpike island').toBeTruthy();
  const script = await (await page.request.get(island ?? '')).text();
  expect(script).toContain('/api/auth/login');
  // The login body carries the accepted corpus beside the signature …
  expect(script).toMatch(/JSON\.stringify\(\{[^}]*\bsignature:[^}]*\bterms:/);
  // … built from the current versions of the terms and the privacy policy.
  expect(script).toContain('+privacy@');
  for (const doc of ['terms', 'privacy'] as const) {
    const version = LEGAL_DOC_VERSION[doc];
    expect(
      script.includes(`${doc}:\`${version}\``) || script.includes(`${doc}:"${version}"`),
      `the island carries ${doc} ${version}`,
    ).toBe(true);
  }
});

test('one legal line at the foot links the published documents, in the reader locale', async ({
  page,
}) => {
  await page.goto('/es/lap/session/');
  const legal = page.locator('[data-door-legal]');
  await expect(legal).toHaveText(
    'Al continuar, aceptas los Términos y confirmas que has leído la Política de privacidad de Numen Games.',
  );
  await expect(legal.locator('[data-metric="auth-legal-terms"]')).toHaveAttribute(
    'href',
    '/es/legal/terms/',
  );
  await expect(legal.locator('[data-metric="auth-legal-privacy"]')).toHaveAttribute(
    'href',
    '/es/legal/privacy/',
  );
});

test('focus starts in the panel, the × comes first and leads back where the door was opened', async ({
  page,
}) => {
  await page.goto('/es/lap/session/?vuelta=%2Fes%2Fcommunities%2Ftrgcon%2F');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('dialog')).toBeFocused();
  const close = page.getByRole('link', { name: 'Cerrar' });
  await expect(close).toHaveAttribute('href', '/es/communities/trgcon/');
  await expect(close).toHaveAttribute('data-metric', 'auth-close');
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await close.click();
  await page.waitForURL('**/es/communities/trgcon/');
});

test('Escape closes the door to the same place as the ×', async ({ page }) => {
  await page.goto('/es/lap/session/?vuelta=%2Fes%2Fcalendar%2F');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Escape');
  await page.waitForURL('**/es/calendar/');
});

test('without a way back, or with one into the door itself, the × goes home', async ({ page }) => {
  await page.goto('/es/lap/session/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-door-close]')).toHaveAttribute('href', '/es/');
  await page.goto('/es/lap/session/?vuelta=%2Fes%2Flap%2Fsession%2F%3Fsalir%3D1');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-door-close]')).toHaveAttribute('href', '/es/');
  await page.goto('/es/lap/session/?vuelta=https%3A%2F%2Fevil.example%2F');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-door-close]')).toHaveAttribute('href', '/es/');
});

test('every control of our own carries a metric', async ({ page }) => {
  await page.goto('/es/lap/session/');
  await page.waitForLoadState('networkidle');
  const missing = await page.locator('[data-sign-in-door]').evaluate((door) =>
    [...door.querySelectorAll('a, button, input, select, textarea')]
      // The vendor widget is measured at its container (`auth-connect`).
      .filter((el) => !el.closest('[data-metric="auth-connect"]'))
      .filter((el) => !el.hasAttribute('data-metric'))
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(missing).toEqual([]);
});

test('on a phone the door fills the screen as a sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/es/lap/session/');
  await page.waitForLoadState('networkidle');
  const box = await page.getByRole('dialog').boundingBox();
  expect(box).toMatchObject({ x: 0, y: 0, width: 390 });
  expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(844);
});

for (const [locale, title] of Object.entries(TITLES)) {
  test(`the door speaks ${locale}`, async ({ page }) => {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    await page.goto(`${prefix}/lap/session/`);
    await expect(page.getByRole('dialog', { name: title })).toBeVisible();
    await expect(page.locator('[data-metric="auth-legal-terms"]')).toHaveAttribute(
      'href',
      `${prefix}/legal/terms/`,
    );
    await expect(page.locator('[data-metric="auth-legal-privacy"]')).toHaveAttribute(
      'href',
      `${prefix}/legal/privacy/`,
    );
    // The Google button says our words, not thirdweb's «Continue with …».
    const google = page.locator(
      '[data-sign-in-way] .tw-social-button[aria-label="Login with google"]',
    );
    await expect(google).toBeVisible();
    const drawn = await google.evaluate((el) => ({
      words: getComputedStyle(el, '::after').content,
      vendorSize: getComputedStyle(el).fontSize,
    }));
    expect(drawn).toEqual({
      words: JSON.stringify(GOOGLE[locale as keyof typeof GOOGLE]),
      vendorSize: '0px',
    });
  });
}
