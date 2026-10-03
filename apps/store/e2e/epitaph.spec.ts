/**
 * The epitaph (CAN-002): the skull that ends the footer's closing line.
 * Hover or focus shows it, a click toggles it (aria-expanded), Escape closes
 * it. English on every locale; no navigation.
 */

import { expect, test } from '@playwright/test';

const EPITAPH =
  /they did not let us alone, they built a game with which to create a better world\./;

test.describe('footer epitaph', () => {
  test('click toggles, Escape closes, the page never moves', async ({ page }) => {
    await page.goto('/ja/');
    const skull = page.locator('footer').getByRole('button', { name: 'Epitaph' });
    const tip = page.locator('#footer-epitaph');
    await expect(skull).toHaveAttribute('aria-expanded', 'false');
    await expect(tip).toBeHidden();
    await expect(tip).toHaveText(EPITAPH);

    await skull.click();
    await expect(skull).toHaveAttribute('aria-expanded', 'true');
    await expect(tip).toBeVisible();
    await expect(page).toHaveURL(/\/ja\/$/);

    await page.keyboard.press('Escape');
    await expect(skull).toHaveAttribute('aria-expanded', 'false');
    await expect(tip).toBeHidden();
  });

  test('keyboard focus shows it, and the skull sits after the build line', async ({ page }) => {
    await page.goto('/');
    const skull = page.locator('footer').getByRole('button', { name: 'Epitaph' });
    await skull.focus();
    await expect(page.locator('#footer-epitaph')).toBeVisible();
    const build = await page.locator('footer .build').boundingBox();
    const box = await skull.boundingBox();
    expect(box!.x).toBeGreaterThan(build!.x + build!.width);
  });

  test('a 44px target on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const box = await page.locator('footer').getByRole('button', { name: 'Epitaph' }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('on a phone the popover stays inside the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('footer').getByRole('button', { name: 'Epitaph' }).click();
    const tip = await page.locator('#footer-epitaph').boundingBox();
    expect(tip!.x).toBeGreaterThanOrEqual(0);
    expect(tip!.x + tip!.width).toBeLessThanOrEqual(390);
  });
});
