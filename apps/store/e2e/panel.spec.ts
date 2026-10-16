/**
 * «El panel» (/panel/) in a real browser against the built site: from the
 * account menu to the organization's pieces. As in saldo.spec.ts and
 * members.spec.ts the e2e server has no auth secrets, so the session and the
 * till's answers are played by the browser (`page.route`), shaped as the
 * routes send them; the fixture desk is not touched. What is under test is
 * what the panel does with each answer: the door in the menu, the
 * organization in the address, the switcher, what each person is in each
 * organization, the pieces built and not, the Oracle's rooms, the phone.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const WALLET = '0x42e6000000000000000000000000000000ca26';
const OTHER = `0x${'cd'.repeat(20)}`;

const PERSONAL = { id: 'acc_p', kind: 'personal', name: null, role: 'owner', balanceCents: 420 };
const GAMES = {
  id: 'acc_t_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'admin',
  balanceCents: 14_280,
};
const ACTIVE = {
  id: 'acc_t_active',
  kind: 'team',
  name: 'Active Inference Institute',
  role: 'member',
  balanceCents: 6_420,
};
const TARUGO = {
  id: 'acc_t_tarugo',
  kind: 'team',
  name: 'La Tarugo',
  role: 'member',
  balanceCents: 3_650,
};
const TEAMS = [GAMES, ACTIVE, TARUGO];

/** What the person is in each organization: owner, a member with a role, or the house. */
const STANDING: Record<string, { as: 'owner' | 'member' | 'house'; held: string[] }> = {
  [GAMES.id]: { as: 'owner', held: [] },
  [ACTIVE.id]: { as: 'member', held: ['role_finance'] },
  [TARUGO.id]: { as: 'house', held: [] },
};

const role = (id: string, name: string, position: number, extra: object = {}) => ({
  id,
  name,
  color: null,
  position,
  hoist: false,
  permissions: [],
  members: 0,
  mayEdit: position > 0,
  ...extra,
});

function organization(id: string) {
  const { as, held } = STANDING[id] ?? { as: 'member' as const, held: [] };
  return {
    ok: true,
    accountId: id,
    as,
    roles: [
      role('role_admin', 'Administración', 2, { permissions: ['administrator'], members: 1 }),
      role('role_finance', 'Finanzas', 1, { permissions: ['manage-balance'], members: 1 }),
      role('role_base', '@todos', 0, { permissions: ['enter-worlds', 'top-up'], members: 2 }),
    ],
    members: [
      {
        wallet: OTHER,
        owner: true,
        addedAt: '2026-09-01T00:00:00.000Z',
        roleIds: [],
        assignable: [],
      },
      ...(as === 'house'
        ? []
        : [
            {
              wallet: WALLET,
              owner: as === 'owner',
              addedAt: '2026-09-02T00:00:00.000Z',
              roleIds: held,
              assignable: [],
            },
          ]),
    ],
  };
}

function statementOf(account: (typeof TEAMS)[number]) {
  return {
    statement: {
      account,
      balanceCents: account.balanceCents,
      lowBalance: false,
      lots: [],
      spend: [],
      spendTotalCents: 0,
      lines: [],
      members: [],
    },
    you: WALLET,
    access: {
      as: STANDING[account.id]?.as ?? 'member',
      permissions: ['enter-worlds', 'top-up', 'view-balance'],
      holders: {},
    },
  };
}

interface Seen {
  /** Every address under /api/saldo that the page asked for. */
  readonly saldo: string[];
  /** The `cuenta` of each roles request, in order. */
  readonly roles: string[];
  /** The `cuenta` of each statement request, in order. */
  readonly statements: string[];
}

