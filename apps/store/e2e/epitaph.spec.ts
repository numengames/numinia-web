/**
 * The epitaph (CAN-002): the skull that ends the footer's closing line —
 * since the app shell (v0.83.0) at the foot of the sidebar on a desktop and
 * at the end of the page on a phone; since v3 (v0.112.0) at the foot of the
 * city's rail, with a second copy closing the page on a phone upright.
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
    const tip = page.locator('footer:visible .bocadillo');
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

  test('keyboard focus shows it, and the skull closes the signature line', async ({ page }) => {
    await page.goto('/');
    const skull = page.locator('footer').getByRole('button', { name: 'Epitaph' });
    await skull.focus();
    await expect(page.locator('footer:visible .bocadillo')).toBeVisible();
    const signature = await page.locator('footer:visible .pie-firma').boundingBox();
    const box = await skull.boundingBox();
    expect(box!.x).toBeGreaterThan(signature!.x + signature!.width);
  });

  test('on a desktop the bubble stays inside the window, the sidebar folded too', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/');
    const skull = page.locator('footer').getByRole('button', { name: 'Epitaph' });
    for (const fold of [false, true]) {
      if (fold) await page.locator('[data-metric="nav-collapse"]').click();
      await skull.click();
      const tip = page.locator('footer:visible .bocadillo');
      // The card fades in (shell.css `.bocadillo` transition): wait for it
      // to settle before reading geometry or paint, or we'd be checking a
      // half-faded frame, not the card a person actually sees.
      await expect(tip).toHaveCSS('opacity', '1');
      const box = await tip.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(900);

      // boundingBox() is geometry (getBoundingClientRect()): it says nothing
      // about whether an ANCESTOR's overflow paints over the bubble. The
      // rail (`.rail`, shell.css) scrolls and clips its own box — folded,
      // its 72px width is far short of the bubble's 224px — so check what
      // actually PAINTS at the bubble's own edges, not just its geometry.
      const edges = await page.evaluate(
        ({ box }) => {
          const inset = 12; // past the card's 8px border-radius corners
          const points: [string, number, number][] = [
            ['top', box.x + box.width / 2, box.y + inset],
            ['bottom', box.x + box.width / 2, box.y + box.height - inset],
            ['left', box.x + inset, box.y + box.height / 2],
            ['right', box.x + box.width - inset, box.y + box.height / 2],
          ];
          return points.map(([edge, x, y]) => ({
            edge,
            onTip: document.elementFromPoint(x, y)?.closest('.bocadillo') !== null,
          }));
        },
        { box },
      );
      for (const { edge, onTip } of edges) {
        expect(onTip, `the bubble's ${edge} edge is painted (not covered by an ancestor)`).toBe(
          true,
        );
      }

      await page.keyboard.press('Escape');
    }
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
    const tip = await page.locator('footer:visible .bocadillo').boundingBox();
    expect(tip!.x).toBeGreaterThanOrEqual(0);
    expect(tip!.x + tip!.width).toBeLessThanOrEqual(390);
  });
});
