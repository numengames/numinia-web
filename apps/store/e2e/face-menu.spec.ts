/**
 * «El menú de la cara» (cut 9; since v0.112.0 «Tu menú», opened from your
 * face at the head of the right rail) in a real browser against the built
 * site. As in session-chrome.spec.ts the e2e server has no auth secrets, so
 * the session, the till's overview and the profile are played by the
 * browser (`page.route`), shaped as the routes send them. What is under
 * test is what the menu does with each answer: the published name and
 * face, the balance with its figure, one door per organization the person
 * is in (never the ones the house only enters), no presence at all, the
 * keyboard (tab order, Escape gives the focus back) and axe on a phone (the
 * «Tú» sheet) and on a desktop.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WALLET = '0x42e6000000000000000000000000000000ca26';
const PERSONAL = { id: 'acc_p', kind: 'personal', name: null, role: 'owner', balanceCents: 1840 };
const GAMES = {
  id: 'acc_t_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'admin',
  balanceCents: 0,
};
const TARUGO = {
  id: 'acc_t_tarugo',
  kind: 'team',
  name: 'La Tarugo',
  role: 'member',
  balanceCents: 0,
};
const HOUSE = {
  id: 'acc_t_other',
  kind: 'team',
  name: 'Otra',
  role: 'admin',
  balanceCents: 0,
  as: 'house',
};

async function signedIn(
  page: Page,
  accounts: object[],
  profile: object | null = null,
  overview: 'ok' | 'down' = 'ok',
): Promise<void> {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank: 'oracle' } }),
  );
  await page.route('**/api/saldo', (route) =>
    overview === 'ok'
      ? route.fulfill({ json: { accounts } })
      : route.fulfill({ status: 502, json: { error: 'till-failed' } }),
  );
  await page.route('**/api/profile', (route) => route.fulfill({ json: { ok: true, profile } }));
}

const open = async (page: Page, path = '/es/communities/'): Promise<void> => {
  await page.goto(path);
  await page.locator('[data-metric="chrome-account"]').click();
};

const MENU = '#menu-cara';