/** A session of this rank, and the till answering for these accounts. */
async function signedIn(page: Page, rank: string, accounts: object[] = [PERSONAL, ...TEAMS]) {
  const seen: Seen = { saldo: [], roles: [], statements: [] };
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/saldo')) seen.saldo.push(`${url.pathname}${url.search}`);
  });
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank } }),
  );
  await page.route('**/api/saldo/roles?*', (route: Route) => {
    const id = new URL(route.request().url()).searchParams.get('cuenta') ?? '';
    seen.roles.push(id);
    return route.fulfill({ json: { roles: organization(id), you: WALLET } });
  });
  await page.route('**/api/saldo/statement?*', (route: Route) => {
    const id = new URL(route.request().url()).searchParams.get('cuenta') ?? '';
    seen.statements.push(id);
    const account = [PERSONAL, ...TEAMS].find((entry) => entry.id === id) ?? GAMES;
    return route.fulfill({ json: statementOf(account as (typeof TEAMS)[number]) });
  });
  await page.route('**/api/saldo/log?*', (route: Route) =>
    route.fulfill({ json: { log: { ok: true, accountId: GAMES.id, lines: [] } } }),
  );
  await page.route('**/api/saldo', (route: Route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { accounts } })
      : route.fulfill({ json: { result: { ok: true } } }),
  );
  return seen;
}

const panel = (page: Page) => page.locator('[data-org-panel]');
const rail = (page: Page) => page.locator('[data-org-rail]');

async function ready(page: Page): Promise<void> {
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
}

const BUILT = ['members', 'roles', 'balance'] as const;
const SOON = [
  ['venues', 'Sedes'],
  ['gatherings', 'Encuentros'],
  ['agents', 'Agentes'],
  ['memory', 'Memoria · la Summa'],
  ['bazaar', 'Objetos del Bazar'],
  ['settings', 'Ajustes'],
] as const;
const ROOMS = [
  ['census', 'Censo', '/es/lap/admin/census/'],
  ['worlds', 'Mundos', '/es/lap/admin/worlds/'],
  ['prices', 'Precios', '/es/lap/admin/prices/'],
  ['assets', 'Assets', '/es/lap/admin/assets/'],
] as const;

test.describe('the door', () => {
  test('«Paneles» sits between Perfil and Ajustes in the account menu, once you are in', async ({
    page,
  }) => {
    await signedIn(page, 'nomad');
    await page.goto('/es/communities/');
    await page.locator('[data-metric="chrome-account"]').click();
    const entries = page.locator('details[data-session-in] .cima-pop a.opc');
    await expect(entries).toHaveCount(4);
    expect(
      await entries.evaluateAll((all) => all.map((a) => a.getAttribute('data-metric'))),
    ).toEqual(['chrome-profile', 'chrome-panels', 'chrome-account-settings', 'chrome-sign-out']);
    const door = page.locator('[data-metric="chrome-panels"]');
    await expect(door).toHaveText('Paneles');
    await expect(door).toHaveAttribute('href', '/es/panel/');
    // The same icon the sidebar gives Perteneces: it is already in the page's sprite.
    await expect(door.locator('svg use')).toHaveAttribute('href', '#i-users-three');
  });

  test('signed out the menu offers no panels, and the door never hides behind another page', async ({
    page,
  }) => {
    await page.goto('/es/communities/');
    await expect(page.locator('[data-metric="chrome-panels"]')).toBeHidden();
    await expect(page.locator('[data-metric="chrome-sign-in"]')).toBeVisible();
  });

  test('opening the menu, or any other page, asks nothing of the till', async ({ page }) => {
    const seen = await signedIn(page, 'oracle');
    await page.goto('/es/communities/');
    await page.locator('[data-metric="chrome-account"]').click();
    await expect(page.locator('[data-metric="chrome-panels"]')).toBeVisible();
    await page.goto('/es/lap/');
    await page.waitForLoadState('networkidle');
    expect(seen.saldo).toEqual([]);
  });

  test('every language names the door in its own words', async ({ page }) => {
    await signedIn(page, 'nomad');
    const words: Array<[string, string, string]> = [
      ['/communities/', 'Panels', '/panel/'],
      ['/ja/communities/', 'パネル', '/ja/panel/'],
      ['/ko/communities/', '패널', '/ko/panel/'],
      ['/pt-br/communities/', 'Painéis', '/pt-br/panel/'],
    ];
    for (const [path, word, href] of words) {
      await page.goto(path);
      const door = page.locator('[data-metric="chrome-panels"]');
      await expect(door).toHaveText(word);
      await expect(door).toHaveAttribute('href', href);
    }
  });
});

