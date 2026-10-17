/**
 * v3 «Ahora y Mundos» (cut C): the front page as «Ahora» in five locales,
 * its featured frame that moves only with its arrows, the index of worlds
 * and its filters, and the Bazar's shelves per community (never «· 0»).
 * Run against the fixture build: the fleet is fleet.json, the placements
 * homes.json (three worlds of Numen Games, one of Reset, one being deleted).
 */

import { expect, test } from '@playwright/test';

const HOMES = ['/', '/es/', '/ja/', '/ko/', '/pt-br/'];

test.describe('Ahora, the front page', () => {
  for (const path of HOMES) {
    test(`${path}: the frame, the encounters, the communities, the newest goods, the doors`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator('#destacado')).toBeVisible();
      await expect(page.locator('#destacado [data-featured-slide]:visible')).toHaveCount(1);
      for (const id of ['#rituals', '#alive', '#bazaar']) {
        await expect(page.locator(id)).toBeVisible();
      }
      await expect(page.locator('#bazaar [data-metric="home-good"]')).toHaveCount(4);
      await expect(page.locator('#alive .tarjeta')).toHaveCount(3);
      await expect(page.locator('section.final')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('the arrows change the featured item, and nothing moves by itself', async ({ page }) => {
    await page.goto('/es/');
    const frame = page.locator('#destacado');
    const title = frame.locator('[data-featured-slide]:visible h2');
    const first = await title.innerText();
    const count = frame.locator('[data-featured-count]');
    await expect(count).toHaveText(/^1 \/ \d$/);
    // No autoplay (WCAG 2.2.2): the same slide after a while.
    await page.waitForTimeout(4000);
    await expect(title).toHaveText(first);
    await frame.locator('[data-metric="home-featured-next"]').click();
    await expect(title).not.toHaveText(first);
    await expect(count).toHaveText(/^2 \/ \d$/);
    await frame.locator('[data-metric="home-featured-prev"]').click();
    await expect(title).toHaveText(first);
    // Wrapping: back from the first is the last.
    await frame.locator('[data-metric="home-featured-prev"]').click();
    const total = (await count.innerText()).split(' / ')[1];
    await expect(count).toHaveText(`${total} / ${total}`);
    await expect(frame.locator('[data-featured-slide]:visible')).toHaveCount(1);
  });

  test('the encounters say the visitor’s time zone', async ({ page }) => {
    await page.goto('/es/');
    await expect(page.locator('#rituals [data-tz]')).toHaveText(/^: .+\.$/);
  });

  test('on the phone, no list of worlds with people while nobody is inside', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/es/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.vivo-movil')).toBeHidden();
    // The fixture's live count is zero everywhere: no world slide either.
    await expect(page.locator('#destacado [data-live-slide]:visible')).toHaveCount(0);
  });
});

test.describe('Mundos, the index of worlds', () => {
  test('lists the placed worlds with their cards, never one being deleted', async ({ page }) => {
    await page.goto('/es/mundos/');
    await expect(page.locator('h1')).toHaveText('Mundos');
    const cards = page.locator('[data-world-card]');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('[data-world-card="old-plaza"]')).toHaveCount(0);
    // «bosque» belongs to an organization that is no community of the city:
    // the public list leaves it out (lib/world-index.ts).
    await expect(page.locator('[data-world-card="bosque"]')).toHaveCount(0);
    await expect(page.locator('[data-world-card="agora-plaza"] .chip').first()).toHaveText(
      /Encendido/,
    );
    // A card names its world; it never prints the raw id.
    await expect(
      page.locator('[data-world-card="agora-plaza"] [data-metric="worlds-card-title"]'),
    ).toHaveText('Agora Plaza');
    await expect(
      page.locator('[data-world-card="alchemists-tower"] [data-metric="worlds-card-title"]'),
    ).toHaveText('Alchemists Tower');
    await expect(
      page.locator('[data-world-card="agora-plaza"] [data-metric="worlds-card-page"]'),
    ).toHaveAttribute('href', '/es/mundos/agora-plaza/');
    // Every card's community leads to its page.
    await expect(
      page.locator('[data-world-card="agora-plaza"] [data-metric="worlds-card-community"]'),
    ).toHaveAttribute('href', '/es/communities/numen-games/');
    // No count the worlds did not give, no capacity.
    await expect(page.locator('[data-world-card] .mt-datos')).toHaveCount(0);
  });

  test('the chips filter the worlds, and a chip of nothing is never drawn', async ({ page }) => {
    await page.goto('/es/mundos/');
    const chips = page.locator('[data-world-filter]');
    // Nobody is inside and every placed world is the city's: those two chips alone.
    await expect(chips).toHaveText(['Todos · 3', 'De la ciudad · 3']);
    await expect(page.locator('[data-world-filter="communities"]')).toHaveCount(0);
    await expect(page.locator('[data-world-filter="people"]')).toHaveCount(0);
    await page.locator('[data-world-filter="city"]').click();
    await expect(page.locator('[data-world-card]:visible')).toHaveCount(3);
    await expect(page.locator('[data-world-filter="city"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('[data-world-filter="all"]').click();
    await expect(page.locator('[data-world-card]:visible')).toHaveCount(3);
    await expect(page.locator('[data-world-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a state explains itself on focus and closes with Esc', async ({ page }) => {
    await page.goto('/es/mundos/');
    const chip = page.locator('[data-world-card="agora-plaza"] [data-tip] .chip');
    const bubble = page.locator('[data-world-card="agora-plaza"] [role="tooltip"]');
    await chip.focus();
    await expect(bubble).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bubble).toBeHidden();
  });

  for (const path of ['/mundos/', '/ja/mundos/', '/ko/mundos/', '/pt-br/mundos/']) {
    test(`${path} exists in its language`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-world-card]')).toHaveCount(3);
    });
  }

  test('a world’s page says the same as its card — its name, its state, its community — in a hero, no card', async ({
    page,
  }) => {
    await page.goto('/es/mundos/agora-plaza/');
    await expect(page.locator('[data-world-hero] .mh-nombre')).toHaveText('Agora Plaza');
    await expect(page.locator('[data-world-state="on"]')).toHaveText(/Encendido/);
    await expect(page.locator('[data-world-org]')).toHaveText('Numen Games');
    await expect(page.locator('[data-world-card]')).toHaveCount(0);
    await expect(page.locator('[data-metric="worlds-card-enter"]')).toHaveCount(0);
  });
});

test('the Bazar shows a shelf per community with objects, never «· 0»', async ({ page }) => {
  await page.goto('/es/bazaar/');
  const shelves = page.locator('[data-bazaar-shelves] a');
  await expect(shelves).toHaveCount(1);
  await expect(shelves.first()).toHaveText(/^Numen Games · [1-9]\d*$/);
  for (const text of await shelves.allTextContents()) expect(text.trim()).not.toMatch(/· 0$/);
});