test.describe('the face menu', () => {
  test('opens from your face on the right rail: the name published, the rank, the balance and one door per panel', async ({
    page,
  }) => {
    await signedIn(page, [PERSONAL, HOUSE, GAMES, TARUGO], {
      name: 'Pablo',
      avatar: 'avatar-arla',
      face: '/thumbs/1x/avatar-arla.webp',
    });
    await open(page);
    const menu = page.locator(MENU);
    await expect(menu).toBeVisible();
    // The menu floats next to its button, outside the rail.
    const button = await page.locator('[data-metric="chrome-account"]').boundingBox();
    const box = await menu.boundingBox();
    expect(box && button && box.y >= button.y + button.height).toBe(true);
    await expect(menu.locator('[data-face-name]')).toHaveText('Pablo');
    await expect(menu.locator('.pop-rango [data-rank-name="oracle"]')).toHaveText('Oráculo');
    await expect(menu.locator('[data-metric="chrome-profile"]')).toHaveText('Tu perfil');
    const balance = menu.locator('[data-metric="chrome-balance"]');
    await expect(balance).toContainText('Tu saldo');
    await expect(balance.locator('[data-face-balance]')).toContainText('18,40');
    await expect(balance).toHaveAttribute('href', '/es/saldo/');
    await expect(menu.locator('[data-face-panels-label]')).toHaveText('Tus paneles');
    const doors = menu.locator('[data-metric="chrome-panel-org"]');
    await expect(doors).toHaveCount(2);
    await expect(doors.nth(0)).toHaveText('Numen Games');
    await expect(doors.nth(0)).toHaveAttribute('href', '/es/panel/?org=acc_t_games');
    await expect(doors.nth(1)).toHaveAttribute('href', '/es/panel/?org=acc_t_tarugo');
    // The house's own entry is not «yours»; the generic door gives way to the list.
    await expect(menu.getByText('Otra')).toHaveCount(0);
    await expect(menu.locator('[data-metric="chrome-panels"]')).toBeHidden();
    await expect(menu.locator('[data-metric="chrome-account-settings"]')).toHaveText('Ajustes');
    await expect(menu.locator('[data-metric="chrome-sign-out"]')).toHaveText('Cerrar sesión');
    // The head of the rail takes your published name and face too.
    const head = page.locator('[data-metric="chrome-account"]');
    await expect(head.locator('[data-face-name]')).toHaveText('Pablo');
    await expect(head.locator('img[data-face-img]')).toHaveAttribute(
      'src',
      '/thumbs/1x/avatar-arla.webp',
    );
  });

  test('has no presence: no status, no phrase, no disabled control', async ({ page }) => {
    await signedIn(page, [PERSONAL, GAMES]);
    await open(page);
    const menu = page.locator(MENU);
    await expect(menu.getByText(/estado|en línea|online/i)).toHaveCount(0);
    await expect(menu.locator('[disabled], [aria-disabled="true"], button')).toHaveCount(0);
  });

  test('without a published name the short wallet stays; without a till the figure and the list are left out', async ({
    page,
  }) => {
    await signedIn(page, [], null, 'down');
    await open(page);
    const menu = page.locator(MENU);
    await expect(menu.locator('[data-face-name]')).toHaveText('0x42e6…ca26');
    await expect(menu.locator('[data-metric="chrome-balance"]')).toBeVisible();
    await expect(menu.locator('[data-face-balance]')).toBeHidden();
    await expect(menu.locator('[data-metric="chrome-panels"]')).toBeVisible();
    await expect(menu.locator('[data-metric="chrome-panel-org"]')).toHaveCount(0);
  });

  test('the keyboard walks it in order, and Escape closes it and gives the focus back', async ({
    page,
  }) => {
    await signedIn(page, [PERSONAL, GAMES]);
    await page.goto('/es/communities/');
    const face = page.locator('[data-metric="chrome-account"]');
    await face.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-metric="chrome-panel-org"]')).toBeVisible();
    const order: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => document.activeElement?.getAttribute('data-metric') ?? 'none'),
      );
    }
    expect(order).toEqual([
      'chrome-profile',
      'chrome-balance',
      'chrome-panel-org',
      'chrome-account-settings',
      'chrome-sign-out',
    ]);
    await page.keyboard.press('Escape');
    await expect(page.locator(MENU)).toBeHidden();
    await expect(face).toBeFocused();
  });

  test('a click outside closes it', async ({ page }) => {
    await signedIn(page, [PERSONAL]);
    await open(page);
    await expect(page.locator(MENU)).toBeVisible();
    await page.mouse.click(800, 6);
    await expect(page.locator(MENU)).toBeHidden();
  });

  test('every language says it in its own words', async ({ page }) => {
    await signedIn(page, [PERSONAL, GAMES]);
    const words: Array<[string, string, string, string]> = [
      ['/communities/', 'Your profile', 'Your panels', 'Sign out'],
      ['/ja/communities/', 'あなたのプロフィール', 'あなたのパネル', 'ログアウト'],
      ['/ko/communities/', '내 프로필', '내 패널', '로그아웃'],
      ['/pt-br/communities/', 'Seu perfil', 'Seus painéis', 'Encerrar sessão'],
    ];
    for (const [path, profile, panels, signOut] of words) {
      await open(page, path);
      const menu = page.locator(MENU);
      await expect(menu.locator('[data-metric="chrome-profile"]')).toHaveText(profile);
      await expect(menu.locator('[data-face-panels-label]')).toHaveText(panels);
      await expect(menu.locator('[data-metric="chrome-sign-out"]')).toHaveText(signOut);
    }
  });

  test('is axe clean on a desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signedIn(page, [PERSONAL, GAMES, TARUGO], { name: 'Pablo', avatar: null, face: null });
    await open(page);
    await expect(page.locator('[data-metric="chrome-panel-org"]').first()).toBeVisible();
    const results = await new AxeBuilder({ page }).include(MENU).include('.rail-tu').analyze();
    expect(results.violations).toEqual([]);
  });

  test('on a phone the same is yours in the «Tú» sheet, axe clean', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signedIn(page, [PERSONAL, GAMES]);
    await page.goto('/es/communities/');
    await page.locator('[data-metric="tab-you"]').click();
    const sheet = page.locator('#hoja-tu');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-metric="sheet-card"]')).toContainText('0x42e6…ca26');
    await expect(sheet.locator('[data-metric="sheet-card"]')).toContainText('Oráculo');
    await expect(sheet.locator('[data-metric="sheet-sign-out"]')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#hoja-tu').analyze();
    expect(results.violations).toEqual([]);
  });
});