test.describe('without a session, or without an organization', () => {
  test('signed out, every screen asks you to sign in and comes back to itself', async ({
    page,
  }) => {
    for (const path of [
      '/es/panel/',
      '/es/panel/miembros/',
      '/es/panel/roles/',
      '/es/panel/saldo/',
    ]) {
      await page.goto(path);
      const door = page.locator('[data-org-signed-out] a');
      await expect(door).toBeVisible();
      await expect(door).toHaveAttribute(
        'href',
        `/es/lap/session/?vuelta=${encodeURIComponent(path)}`,
      );
      await expect(door).toHaveAttribute('data-metric', 'panel-sign-in');
      // Nothing of the panel is offered to someone who is out.
      await expect(rail(page)).toBeHidden();
      await expect(page.locator('[data-org-rooms]').first()).toBeHidden();
    }
  });

  test('with no organization: one sentence and the way to Saldo, where one is created', async ({
    page,
  }) => {
    await signedIn(page, 'nomad', [PERSONAL]);
    await page.goto('/es/panel/');
    const none = page.locator('[data-org-none]');
    await expect(none).toContainText('Todavía no estás en ninguna organización');
    await expect(none.locator('a')).toHaveAttribute('href', '/es/saldo/');
    await expect(none.locator('a')).toHaveAttribute('data-metric', 'panel-none-saldo');
    await expect(panel(page)).toHaveAttribute('data-state', 'empty');
    await expect(rail(page)).toBeHidden();
  });

  test('when the till does not answer it says so and offers to try again', async ({ page }) => {
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({ status: 200, json: { address: WALLET, rank: 'nomad' } }),
    );
    await page.route('**/api/saldo', (route) => route.fulfill({ status: 502, json: {} }));
    await page.goto('/es/panel/');
    await expect(page.locator('[data-org-failed]')).toContainText('La caja no ha respondido');
    await expect(page.locator('[data-org-failed] button')).toBeVisible();
  });
});

test.describe('the organization in the address', () => {
  test('with one organization the panel shows it, with no switcher to choose', async ({ page }) => {
    await signedIn(page, 'nomad', [PERSONAL, GAMES]);
    await page.goto('/es/panel/');
    await ready(page);
    await expect(page.locator('[data-org-switch]')).toContainText('Panel de');
    await expect(page.locator('[data-org-switch]')).toContainText('Numen Games');
    await expect(page.locator('#org-switch')).toHaveCount(0);
    await expect(page.locator('[data-org-name]')).toHaveText('Numen Games');
    await expect(page.locator('h1')).toHaveText('Resumen');
  });

  test('with several, a labelled selector lists them (never the personal account) and changes ?org=', async ({
    page,
  }) => {
    await signedIn(page, 'nomad');
    await page.goto('/es/panel/');
    await ready(page);
    const select = page.getByLabel('Panel de');
    await expect(select).toBeVisible();
    await expect(select.locator('option')).toHaveText([
      'Numen Games',
      'Active Inference Institute',
      'La Tarugo',
    ]);
    await expect(select).toHaveValue(GAMES.id);
    await expect(select).toHaveAttribute('data-metric', 'panel-org');

    await select.selectOption(ACTIVE.id);
    await expect(page).toHaveURL(/\/es\/panel\/\?org=acc_t_active$/);
    await expect(page.locator('[data-org-name]')).toHaveText('Active Inference Institute');
    await expect(select).toHaveValue(ACTIVE.id);
  });

  test('opens on the organization the address names, and falls back to the first for one that is not yours', async ({
    page,
  }) => {
    await signedIn(page, 'nomad');
    await page.goto(`/es/panel/?org=${TARUGO.id}`);
    await ready(page);
    await expect(page.locator('[data-org-name]')).toHaveText('La Tarugo');

    await page.goto('/es/panel/?org=acc_t_ffffffff');
    await ready(page);
    await expect(page.locator('[data-org-name]')).toHaveText('Numen Games');

    await page.goto('/es/panel/?org=%3Cscript%3E');
    await ready(page);
    await expect(page.locator('[data-org-name]')).toHaveText('Numen Games');
  });

  test('every link of the rail keeps it, and following one lands on the same organization', async ({
    page,
  }) => {
    await signedIn(page, 'oracle');
    await page.goto(`/es/panel/?org=${ACTIVE.id}`);
    await ready(page);
    const paths: Record<string, string> = {
      summary: '/es/panel/',
      members: '/es/panel/miembros/',
      roles: '/es/panel/roles/',
      balance: '/es/panel/saldo/',
    };
    for (const [id, path] of Object.entries(paths)) {
      await expect(rail(page).locator(`a[data-metric="panel-nav-${id}"]`)).toHaveAttribute(
        'href',
        `${path}?org=${ACTIVE.id}`,
      );
    }
    // The Oracle's rooms belong to the city: no organization in them.
    for (const [id, , href] of ROOMS) {
      await expect(rail(page).locator(`a[data-metric="panel-room-${id}"]`)).toHaveAttribute(
        'href',
        href,
      );
    }
    await rail(page).locator('a[data-metric="panel-nav-members"]').click();
    await expect(page).toHaveURL(new RegExp(`/es/panel/miembros/\\?org=${ACTIVE.id}$`));
    await ready(page);
    await expect(page.locator('[data-org-name]')).toHaveText('Active Inference Institute');
  });

  test('changing the organization on a screen keeps the screen and the rail', async ({ page }) => {
    await signedIn(page, 'nomad');
    await page.goto('/es/panel/saldo/');
    await ready(page);
    await page.getByLabel('Panel de').selectOption(TARUGO.id);
    await expect(page).toHaveURL(/\/es\/panel\/saldo\/\?org=acc_t_tarugo$/);
    await expect(rail(page).locator('a[data-metric="panel-nav-members"]')).toHaveAttribute(
      'href',
      `/es/panel/miembros/?org=${TARUGO.id}`,
    );
    await expect(page.locator('[data-saldo-balance]')).toHaveText(/36,50\s€/);
    await page.goBack();
    await expect(page).toHaveURL(/\/es\/panel\/saldo\/$/);
    await expect(page.locator('[data-org-name]')).toHaveText('Numen Games');
  });

  test('Perteneces stays lit while you are in the panel', async ({ page }) => {
    await signedIn(page, 'nomad');
    await page.goto('/es/panel/');
    await ready(page);
    await expect(page.locator('[data-metric="nav-belong"]')).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.locator('[data-metric="tab-belong"]')).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.locator('[data-metric="nav-profile"]')).not.toHaveAttribute('aria-current');
  });
});

