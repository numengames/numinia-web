/**
 * v3 «La ciudad y tú» (v0.112.0): the two mirrored rails, their folds and
 * tooltips, the menus beside their buttons, and the phone's bottom bar
 * with the «Tú» sheet — against the built site.
 */

import { expect, test, type Page } from '@playwright/test';

const box = async (page: Page, selector: string) => {
  const rect = await page.locator(selector).first().boundingBox();
  if (!rect) throw new Error(`${selector} has no box`);
  return rect;
};

test.describe('desktop', () => {
  test('1600: the city on the left, you on the right, both open, mirrored in position only', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/communities/');
    const city = await box(page, 'aside.rail-ciudad');
    const you = await box(page, 'aside.rail-tu');
    expect(city.x).toBe(0);
    expect(city.width).toBe(256);
    expect(you.x + you.width).toBe(1600);
    expect(you.width).toBe(256);
    // Reading stays left to right on the right rail: icon first, then the word.
    const item = page.locator('.rail-tu [data-metric="you-notices"]');
    const icon = await item.locator('svg').boundingBox();
    const word = await item.locator('.rail-t').boundingBox();
    expect(icon!.x).toBeLessThan(word!.x);
    // The place you are on takes the fill icon and aria-current.
    const current = page.locator('.rail-ciudad [data-metric="nav-communities"]');
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(current.locator('use')).toHaveAttribute('href', '#i-users-three-fill');
  });

  test('the right rail lines up like the left: icons at the same inset, counters right after their words', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    const city = await box(page, 'aside.rail-ciudad');
    const you = await box(page, 'aside.rail-tu');
    const leftIcon = await box(page, '.rail-ciudad [data-metric="nav-worlds"] svg');
    const rightIcon = await box(page, '.rail-tu [data-metric="you-notices"] svg');
    expect(Math.abs(leftIcon.x - city.x - (rightIcon.x - you.x))).toBeLessThanOrEqual(2);
    const item = page.locator('.rail-ciudad [data-metric="nav-communities"]');
    const word = await item.locator('.rail-t').boundingBox();
    const count = await item.locator('.rail-n').boundingBox();
    expect(count!.x - (word!.x + word!.width)).toBeGreaterThanOrEqual(0);
    expect(count!.x - (word!.x + word!.width)).toBeLessThanOrEqual(12);
  });

  test('1280: your rail starts folded, the city open; each fold is kept on its own', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/es/');
    await expect(page.locator('html')).toHaveAttribute('data-rail-city', 'expanded');
    await expect(page.locator('html')).toHaveAttribute('data-rail-you', 'collapsed');
    expect((await box(page, 'aside.rail-tu')).width).toBe(72);
    await page.locator('[data-metric="nav-collapse"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-rail-city', 'collapsed');
    await expect(page.locator('[data-metric="nav-collapse"]')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await page.locator('[data-metric="you-collapse"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-rail-you', 'expanded');
    expect(await page.evaluate(() => localStorage.getItem('numinia-sidebar'))).toBe(
      'city=collapsed;you=expanded',
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-rail-city', 'collapsed');
    await expect(page.locator('html')).toHaveAttribute('data-rail-you', 'expanded');
  });

  test('folded, a place shows its name on hover and on focus; Escape hides it (WCAG 1.4.13)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto('/es/');
    await expect(page.locator('html')).toHaveAttribute('data-rail-city', 'collapsed');
    const tip = page.locator('#rail-tip');
    await page.locator('.rail-ciudad [data-metric="nav-worlds"]').hover();
    await expect(tip).toBeVisible();
    await expect(tip).toHaveText('Mundos');
    await page.keyboard.press('Escape');
    await expect(tip).toBeHidden();
    await page.locator('.rail-tu [data-metric="you-notices"]').focus();
    await expect(tip).toBeVisible();
    await expect(tip).toHaveText('Avisos');
    // The tip sits beside the item, toward the page, inside the window.
    const tipBox = await tip.boundingBox();
    const item = await box(page, '.rail-tu [data-metric="you-notices"]');
    expect(tipBox!.x + tipBox!.width).toBeLessThanOrEqual(item.x);
    expect(tipBox!.x).toBeGreaterThanOrEqual(0);
  });

  test('open, tooltip still shows alongside the words', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    await expect(page.locator('html')).toHaveAttribute('data-rail-city', 'expanded');
    await page.locator('.rail-ciudad [data-metric="nav-worlds"]').hover();
    const tip = page.locator('#rail-tip');
    await expect(tip).toBeVisible();
    await expect(tip).toHaveText('Mundos');
  });

  test('«Ajustes», deployed or folded, shows its tooltip (t_03a63d35)', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    const tip = page.locator('#rail-tip');
    await expect(page.locator('html')).toHaveAttribute('data-rail-you', 'expanded');
    await page.locator('.rail-tu [data-metric="you-settings"]').hover();
    await expect(tip).toBeVisible();
    await expect(tip).toHaveText('Ajustes');
    await page.keyboard.press('Escape');
    await expect(tip).toBeHidden();
    await page.locator('[data-rail-fold="you"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-rail-you', 'collapsed');
    await page.locator('.rail-tu [data-metric="you-settings"]').hover();
    await expect(tip).toBeVisible();
    await expect(tip).toHaveText('Ajustes');
  });

  test('«Crear» opens beside its button with only real destinations, and Escape gives the focus back', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    const button = page.locator('[data-metric="you-create"]');
    await button.click();
    const menu = page.locator('#menu-crear');
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const links = menu.locator('a');
    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveAttribute('href', '/es/how-it-works/#open');
    await expect(links.nth(1)).toHaveAttribute('href', '/es/crear/encuentro/');
    const menuBox = await menu.boundingBox();
    const rail = await box(page, 'aside.rail-tu');
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(rail.x + rail.width);
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('«/» opens the search from anywhere but a field', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    await page.keyboard.press('/');
    await page.waitForURL('**/es/communities/');
  });

  test('t_7c4d3d1e: «Entrar al mundo» opens at the top of your rail once a world has people', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.route('**/api/live', (route) =>
      route.fulfill({ status: 200, json: { inside: { vic: 3 } } }),
    );
    await page.goto('/es/');
    const door = page.locator('[data-metric="you-live-world"]');
    await expect(door).toBeVisible();
    await expect(door).toHaveText('Entrar al mundo');
    await expect(door).toHaveAttribute('href', 'https://vic.numinia.com/');
    await expect(door).toHaveAttribute('target', '_blank');
  });

  test('t_7c4d3d1e: nobody inside, no door at the top of your rail (the fixture answers zero)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-metric="you-live-world"]')).toBeHidden();
  });

  test('the appearance is a segmented control that remembers', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    await page.locator('[data-metric="chrome-mode-day"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-modo', 'diurno');
    await expect(page.locator('[data-metric="chrome-mode-day"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-modo', 'diurno');
  });

  test('a phone on its side keeps both rails as icon edges', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/es/');
    await expect(page.locator('html')).toHaveAttribute('data-rail-city', 'collapsed');
    await expect(page.locator('html')).toHaveAttribute('data-rail-you', 'collapsed');
    await expect(page.locator('nav.barra-movil')).toBeHidden();
    expect((await box(page, 'aside.rail-ciudad')).width).toBe(72);
  });
});

