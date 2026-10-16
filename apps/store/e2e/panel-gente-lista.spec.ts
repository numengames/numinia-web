/**
 * «Gente» (cut 9), the panel's people list, in a real browser against the
 * built site. As in panel.spec.ts the e2e server has no auth secrets, so the
 * session and the till's answers (overview, roles, ranks, settings) are
 * played by the browser (`page.route`), shaped as the routes send them. What
 * is under test is what the screen does with them: the groups (Oracles, one
 * per role under the organization's own name, the rest), each row's avatar,
 * name, role and rank, no presence at all, a till that refuses, a piece
 * switched off, the five locales, the phone and axe.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ME = '0x42e6000000000000000000000000000000ca26';
const LUCIA = `0x${'a1'.repeat(20)}`;
const MARCOS = `0x${'b2'.repeat(20)}`;
const ANA = `0x${'c3'.repeat(20)}`;
const INES = `0x${'d4'.repeat(20)}`;

const GAMES = {
  id: 'acc_t_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'admin',
  balanceCents: 0,
};
const FACE = '/thumbs/avatar-arla-mncdhz3l.webp';

const role = (id: string, name: string, position: number, color: string | null) => ({
  id,
  name,
  color,
  position,
  hoist: false,
  permissions: [],
  members: 1,
  mayEdit: false,
});

const VIEW = {
  ok: true,
  accountId: GAMES.id,
  as: 'owner',
  roles: [
    role('role_team', 'Equipo', 3, '#3d8b5f'),
    role('role_money', 'Finanzas', 2, '#c0392b'),
    role('role_base', '@todos', 0, null),
  ],
  members: [
    { wallet: ME, owner: true, addedAt: '2026-06-03T09:00:00.000Z', roleIds: [], assignable: [] },
    {
      wallet: LUCIA,
      owner: false,
      addedAt: '2026-06-04T09:00:00.000Z',
      roleIds: ['role_team'],
      assignable: [],
      name: 'Lucía',
      face: FACE,
    },
    {
      wallet: MARCOS,
      owner: false,
      addedAt: '2026-06-05T09:00:00.000Z',
      roleIds: ['role_money', 'role_team'],
      assignable: [],
      name: 'Marcos',
    },
    {
      wallet: ANA,
      owner: false,
      addedAt: '2026-06-06T09:00:00.000Z',
      roleIds: ['role_money'],
      assignable: [],
    },
    {
      wallet: INES,
      owner: false,
      addedAt: '2026-06-07T09:00:00.000Z',
      roleIds: [],
      assignable: [],
      name: 'Inés',
    },
  ],
};

const RANKS = {
  [ME]: 'oracle',
  [LUCIA]: 'citizen',
  [MARCOS]: 'pilgrim',
  [ANA]: 'nomad',
  [INES]: null,
};

async function signedIn(
  page: Page,
  options: { roles?: 'ok' | 'refused'; ranks?: 'ok' | 'down'; off?: string[] } = {},
): Promise<void> {
  const { roles = 'ok', ranks = 'ok', off = [] } = options;
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: ME, rank: 'oracle' } }),
  );
  await page.route('**/api/saldo', (route) => route.fulfill({ json: { accounts: [GAMES] } }));
  await page.route('**/api/saldo/roles?*', (route) =>
    roles === 'ok'
      ? route.fulfill({ json: { roles: VIEW, you: ME } })
      : route.fulfill({ status: 403, json: { ok: false, problems: ['not a member'] } }),
  );
  await page.route('**/api/saldo/ranks?*', (route) =>
    ranks === 'ok'
      ? route.fulfill({ json: { ok: true, ranks: RANKS } })
      : route.fulfill({ status: 502, json: { error: 'till-failed' } }),
  );
  await page.route('**/api/saldo/settings?*', (route) =>
    route.fulfill({
      json: {
        settings: { ok: true, accountId: GAMES.id, off, vocabulary: 'mixed', mayEdit: true },
      },
    }),
  );
}

const groups = (page: Page) => page.locator('[data-gente-group]');

async function open(page: Page, path = '/es/panel/gente/'): Promise<void> {
  await page.goto(`${path}?org=${GAMES.id}`);
  await expect(page.locator('[data-org-panel]')).toHaveAttribute('data-state', 'ready');
}