test.describe('Resumen', () => {
  test('says what you are in the organization, and the roles you hold in it', async ({ page }) => {
    await signedIn(page, 'nomad');
    const you = page.locator('[data-org-you]');

    await page.goto(`/es/panel/?org=${GAMES.id}`);
    await ready(page);
    await expect(you).toContainText('Titular');
    await expect(you).toContainText('Eres titular');

    await page.goto(`/es/panel/?org=${ACTIVE.id}`);
    await ready(page);
    await expect(you).toContainText('Miembro');
    await expect(you.locator('[data-org-role]')).toHaveText(['Finanzas']);

    await page.goto(`/es/panel/?org=${TARUGO.id}`);
    await ready(page);
    await expect(you).toContainText('La casa');
    await expect(you).toContainText('Entras como la casa');
    await expect(you.locator('[data-org-role]')).toHaveCount(0);
  });

  test('has a card per piece: the built ones are links, the rest say «En construcción» and are not', async ({
    page,
  }) => {
    await signedIn(page, 'nomad');
    await page.goto(`/es/panel/?org=${ACTIVE.id}`);
    await ready(page);
    const cards = page.locator('[data-org-cards]');
    for (const id of BUILT) {
      const card = cards.locator(`[data-org-card="${id}"]`);
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('href', new RegExp(`\\?org=${ACTIVE.id}$`));
      await expect(card).toHaveAttribute('data-metric', `panel-card-${id}`);
    }
    for (const [id, name] of SOON) {
      const card = cards.locator(`[data-org-card="${id}"]`);
      await expect(card).toBeVisible();
      await expect(card).toContainText(name);
      await expect(card).toContainText('En construcción');
      await expect(card).toHaveAttribute('data-building', '');
      expect(await card.evaluate((element) => element.tagName)).not.toBe('A');
      await expect(card.locator('a')).toHaveCount(0);
    }
  });
});