test.describe('phone', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('the rails give way to a header and a bottom bar of four places and «Tú»', async ({
    page,
  }) => {
    await page.goto('/es/communities/');
    await expect(page.locator('aside.rail-ciudad')).toBeHidden();
    await expect(page.locator('aside.rail-tu')).toBeHidden();
    await expect(page.locator('header.borde-movil [data-metric="phone-bazaar"]')).toBeVisible();
    const tabs = page.locator('nav.barra-movil a, nav.barra-movil button');
    await expect(tabs).toHaveCount(5);
    for (const tab of await tabs.all()) {
      const rect = await tab.boundingBox();
      expect(rect!.height).toBeGreaterThanOrEqual(44);
      expect(rect!.width).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('[data-metric="tab-communities"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('«Tú» opens the sheet above the bar, focus goes in, Escape brings it back', async ({
    page,
  }) => {
    await page.goto('/es/');
    const you = page.locator('[data-metric="tab-you"]');
    await you.click();
    const sheet = page.locator('#hoja-tu');
    await expect(sheet).toBeVisible();
    await expect(you).toHaveAttribute('aria-expanded', 'true');
    // Focus goes into the sheet; signed out, the door is there.
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await expect(page.locator('[data-metric="sheet-sign-in"]')).toBeVisible();
    const sheetBox = await sheet.boundingBox();
    const bar = await box(page, 'nav.barra-movil');
    expect(sheetBox!.y + sheetBox!.height).toBeLessThanOrEqual(bar.y + 1);
    await expect(page.locator('[data-metric="sheet-create-community"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(you).toBeFocused();
  });

  test('the sheet speaks every language', async ({ page }) => {
    for (const [path, word] of [
      ['/', 'Notices'],
      ['/pt-br/', 'Avisos'],
      ['/ja/', 'お知らせ'],
      ['/ko/', '알림'],
    ] as const) {
      await page.goto(path);
      await page.locator('[data-metric="tab-you"]').click();
      await expect(page.locator('#hoja-tu [data-metric="sheet-notices"]')).toContainText(word);
      await page.keyboard.press('Escape');
    }
  });
});
