/**
 * «Encuentros» in the organization panel (v3, carril 5), in a real browser
 * against the built site. The e2e server has no auth secrets, so the session
 * and the till's list of accounts are played by the browser (`page.route`),
 * as in panel-agentes.spec.ts; the encounters are the register's own, made
 * into the page when the site was built — what is under test is that each
 * organization finds its community's encounters: by the account in the
 * community's `team:` (Numen Games), by the one the house opens for it
 * (COMMIT, the id derived as lib/community-teams.ts derives it), and an
 * organization with no community page is told so. Plus the rail, the five
 * locales, the phone and axe.
 *
 * With SHOTS_DIR set, the screens are also saved as screenshots there.
 */

import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ME = '0x42e6000000000000000000000000000000ca26';

/** lib/community-teams.ts `communityAccountId`, in Node. */
const derived = (communityId: string) =>
  `acc_t_${createHash('sha256').update(`numinia-till community ${communityId}`).digest('hex').slice(0, 32)}`;

const GAMES = {
  id: 'acc_team_numen_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'owner',
  balanceCents: 0,
};
const COMMIT = {
  id: derived('commit-conf'),
  kind: 'team',
  name: 'COMMIT',
  role: 'admin',
  balanceCents: 0,
};
const LONE = { id: 'acc_t_lone', kind: 'team', name: 'Sin página', role: 'owner', balanceCents: 0 };

async function signedIn(page: Page): Promise<void> {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: ME, rank: 'nomad' } }),
  );
  await page.route('**/api/saldo', (route) =>
    route.fulfill({ json: { accounts: [GAMES, COMMIT, LONE] } }),
  );
}

const panel = (page: Page) => page.locator('[data-org-panel]');

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
}

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env['SHOTS_DIR'];
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}

test.describe('the panel’s «Encuentros»', () => {
  test('is a link in the rail now, and leads to its own page with the organization kept', async ({
    page,
  }) => {
    await signedIn(page);
    await open(page, `/es/panel/?org=${GAMES.id}`);
    const link = page.locator('[data-org-rail] a[data-metric="panel-nav-gatherings"]');
    await expect(link).toHaveText('Encuentros');
    await expect(link).toHaveAttribute('href', `/es/panel/encuentros/?org=${GAMES.id}`);
    await link.click();
    await expect(page).toHaveURL(`/es/panel/encuentros/?org=${GAMES.id}`);
    await expect(page.locator('h1')).toHaveText('Encuentros');
    await expect(page.locator('[data-org-rail] a[aria-current="page"]')).toHaveAttribute(
      'data-metric',
      'panel-nav-gatherings',
    );
  });

  test('lists the community’s upcoming encounters, nearest first, with the ways to its page and its calendar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signedIn(page);
    await open(page, `/es/panel/encuentros/?org=${GAMES.id}`);
    const list = page.locator('[data-gatherings="numen-games"]');
    await expect(list).toContainText('Su comunidad');
    await expect(list).toContainText('Numen Games');
    await expect(list.locator('[data-metric="panel-gatherings-community"]')).toHaveAttribute(
      'href',
      '/es/communities/numen-games/',
    );
    await expect(list.locator('[data-metric="panel-gatherings-subscribe"]')).toHaveAttribute(
      'href',
      '/communities/numen-games/calendar.ics',
    );
    await expect(list).toContainText('Próximos · 2');
    const rows = list.locator('[data-gathering]');
    expect(
      await rows.evaluateAll((all) => all.map((row) => row.getAttribute('data-gathering'))),
    ).toEqual(['numinia-anniversary-2026', 'public-domain-day-2027']);
    await expect(rows.first().locator('a')).toHaveAttribute(
      'href',
      '/es/rituals/numinia-anniversary-2026/',
    );
    await expect(rows.first()).toContainText('El Aniversario de Numinia');
    await expect(rows.first()).toContainText('2026');
    // Nothing held yet: said, not an empty box.
    await expect(list).toContainText('Ya celebrados · 0');
    await expect(list.locator('[data-gatherings-empty]')).toHaveText(
      'Aún no hay ninguno celebrado.',
    );
    await shot(page, 'panel-encuentros-desktop');
  });

  test('finds a community by the account the house opens for it, and lists what it already held', async ({
    page,
  }) => {
    await signedIn(page);
    await open(page, `/es/panel/encuentros/?org=${COMMIT.id}`);
    const list = page.locator('[data-gatherings="commit-conf"]');
    await expect(list).toContainText('Próximos · 0');
    await expect(list.locator('[data-gatherings-empty]').first()).toHaveText(
      'Todavía no hay ninguno publicado.',
    );
    await expect(list).toContainText('Ya celebrados · 1');
    await expect(list.locator('[data-gathering="commit-conf-2026"] a')).toHaveAttribute(
      'href',
      '/es/rituals/commit-conf-2026/',
    );
  });

  test('an organization with no page in Communities is told so, with no list', async ({ page }) => {
    await signedIn(page);
    await open(page, `/es/panel/encuentros/?org=${LONE.id}`);
    await expect(page.locator('[data-gatherings-none]')).toContainText(
      'Esta organización no tiene todavía página en Comunidades',
    );
    await expect(page.locator('[data-gathering]')).toHaveCount(0);
  });

  for (const [prefix, title, upcoming] of [
    ['', 'Gatherings', 'Coming · 2'],
    ['/ja', '集まり', 'これから · 2'],
    ['/ko', '모임', '다가오는 모임 · 2'],
    ['/pt-br', 'Encontros', 'Próximos · 2'],
  ] as const) {
    test(`speaks ${prefix || '/en'}`, async ({ page }) => {
      await signedIn(page);
      await open(page, `${prefix}/panel/encuentros/?org=${GAMES.id}`);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('[data-gatherings="numen-games"]')).toContainText(upcoming);
      await expect(page.locator('[data-gathering="numinia-anniversary-2026"] a')).toHaveAttribute(
        'href',
        `${prefix}/rituals/numinia-anniversary-2026/`,
      );
    });
  }

  test('fits a phone, and axe finds nothing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signedIn(page);
    await open(page, `/es/panel/encuentros/?org=${GAMES.id}`);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
    await shot(page, 'panel-encuentros-mobile');
    const results = await new AxeBuilder({ page }).include('[data-org-content]').analyze();
    expect(results.violations).toEqual([]);
  });

  test('on a wide screen axe finds nothing either, for the page with no community', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signedIn(page);
    await open(page, `/es/panel/encuentros/?org=${LONE.id}`);
    await shot(page, 'panel-encuentros-sin-comunidad-desktop');
    const results = await new AxeBuilder({ page }).include('[data-org-content]').analyze();
    expect(results.violations).toEqual([]);
  });
});