test.describe('the pieces of the rail', () => {
  test('four are links, six are marked as under construction and are not, in the order of the prototype', async ({
    page,
  }) => {
    await signedIn(page, 'nomad');
    await page.goto('/es/panel/');
    await ready(page);
    await expect(rail(page).locator('.etiqueta').first()).toHaveText('Piezas · 10');
    expect(
      await rail(page)
        .locator('[data-piece-list] > li')
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-piece'))),
    ).toEqual([
      'summary',
      'venues',
      'gatherings',
      'members',
      'roles',
      'agents',
      'memory',
      'bazaar',
      'balance',
      'settings',
    ]);
    await expect(rail(page).locator('[data-piece-list] a')).toHaveCount(4);
    await expect(rail(page).locator('a[data-metric="panel-nav-members"]')).toHaveText('Miembros');
    await expect(rail(page).locator('a[data-metric="panel-nav-roles"]')).toHaveText('Roles');
    for (const [id, name] of SOON) {
      const row = rail(page).locator(`[data-piece="${id}"]`);
      await expect(row).toContainText(name);
      await expect(row).toContainText('En construcción');
      await expect(row).toHaveAttribute('data-building', '');
      await expect(row.locator('a')).toHaveCount(0);
      // Not even a way to fail: the name is a link nowhere in the panel.
      await expect(panel(page).getByRole('link', { name, exact: true })).toHaveCount(0);
    }
    await expect(rail(page).locator('a[aria-current="page"]')).toHaveCount(1);
    await expect(rail(page).locator('a[aria-current="page"]')).toHaveAttribute(
      'data-metric',
      'panel-nav-summary',
    );
  });

  test('a person who is not the Oracle sees none of the Oracle’s rooms', async ({ page }) => {
    await signedIn(page, 'citizen');
    await page.goto('/es/panel/');
    await ready(page);
    for (const [id] of ROOMS) {
      await expect(rail(page).locator(`a[data-metric="panel-room-${id}"]`)).toBeHidden();
      await expect(page.locator(`[data-org-card="${id}"]`)).toBeHidden();
    }
    await expect(page.locator('[data-org-rooms]').first()).toBeHidden();
  });

  test('the Oracle sees the four rooms, as links to the LAP’s own rooms', async ({ page }) => {
    await signedIn(page, 'oracle');
    await page.goto('/es/panel/');
    await ready(page);
    await expect(rail(page).locator('[data-org-rooms] .etiqueta')).toHaveText('Salas del Oráculo');
    for (const [id, name, href] of ROOMS) {
      const link = rail(page).locator(`a[data-metric="panel-room-${id}"]`);
      await expect(link).toBeVisible();
      await expect(link).toContainText(name);
      await expect(link).toHaveAttribute('href', href);
      const card = page.locator(`[data-org-card="${id}"]`);
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('href', href);
      await expect(card).toHaveAttribute('data-metric', `panel-room-card-${id}`);
    }
  });

  test('every control the panel itself draws carries a data-metric', async ({ page }) => {
    await signedIn(page, 'oracle');
    await page.goto('/es/panel/');
    await ready(page);
    const bare = await page
      .locator(
        '[data-org-rail] a, [data-org-switch] select, [data-org-cards] a, [data-org-none] a, [data-org-signed-out] a',
      )
      .evaluateAll((all) =>
        all.filter((element) => !element.getAttribute('data-metric')).map((e) => e.outerHTML),
      );
    expect(bare).toEqual([]);
  });
});

