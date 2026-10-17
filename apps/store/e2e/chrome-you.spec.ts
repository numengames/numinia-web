/**
 * Cut I, «Tu agenda» and «Tus mundos» in your rail: the two new places sit
 * between «Tus comunidades» and «Tu saldo» — in the rail, in the phone's
 * «Tú» sheet, in the folded rail's tooltips — in five languages, and their
 * counters appear only once there is something to count: how many
 * encounters you are going to that are still ahead (`/api/rsvp`), how many
 * worlds your communities have (`/api/mundos/mine`) — and, since cut
 * «Seguir», how many communities you belong to or follow (`/api/follow`,
 * each counted once). Signed out nothing is asked and nothing is shown. The
 * e2e server has no auth secrets, so the session and the reads are played
 * by the browser (`page.route`).
 */

import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const sha = async (text: string): Promise<string> =>
  createHash('sha256').update(text).digest('hex');

const WALLET = '0x42e6000000000000000000000000000000ca26';
/** An encounter still to come when this spec was written (the register's). */
const TRG = 'trg26';
/** One already held: never counted. */
const HELD = 'commit-conf-2026';

const LOCALES = [
  { path: '/es/', agenda: 'Tu agenda', worlds: 'Tus mundos' },
  { path: '/', agenda: 'Your agenda', worlds: 'Your worlds' },
  { path: '/ja/', agenda: 'あなたの予定', worlds: 'あなたのワールド' },
  { path: '/ko/', agenda: '내 일정', worlds: '내 월드' },
  { path: '/pt-br/', agenda: 'Sua agenda', worlds: 'Seus mundos' },
] as const;

async function signedIn(
  page: Page,
  reads: {
    readonly mine: readonly string[];
    readonly worlds: number;
    readonly teams?: readonly string[];
    readonly follows?: readonly string[];
  } | null,
): Promise<{ asked: () => string[] }> {
  const asked: string[] = [];
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank: 'nomad' } }),
  );
  await page.route('**/api/rsvp**', (route) => {
    // The page's own «Me apunto» asks `?ids=…`; the rail's read carries no query.
    asked.push(new URL(route.request().url()).search === '' ? 'rsvp' : 'rsvp-ids');
    return reads === null
      ? route.fulfill({ status: 401, json: { error: 'signed-out' } })
      : route.fulfill({ status: 200, json: { mine: reads.mine, counts: {} } });
  });
  await page.route('**/api/mundos/mine', (route) => {
    asked.push('mine');
    return reads === null
      ? route.fulfill({ status: 401, json: { error: 'signed-out' } })
      : route.fulfill({
          status: 200,
          json: {
            ok: true,
            count: reads.worlds,
            communities: (reads.teams ?? []).map((accountId) => ({
              accountId,
              name: accountId,
              worldIds: [],
            })),
          },
        });
  });
  await page.route('**/api/follow**', (route) => {
    asked.push(new URL(route.request().url()).search === '' ? 'follow' : 'follow-ids');
    return reads === null
      ? route.fulfill({ status: 401, json: { error: 'signed-out' } })
      : route.fulfill({ status: 200, json: { mine: reads.follows ?? [], counts: {} } });
  });
  return { asked: () => asked };
}