test.describe('Gente', () => {
  test('groups the people: Oracles, each role under its own name, the rest', async ({ page }) => {
    await signedIn(page);
    await open(page);
    await expect(page.locator('h1')).toHaveText('Gente');
    expect(
      await groups(page).evaluateAll((all) => all.map((g) => g.getAttribute('data-gente-group'))),
    ).toEqual(['oracles', 'role:role_team', 'role:role_money', 'rest']);
    await expect(groups(page).nth(0).locator('h2')).toHaveText('Oráculos — 1');
    await expect(groups(page).nth(1).locator('h2')).toHaveText('Equipo — 2');
    await expect(groups(page).nth(2).locator('h2')).toHaveText('Finanzas — 1');
    await expect(groups(page).nth(3).locator('h2')).toHaveText('El resto — 1');
    // Nobody twice: Marcos holds two roles and sits under the higher one.
    await expect(page.locator(`[data-gente-person="${MARCOS}"]`)).toHaveCount(1);
    await expect(groups(page).nth(1).locator(`[data-gente-person="${MARCOS}"]`)).toHaveCount(1);
  });

  test('each row: avatar (the Bazar’s or the initial), name, role and rank', async ({ page }) => {
    await signedIn(page);
    await open(page);
    const lucia = page.locator(`[data-gente-person="${LUCIA}"]`);
    await expect(lucia.locator('img[data-gente-face]')).toHaveAttribute('src', FACE);
    await expect(lucia.locator('[data-gente-name]')).toHaveText('Lucía');
    await expect(lucia.locator('[data-gente-role]')).toHaveText('Equipo');
    await expect(lucia.locator('[data-gente-rank]')).toHaveText('Ciudadano');
    const marcos = page.locator(`[data-gente-person="${MARCOS}"]`);
    await expect(marcos.locator('[data-gente-initial]')).toHaveText('M');
    await expect(marcos.locator('[data-gente-rank]')).toHaveText('Peregrino');
    // No name published: the short wallet, and its first letter on the round avatar.
    const ana = page.locator(`[data-gente-person="${ANA}"]`);
    await expect(ana.locator('[data-gente-name]')).toHaveText('0xc3c3…c3c3');
    await expect(ana.locator('[data-gente-initial]')).toHaveText('C');
    // The owner, once; a rank nobody could read draws no chip; the rest hold the base role.
    const me = page.locator(`[data-gente-person="${ME}"]`);
    await expect(me).toContainText('(tú)');
    await expect(me.locator('[data-gente-owner]')).toHaveText('Titular');
    await expect(me.locator('[data-gente-rank]')).toHaveText('Oráculo');
    const ines = page.locator(`[data-gente-person="${INES}"]`);
    await expect(ines.locator('[data-gente-rank]')).toHaveCount(0);
    await expect(ines.locator('[data-gente-role]')).toHaveText('@todos');
  });

  test('has no presence: no «en línea», no status dots, no AI agents group', async ({ page }) => {
    await signedIn(page);
    await open(page);
    const list = page.locator('[data-gente-groups]');
    await expect(list.getByText(/en línea|conectad|online|ausente|estado/i)).toHaveCount(0);
    await expect(list.locator('[role="img"], .estado')).toHaveCount(0);
    await expect(list.getByText(/agentes|IA/)).toHaveCount(0);
  });

  test('without ranks the list still shows, with no Oracles group and no rank chips', async ({
    page,
  }) => {
    await signedIn(page, { ranks: 'down' });
    await open(page);
    await expect(groups(page).first()).not.toHaveAttribute('data-gente-group', 'oracles');
    await expect(page.locator('[data-gente-rank]')).toHaveCount(0);
    await expect(page.locator('[data-gente-person]')).toHaveCount(5);
  });

  test('a till that refuses says so and offers to try again', async ({ page }) => {
    await signedIn(page, { roles: 'refused' });
    await open(page);
    const failed = page.locator('[data-gente-failed]');
    await expect(failed).toBeVisible();
    await expect(failed.locator('[data-metric="panel-gente-retry"]')).toBeVisible();
  });

  test('is a piece of the rail, kept by the organization, and an off piece says so', async ({
    page,
  }) => {
    await signedIn(page);
    await open(page, '/es/panel/');
    const link = page.locator('[data-org-rail] a[data-metric="panel-nav-gente"]');
    await expect(link).toHaveText('Gente');
    await expect(link).toHaveAttribute('href', `/es/panel/gente/?org=${GAMES.id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/es/panel/gente/\\?org=${GAMES.id}$`));
    await expect(groups(page).first()).toBeVisible();
  });

  test('when the community turns it off the rail loses it and the address says so', async ({
    page,
  }) => {
    await signedIn(page, { off: ['gente'] });
    await open(page);
    await expect(page.locator('[data-piece-off="gente"]')).toBeVisible();
    await expect(page.locator('[data-org-rail] a[data-metric="panel-nav-gente"]')).toHaveCount(0);
    await expect(groups(page)).toHaveCount(0);
  });

  test('every language titles it in its own words', async ({ page }) => {
    await signedIn(page);
    const titles: Array<[string, string]> = [
      ['/panel/gente/', 'People'],
      ['/ja/panel/gente/', 'ピープル'],
      ['/ko/panel/gente/', '사람들'],
      ['/pt-br/panel/gente/', 'Gente'],
    ];
    for (const [path, title] of titles) {
      await open(page, path);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(groups(page).first()).toBeVisible();
    }
  });

  for (const [name, size] of [
    ['phone 390', { width: 390, height: 844 }],
    ['desktop', { width: 1280, height: 800 }],
  ] as const) {
    test(`has no sideways scroll and is axe clean on ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signedIn(page);
      await open(page);
      await expect(groups(page).first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