test.describe('the screens that already exist, inside the panel', () => {
  test('Miembros hosts the people of the chosen organization, with no second picker', async ({
    page,
  }) => {
    const seen = await signedIn(page, 'nomad');
    await page.goto(`/es/panel/miembros/?org=${ACTIVE.id}`);
    await ready(page);
    await expect(page.locator('h1')).toHaveText('Miembros');
    await expect(page.locator('[data-people-members]')).toBeVisible();
    await expect(page.locator('[data-person]')).toHaveCount(2);
    // The panel's own selector is the only one: the island's is gone.
    await expect(page.locator('#panel-org')).toHaveCount(0);
    await expect(page.getByLabel('Panel de')).toHaveValue(ACTIVE.id);
    // Only the chosen organization was read, never the first one in the list.
    expect(new Set(seen.roles)).toEqual(new Set([ACTIVE.id]));
  });

  test('Roles hosts the roles of the chosen organization, from the top down', async ({ page }) => {
    const seen = await signedIn(page, 'nomad');
    await page.goto(`/es/panel/roles/?org=${ACTIVE.id}`);
    await ready(page);
    await expect(page.locator('h1')).toHaveText('Roles');
    await expect(page.locator('[data-roles-list] [data-role-name]')).toHaveText([
      'Administración',
      'Finanzas',
      '@todos',
    ]);
    await expect(page.getByLabel('Panel de')).toHaveValue(ACTIVE.id);
    expect(new Set(seen.roles)).toEqual(new Set([ACTIVE.id]));
  });

  test('entering as the house shows the strip the screen already draws', async ({ page }) => {
    await signedIn(page, 'oracle');
    for (const path of ['/es/panel/miembros/', '/es/panel/roles/']) {
      await page.goto(`${path}?org=${TARUGO.id}`);
      await ready(page);
      await expect(page.locator('[data-panel-house]')).toContainText('Entras como la casa');
    }
  });

  test('Saldo y consumo hosts the balance of the chosen organization, with no second picker', async ({
    page,
  }) => {
    const seen = await signedIn(page, 'nomad');
    await page.goto(`/es/panel/saldo/?org=${ACTIVE.id}`);
    await ready(page);
    await expect(page.locator('h1')).toHaveText('Saldo y consumo');
    await expect(page.locator('[data-saldo-balance]')).toHaveText(/64,20\s€/);
    await expect(page.locator('#saldo-cuenta')).toHaveCount(0);
    await expect(page.locator('[data-metric="saldo-new-team"]')).toHaveCount(0);
    await expect(page.getByLabel('Panel de')).toHaveValue(ACTIVE.id);
    expect(new Set(seen.statements)).toEqual(new Set([ACTIVE.id]));
  });

  test('/saldo/ keeps its own picker, and /saldo/miembros/ sends you to the panel’s Miembros', async ({
    page,
  }) => {
    await signedIn(page, 'nomad');
    await page.goto('/es/saldo/');
    await expect(page.locator('#saldo-cuenta')).toBeVisible();
    await expect(page.locator('[data-metric="saldo-new-team"]')).toBeVisible();
    await expect(page.locator('[data-org-panel]')).toHaveCount(0);
    await page.goto('/es/saldo/miembros/');
    await expect(page).toHaveURL(/\/es\/panel\/miembros\/$/);
    await ready(page);
    await expect(page.locator('h1')).toHaveText('Miembros');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of [
    '/es/panel/',
    '/es/panel/miembros/',
    '/es/panel/roles/',
    '/es/panel/saldo/',
  ]) {
    test(`${path} has no sideways scroll, and the rail scrolls inside itself`, async ({ page }) => {
      await signedIn(page, 'oracle');
      await page.goto(`${path}?org=${ACTIVE.id}`);
      await ready(page);
      await page.waitForLoadState('networkidle');
      const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        window: window.innerWidth,
      }));
      expect(widths.page, `${path} is ${widths.page}px wide`).toBeLessThanOrEqual(widths.window);
      // The rail is a strip: its list scrolls, the page does not.
      const strip = await rail(page)
        .locator('[data-piece-list]')
        .evaluate((list) => ({
          scrolls: list.scrollWidth > list.clientWidth,
          inside: list.clientWidth,
        }));
      expect(strip.scrolls).toBe(true);
      expect(strip.inside).toBeLessThanOrEqual(390);
      // The switcher and the screen are in view, one under the other.
      await page.getByLabel('Panel de').scrollIntoViewIfNeeded();
      await expect(page.getByLabel('Panel de')).toBeVisible();
    });
  }
});

for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`axe, ${colorScheme}`, () => {
    for (const path of [
      '/es/panel/',
      '/es/panel/miembros/',
      '/es/panel/roles/',
      '/es/panel/saldo/',
    ]) {
      test(`${path} with an Oracle and three organizations passes WCAG A/AA`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await signedIn(page, 'oracle');
        await page.goto(`${path}?org=${ACTIVE.id}`);
        await ready(page);
        await expect(page.locator('[data-org-rooms]').first()).toBeVisible();
        await page.waitForLoadState('networkidle');
        await page.evaluate(() =>
          Promise.race([
            Promise.all(
              document
                .getAnimations()
                .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity))
                .map((a) => a.finished.catch(() => undefined)),
            ),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]),
        );
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .exclude('.binaria')
          .analyze();
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
        ).toEqual([]);
      });
    }
  });
}