test.describe('the two places, in five languages', () => {
  test('in the rail, between «Tus comunidades» and «Tu saldo», each to its page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    for (const locale of LOCALES) {
      await page.goto(locale.path);
      const prefix = locale.path === '/' ? '' : locale.path.slice(0, -1);
      const agenda = page.locator('.rail-tu [data-metric="you-agenda"]');
      const worlds = page.locator('.rail-tu [data-metric="you-worlds"]');
      await expect(agenda, locale.path).toContainText(locale.agenda);
      await expect(worlds, locale.path).toContainText(locale.worlds);
      await expect(agenda).toHaveAttribute('href', `${prefix}/agenda/`);
      await expect(worlds).toHaveAttribute('href', `${prefix}/mis-mundos/`);
      await expect(agenda).toHaveAttribute('data-rail-tip', locale.agenda);
      // Signed out: no counter at all, and nothing asked.
      await expect(agenda.locator('[data-you-count]')).toBeHidden();
      await expect(worlds.locator('[data-you-count]')).toBeHidden();
    }
    const metrics = await page
      .locator('.rail-tu .rail-nav a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('data-metric')));
    expect(metrics).toEqual([
      'you-notices',
      'you-your-communities',
      'you-agenda',
      'you-worlds',
      'you-balance',
      'you-loot',
    ]);
  });

  test('in the phone\u2019s «Tú» sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of LOCALES) {
      await page.goto(locale.path);
      await page.locator('[data-metric="tab-you"]').click();
      await expect(page.locator('#hoja-tu [data-metric="sheet-agenda"]')).toContainText(
        locale.agenda,
      );
      await expect(page.locator('#hoja-tu [data-metric="sheet-worlds"]')).toContainText(
        locale.worlds,
      );
      await page.keyboard.press('Escape');
    }
  });

  test('the folded rail keeps their tooltips', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/');
    await page.locator('[data-rail-fold="you"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-rail-you', 'collapsed');
    await page.locator('.rail-tu [data-metric="you-worlds"]').hover();
    await expect(page.locator('#rail-tip')).toHaveText('Tus mundos');
  });

  test('«Tu agenda» is lit on /agenda/ and «Tus mundos» on /mis-mundos/', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/es/agenda/');
    await expect(page.locator('.rail-tu [data-metric="you-agenda"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.goto('/es/mis-mundos/');
    await expect(page.locator('.rail-tu [data-metric="you-worlds"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

test.describe('the counters', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
  });

  test('signed in, each read once; the figures say what is ahead and what your communities have', async ({
    page,
  }) => {
    // The till's id for the community «trgcon» (lib/you-counts.ts derives it the same way):
    // belonging to it and following it count as one.
    const trgcon = 'acc_t_' + (await sha('numinia-till community trgcon')).slice(0, 32);
    const session = await signedIn(page, {
      mine: [TRG, HELD],
      worlds: 3,
      teams: [trgcon, 'acc_t_other'],
      follows: ['trgcon', 'merge'],
    });
    await page.goto('/es/');
    const agenda = page.locator('.rail-tu [data-metric="you-agenda"] [data-you-count]');
    const worlds = page.locator('.rail-tu [data-metric="you-worlds"] [data-you-count]');
    const communities = page.locator(
      '.rail-tu [data-metric="you-your-communities"] [data-you-count]',
    );
    await expect(agenda).toBeVisible();
    await expect(agenda).toHaveText('1');
    await expect(worlds).toHaveText('3');
    await expect(communities).toHaveText('3');
    // The phone sheet's figures are painted too (hidden with the sheet, but written).
    await expect(page.locator('#hoja-tu [data-metric="sheet-worlds"] [data-you-count]')).toHaveText(
      '3',
    );
    await page.waitForLoadState('networkidle');
    expect(
      session
        .asked()
        .filter((read) => read !== 'rsvp-ids')
        .sort(),
    ).toEqual(['follow', 'mine', 'rsvp']);
  });

  test('never a «0»: with no RSVP ahead and no world the figures stay hidden', async ({ page }) => {
    await signedIn(page, { mine: [HELD], worlds: 0 });
    await page.goto('/es/');
    await expect(page.locator('[data-metric="chrome-account"]')).toBeVisible();
    await expect(page.locator('.rail-tu [data-metric="you-agenda"] [data-you-count]')).toBeHidden();
    await expect(page.locator('.rail-tu [data-metric="you-worlds"] [data-you-count]')).toBeHidden();
    await expect(
      page.locator('.rail-tu [data-metric="you-your-communities"] [data-you-count]'),
    ).toBeHidden();
  });

  test('a refusal leaves the figures hidden', async ({ page }) => {
    await signedIn(page, null);
    await page.goto('/es/');
    await expect(page.locator('[data-metric="chrome-account"]')).toBeVisible();
    await expect(page.locator('.rail-tu [data-metric="you-agenda"] [data-you-count]')).toBeHidden();
    await expect(page.locator('.rail-tu [data-metric="you-worlds"] [data-you-count]')).toBeHidden();
  });

  test('signed out nothing is asked', async ({ page }) => {
    const asked: string[] = [];
    await page.route('**/api/rsvp**', (route) => {
      asked.push('rsvp');
      return route.fulfill({ status: 401, json: { error: 'signed-out' } });
    });
    await page.route('**/api/mundos/mine', (route) => {
      asked.push('mine');
      return route.fulfill({ status: 401, json: { error: 'signed-out' } });
    });
    await page.route('**/api/follow**', (route) => {
      asked.push('follow');
      return route.fulfill({ status: 401, json: { error: 'signed-out' } });
    });
    await page.goto('/es/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('data-session', 'out');
    expect(asked).toEqual([]);
  });
});
