/**
 * «La gente» (the panel's Miembros and Roles) in a real browser against the
 * built site. As in panel.spec.ts the e2e server has no auth secrets, so the
 * session and the till's answers are played by the browser (`page.route`),
 * shaped as the routes send them — and the organization here is a small
 * stateful one: every POST changes it and answers it as it is now, as the
 * till does. The fixture desk is not touched. What is under test is what the
 * two screens do with each answer: the table, the search, adding and taking
 * people out, giving and taking roles, the roles editor and its read-only
 * face, the signature that «Administrador» asks for, the house, the phone.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const ME = '0x42e6000000000000000000000000000000ca26';
const OWNER = `0x${'0a'.repeat(20)}`;
const ANA = `0x${'a1'.repeat(20)}`;
const TEO = `0x${'b2'.repeat(20)}`;
const NEW = `0x${'5e'.repeat(20)}`;

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
  role: 'admin',
  balanceCents: 0,
};

const ADMIN = 'role_00000000000000a1';
const FINANCE = 'role_00000000000000f1';
const BASE = 'role_00000000000000b0';

/** The words /api/saldo answers while an act waits for a fresh signature (lib/accounts.ts). */
const FRESH_SIGNATURE =
  'giving administrator or manage-roles needs a fresh signature of your wallet';

type As = 'owner' | 'member' | 'house';

interface Role {
  id: string;
  name: string;
  color: string | null;
  position: number;
  hoist: boolean;
  permissions: string[];
}

interface Person {
  wallet: string;
  owner: boolean;
  addedAt: string;
  roleIds: string[];
  /** What the person chose to show to the organization (optional: an older till sends neither). */
  name?: string | null;
  face?: string | null;
}

/** A thumbnail the site really serves (a Bazar avatar), as the till would name it. */
const ANA_FACE = '/thumbs/avatar-arla-mncdhz3l.webp';

/**
 * One organization, as the till keeps it, seen by one person: the owner, a
 * member who holds «Finanzas» (no «Gestionar roles»), or the house.
 */
class Organization {
  roles: Role[] = [
    {
      id: ADMIN,
      name: 'Administración',
      color: '#c0392b',
      position: 2,
      hoist: true,
      permissions: ['administrator'],
    },
    {
      id: FINANCE,
      name: 'Finanzas',
      color: '#2f7fa8',
      position: 1,
      hoist: false,
      permissions: ['view-balance', 'top-up', 'manage-balance'],
    },
    {
      id: BASE,
      name: '@todos',
      color: null,
      position: 0,
      hoist: false,
      permissions: ['enter-worlds'],
    },
  ];

  people: Person[];

  posted: Record<string, unknown>[] = [];

  constructor(
    readonly as: As,
    readonly me: string = ME,
  ) {
    this.people = [
      {
        wallet: as === 'owner' ? me : OWNER,
        owner: true,
        addedAt: '2026-06-03T09:00:00.000Z',
        roleIds: [],
      },
      ...(as === 'member'
        ? [{ wallet: me, owner: false, addedAt: '2026-09-02T09:00:00.000Z', roleIds: [FINANCE] }]
        : []),
      // A name and a face; a name only; and (above) neither — as the till sends them, or not.
      {
        wallet: ANA,
        owner: false,
        addedAt: '2026-09-20T09:00:00.000Z',
        roleIds: [FINANCE],
        name: 'Ana Ruiz',
        face: ANA_FACE,
      },
      { wallet: TEO, owner: false, addedAt: '2026-10-01T09:00:00.000Z', roleIds: [], name: 'Teo' },
    ];
  }

  /** The asker's power, as the till works it out: the owner and the house manage everything. */
  private manages(): boolean {
    return this.as !== 'member';
  }

  view() {
    const manages = this.manages();
    return {
      ok: true,
      accountId: GAMES.id,
      as: this.as,
      roles: [...this.roles]
        .sort((a, b) => b.position - a.position)
        .map((role) => ({
          ...role,
          members:
            role.position === 0
              ? this.people.length
              : this.people.filter((person) => person.roleIds.includes(role.id)).length,
          mayEdit: manages && role.position > 0,
        })),
      members: this.people.map((person) => ({
        ...person,
        assignable:
          manages && !person.owner && person.wallet !== this.me
            ? this.roles.filter((role) => role.position > 0).map((role) => role.id)
            : [],
      })),
    };
  }

  /** One POST of /api/saldo: the organization as it is after it, or the refusal. */
  act(body: Record<string, unknown>): unknown {
    this.posted.push(body);
    const { action } = body;
    const roleId = String(body['roleId'] ?? '');
    const who = String(body['wallet'] ?? '');
    const person = this.people.find((entry) => entry.wallet === who);
    const role = this.roles.find((entry) => entry.id === roleId);
    const gives = (permissions: unknown): boolean =>
      Array.isArray(permissions) &&
      permissions.some((p) => p === 'administrator' || p === 'manage-roles');
    if (body['fresh'] === undefined) {
      if (action === 'give-role' && role !== undefined && gives(role.permissions)) {
        return { ok: false, problems: [FRESH_SIGNATURE] };
      }
      const change = body['change'] as { permissions?: string[] } | undefined;
      if (
        action === 'edit-role' &&
        gives(change?.permissions?.filter((p) => !role?.permissions.includes(p)))
      ) {
        return { ok: false, problems: [FRESH_SIGNATURE] };
      }
    }
    if (action === 'set-member') {
      this.people.push({
        wallet: who,
        owner: false,
        addedAt: '2026-10-16T09:00:00.000Z',
        roleIds: [],
      });
      return { ok: true, members: [] };
    }
    if (action === 'remove-member') {
      this.people = this.people.filter((entry) => entry.wallet !== who);
      return { ok: true, members: [] };
    }
    if (action === 'give-role' && person) person.roleIds = [...person.roleIds, roleId];
    if (action === 'take-role' && person)
      person.roleIds = person.roleIds.filter((id) => id !== roleId);
    if (action === 'create-role') {
      const draft = body['role'] as Omit<Role, 'id' | 'position'>;
      this.roles = this.roles.map((entry) =>
        entry.position > 0 ? { ...entry, position: entry.position + 1 } : entry,
      );
      this.roles.push({ ...draft, id: 'role_00000000000000c1', position: 1 });
    }
    if (action === 'edit-role' && role) Object.assign(role, body['change']);
    if (action === 'move-role' && role) {
      const to = Number(body['position']);
      const other = this.roles.find((entry) => entry.position === to);
      if (other) other.position = role.position;
      role.position = to;
    }
    if (action === 'delete-role') this.roles = this.roles.filter((entry) => entry.id !== roleId);
    return this.view();
  }
}

interface Played {
  readonly organization: Organization;
  /** Every address under /api/saldo the page asked for. */
  readonly asked: string[];
}

/** A session, a till with GAMES (and TARUGO for the switcher) and this organization in it. */
async function signedIn(
  page: Page,
  as: As = 'owner',
  ranks: Record<string, string | null> = {
    [OWNER]: 'oracle',
    [ME]: 'oracle',
    [ANA]: 'citizen',
    [TEO]: null,
    [NEW]: 'nomad',
  },
): Promise<Played> {
  const organization = new Organization(as);
  const asked: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/saldo')) asked.push(`${url.pathname}${url.search}`);
  });
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      json: { address: ME, rank: as === 'house' ? 'oracle' : 'citizen' },
    }),
  );
  await page.route('**/api/saldo/roles?*', (route: Route) =>
    route.fulfill({ json: { roles: organization.view(), you: ME } }),
  );
  await page.route('**/api/saldo/ranks?*', (route: Route) =>
    route.fulfill({
      json: {
        ok: true,
        ranks: Object.fromEntries(
          organization.people.map((person) => [person.wallet, ranks[person.wallet] ?? null]),
        ),
      },
    }),
  );
  await page.route('**/api/saldo/log?*', (route: Route) =>
    route.fulfill({
      json: {
        log: {
          ok: true,
          accountId: GAMES.id,
          lines: [
            {
              seq: 1,
              at: '2026-10-15T09:00:00.000Z',
              actor: OWNER,
              asHouse: false,
              act: 'role-given',
              subject: ANA,
              detail: { name: 'Finanzas' },
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/saldo', (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { accounts: [GAMES, TARUGO] } });
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: { result: organization.act(body) } });
  });
  return { organization, asked };
}

const panel = (page: Page) => page.locator('[data-org-panel]');
const rail = (page: Page) => page.locator('[data-org-rail]');
const row = (page: Page, wallet: string) => page.locator(`[data-person="${wallet}"]`);
const short = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
}

async function members(page: Page): Promise<void> {
  await open(page, `/es/panel/miembros/?org=${GAMES.id}`);
  await expect(page.locator('[data-person]').first()).toBeVisible();
}

async function roles(page: Page): Promise<void> {
  await open(page, `/es/panel/roles/?org=${GAMES.id}`);
  await expect(page.locator('[data-roles-list] [data-role]').first()).toBeVisible();
}

test.describe('the rail', () => {
  test('eleven pieces: Miembros and Roles side by side, both keeping the organization', async ({
    page,
  }) => {
    await signedIn(page);
    await members(page);
    await expect(rail(page).locator('.etiqueta').first()).toHaveText('Piezas · 11');
    const ids = await rail(page)
      .locator('[data-piece-list] > li')
      .evaluateAll((rows) => rows.map((li) => li.getAttribute('data-piece')));
    expect(ids.slice(3, 5)).toEqual(['members', 'roles']);
    const people = rail(page).locator('a[data-metric="panel-nav-members"]');
    await expect(people).toHaveText('Miembros');
    await expect(people).toHaveAttribute('aria-current', 'page');
    const link = rail(page).locator('a[data-metric="panel-nav-roles"]');
    await expect(link).toHaveText('Roles');
    await expect(link).toHaveAttribute('href', `/es/panel/roles/?org=${GAMES.id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/es/panel/roles/\\?org=${GAMES.id}$`));
    await expect(page.locator('h1')).toHaveText('Roles');
    await expect(rail(page).locator('a[aria-current="page"]')).toHaveAttribute(
      'data-metric',
      'panel-nav-roles',
    );
  });

  test('signed out, both screens ask you to sign in and come back to themselves', async ({
    page,
  }) => {
    for (const path of ['/es/panel/miembros/', '/es/panel/roles/']) {
      await page.goto(path);
      await expect(page.locator('[data-org-signed-out] a')).toHaveAttribute(
        'href',
        `/es/lap/session/?vuelta=${encodeURIComponent(path)}`,
      );
      await expect(page.locator('[data-person], [data-roles-list]')).toHaveCount(0);
    }
  });
});

test.describe('Miembros', () => {
  test('a table of people: who, their rank in the city, their roles here, since when', async ({
    page,
  }) => {
    const { asked } = await signedIn(page);
    await members(page);
    await expect(page.locator('h1')).toHaveText('Miembros');
    await expect(page.locator('.panel-lead')).toHaveText(
      'Quién está dentro, su rango en la ciudad (es suyo, viaja con la persona) y sus roles aquí.',
    );
    const table = page.locator('[data-people-members] table');
    await expect(table.locator('thead th')).toHaveText([
      'Persona',
      'Rango',
      'Roles',
      'Desde',
      'Acciones',
    ]);
    await expect(page.locator('[data-people-count]')).toHaveText('3 miembros');

    // The owner: the crown and the chip, «(tú)» on the person's own row.
    const mine = row(page, ME);
    await expect(mine).toContainText(short(ME));
    await expect(mine).toContainText('(tú)');
    await expect(mine.locator('[data-owner-chip]')).toHaveText('Titular');
    await expect(mine.locator('[data-rank]')).toHaveText('Oráculo');

    // A member: the short wallet only, her role as a chip with its dot, the rank the city gives.
    const ana = row(page, ANA);
    await expect(ana.locator('[data-rank]')).toHaveText('Ciudadano');
    await expect(ana.locator('[data-role-chip]')).toHaveText(['Finanzas']);
    await expect(ana.locator('[data-since]')).toContainText('2026');
    // A rank the city could not say is a dash, never a guess.
    await expect(row(page, TEO).locator('[data-rank]')).toHaveText('—');

    // What each person chose to show: a name and a face; a name only; neither.
    await expect(ana.locator('[data-person-name]')).toHaveText('Ana Ruiz');
    await expect(ana.locator('[data-person-wallet]')).toHaveText(short(ANA));
    const face = ana.locator('img[data-person-face]');
    await expect(face).toHaveAttribute('src', ANA_FACE);
    await expect(face).toHaveAttribute('alt', '');
    await expect(face).toHaveAttribute('loading', 'lazy');
    await expect(face).toHaveCSS('width', '32px');
    await expect(face).toHaveCSS('border-radius', '50%');
    await expect(ana.locator('[data-person-glyph]')).toHaveCount(0);
    const teo = row(page, TEO);
    await expect(teo.locator('[data-person-name]')).toHaveText('Teo');
    await expect(teo.locator('[data-person-wallet]')).toHaveText(short(TEO));
    await expect(teo.locator('img')).toHaveCount(0);
    await expect(teo.locator('[data-person-glyph]')).toHaveCount(1);
    await expect(mine.locator('[data-person-name]')).toHaveCount(0);
    await expect(mine.locator('[data-person-glyph]')).toHaveCount(1);
    await expect(mine.locator('img')).toHaveCount(0);

    // The colour of the highest coloured role is a dot, never the colour of the text.
    const dot = ana.locator('[data-person-dot]');
    await expect(dot).toHaveCSS('background-color', 'rgb(47, 127, 168)');
    const ink = await ana
      .locator('[data-person-wallet]')
      .evaluate((element) => getComputedStyle(element).color);
    expect(ink).not.toBe('rgb(47, 127, 168)');

    // The whole wallets are never shown (the menu copies one); the ranks are read for this organization only.
    const shownText = await page.locator('[data-people-members]').innerText();
    for (const wallet of [ANA, TEO, ME]) expect(shownText).not.toContain(wallet);
    expect(asked).toContain(`/api/saldo/ranks?cuenta=${GAMES.id}`);
  });

  test('the search filters by wallet or by name, whatever the capitals, and says when nothing matches', async ({
    page,
  }) => {
    await signedIn(page);
    await members(page);
    const search = page.getByLabel('Buscar por cartera o nombre');
    await expect(search).toHaveAttribute('data-metric', 'panel-people-search');
    await search.fill('A1A1');
    await expect(page.locator('[data-person]')).toHaveCount(1);
    await expect(row(page, ANA)).toBeVisible();
    await expect(page.locator('[data-people-count]')).toHaveText('1 miembro');
    await search.fill(short(TEO));
    await expect(page.locator('[data-person]')).toHaveCount(1);
    await expect(row(page, TEO)).toBeVisible();
    await search.fill('ana r');
    await expect(page.locator('[data-person]')).toHaveCount(1);
    await expect(row(page, ANA)).toBeVisible();
    await search.fill('TEO');
    await expect(page.locator('[data-person]')).toHaveCount(1);
    await expect(row(page, TEO)).toBeVisible();
    await search.fill('0xffff');
    await expect(page.locator('[data-person]')).toHaveCount(0);
    await expect(page.locator('[data-people-none]')).toContainText('0xffff');
    await search.fill('');
    await expect(page.locator('[data-person]')).toHaveCount(3);
  });

  test('«Añadir miembro» checks the wallet first, then adds it as a member and shows it', async ({
    page,
  }) => {
    const { organization } = await signedIn(page);
    await members(page);
    await page.locator('[data-metric="panel-member-add"]').click();
    const input = page.getByLabel('Cartera de la persona (0x…)');
    await input.fill('0x123');
    await page.locator('[data-metric="panel-member-add-save"]').click();
    await expect(page.locator('[data-people-add] [role="alert"]')).toContainText(
      '0x y 40 caracteres',
    );
    expect(organization.posted).toEqual([]);

    await input.fill(` ${NEW.toUpperCase().replace('0X', '0x')} `);
    await page.locator('[data-metric="panel-member-add-save"]').click();
    await expect(row(page, NEW)).toBeVisible();
    expect(organization.posted).toEqual([
      { action: 'set-member', accountId: GAMES.id, wallet: NEW, role: 'member' },
    ]);
    await expect(row(page, NEW).locator('[data-rank]')).toHaveText('Nómada');
    await expect(page.locator('[data-people-count]')).toHaveText('4 miembros');
  });

  test('«Quitar de la organización» asks first, then takes the person out', async ({ page }) => {
    const { organization } = await signedIn(page);
    await members(page);
    await row(page, TEO).locator('[data-metric="panel-member-menu"]').click();
    await page.locator('[data-metric="panel-member-remove"]').click();
    const confirm = page.locator('[data-metric="panel-member-remove-confirm"]');
    await expect(page.locator('[data-person-confirm]')).toContainText(short(TEO));
    await confirm.click();
    await expect(row(page, TEO)).toHaveCount(0);
    expect(organization.posted).toEqual([
      { action: 'remove-member', accountId: GAMES.id, wallet: TEO },
    ]);
  });

  test('the owner’s menu never offers to take out the last owner, and copies a wallet whole', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await signedIn(page);
    await members(page);
    await row(page, ME).locator('[data-metric="panel-member-menu"]').click();
    await expect(page.locator('[data-metric="panel-member-remove"]')).toHaveCount(0);
    await page.locator('[data-metric="panel-member-copy"]').click();
    await expect(page.locator('[data-people-notices]')).toContainText('Cartera copiada');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ME);
  });

  test('«+» gives a role the person may give, and × takes it away', async ({ page }) => {
    const { organization } = await signedIn(page);
    await members(page);
    const teo = row(page, TEO);
    await expect(teo.locator('[data-role-chip]')).toHaveCount(0);
    await teo.locator('[data-metric="panel-member-role-more"]').click();
    await teo.getByRole('combobox').selectOption(FINANCE);
    await teo.locator('[data-metric="panel-member-role-give"]').click();
    await expect(teo.locator('[data-role-chip]')).toHaveText(['Finanzas']);
    await teo.locator('[data-metric="panel-member-role-take"]').click();
    await expect(teo.locator('[data-role-chip]')).toHaveCount(0);
    expect(organization.posted.map((body) => body['action'])).toEqual(['give-role', 'take-role']);
    expect(organization.posted[0]).toEqual({
      action: 'give-role',
      accountId: GAMES.id,
      wallet: TEO,
      roleId: FINANCE,
    });
  });

  test('giving «Administración» asks the wallet to sign: with none in this browser it says so and gives nothing', async ({
    page,
  }) => {
    const { organization } = await signedIn(page);
    let asked = 0;
    await page.route('**/api/saldo/signature?*', (route: Route) => {
      asked += 1;
      return route.fulfill({ json: { sign: { message: 'x', token: 'f1.a.b', expiresAt: 'x' } } });
    });
    await members(page);
    const teo = row(page, TEO);
    await teo.locator('[data-metric="panel-member-role-more"]').click();
    await teo.getByRole('combobox').selectOption(ADMIN);
    await teo.locator('[data-metric="panel-member-role-give"]').click();
    await expect(page.locator('[data-people-notices] [role="alert"]')).toContainText(
      'no recuerda tu cartera',
    );
    expect(asked).toBe(0);
    expect(organization.posted).toHaveLength(1);
    await expect(teo.locator('[data-role-chip]')).toHaveCount(0);
  });

  test('a member who may not invite, remove or give sees the people and no button to do it', async ({
    page,
  }) => {
    await signedIn(page, 'member');
    await members(page);
    await expect(page.locator('[data-metric="panel-member-add"]')).toHaveCount(0);
    await expect(page.locator('[data-metric="panel-member-role-more"]')).toHaveCount(0);
    await expect(page.locator('[data-metric="panel-member-role-take"]')).toHaveCount(0);
    // Their own menu lets them leave; another’s has nothing but the copy.
    await row(page, ME).locator('[data-metric="panel-member-menu"]').click();
    await expect(page.locator('[data-metric="panel-member-remove"]')).toHaveText(
      'Salir de la organización',
    );
    await row(page, TEO).locator('[data-metric="panel-member-menu"]').click();
    await expect(page.locator(`[data-person-detail="${TEO}"]`)).toBeVisible();
    await expect(page.locator(`[data-person-detail="${ME}"]`)).toHaveCount(0);
    await expect(page.locator('[data-metric="panel-member-remove"]')).toHaveCount(0);
    await expect(page.locator('[data-metric="panel-member-copy"]')).toHaveCount(1);
  });

  test('the house enters with its strip, and the log is behind its toggle', async ({ page }) => {
    await signedIn(page, 'house');
    await members(page);
    await expect(page.locator('[data-panel-house]')).toContainText('Entras como la casa');
    await expect(row(page, ME)).toHaveCount(0);
    const toggle = page.locator('[data-metric="panel-log-toggle"]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.locator('[data-panel-log] li')).toContainText('Rol dado');
  });
});

test.describe('Roles', () => {
  test('the owners apart, the roles from the top down with how many hold each, the base last', async ({
    page,
  }) => {
    await signedIn(page);
    await roles(page);
    await expect(page.locator('h1')).toHaveText('Roles');
    const owners = page.locator('[data-roles-owners]');
    await expect(owners).toContainText('Titulares');
    await expect(owners).toContainText('No es un rol: lo pueden todo.');
    await expect(owners).toContainText(short(ME));
    const list = page.locator('[data-roles-list] [data-role]');
    await expect(list.locator('[data-role-name]')).toHaveText([
      'Administración',
      'Finanzas',
      '@todos',
    ]);
    await expect(list.locator('[data-role-count]')).toHaveText(['0', '1', '3']);
    await expect(list.first().locator('button[data-metric="panel-role-select"]')).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.locator('[data-roles-rule]')).toHaveText(
      'Nadie toca un rol de su altura o por encima, ni da un permiso que no tiene.',
    );
  });

  test('↑ and ↓ move the role chosen, one place at a time', async ({ page }) => {
    const { organization } = await signedIn(page);
    await roles(page);
    await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
    await expect(
      page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-down"]`),
    ).toHaveCount(0);
    await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-up"]`).click();
    await expect(page.locator('[data-roles-list] [data-role-name]')).toHaveText([
      'Finanzas',
      'Administración',
      '@todos',
    ]);
    expect(organization.posted).toEqual([
      { action: 'move-role', accountId: GAMES.id, roleId: FINANCE, position: 2 },
    ]);
  });

  test('«Crear rol» makes one with a fresh name and opens it on its look', async ({ page }) => {
    const { organization } = await signedIn(page);
    await roles(page);
    await page.locator('[data-metric="panel-role-create"]').click();
    await expect(page.locator('[data-role-sheet] h2')).toHaveText('Rol nuevo');
    await expect(page.locator('[data-metric="panel-role-tab-look"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(organization.posted).toEqual([
      {
        action: 'create-role',
        accountId: GAMES.id,
        role: { name: 'Rol nuevo', color: null, hoist: false, permissions: [] },
      },
    ]);
  });

  test('Aspecto: the name, the colour, shown apart — saved together; and the role can be deleted', async ({
    page,
  }) => {
    const { organization } = await signedIn(page);
    await roles(page);
    await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
    await page.locator('[data-metric="panel-role-tab-look"]').click();
    await page.getByLabel('Nombre').fill('Tesorería');
    await page.getByRole('radio', { name: 'Verde' }).check();
    const apart = page.getByRole('switch', { name: 'Mostrar aparte en la lista de gente' });
    await expect(apart).toHaveAttribute('aria-checked', 'false');
    await apart.click();
    await expect(apart).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-role-look]')).toContainText(
      'Un rol sin permisos es solo un nombre y un color',
    );
    await page.locator('[data-metric="panel-role-save"]').click();
    await expect(page.locator('[data-role-sheet] h2')).toHaveText('Tesorería');
    expect(organization.posted[0]).toEqual({
      action: 'edit-role',
      accountId: GAMES.id,
      roleId: FINANCE,
      change: { name: 'Tesorería', color: '#3d8b5f', hoist: true },
    });

    await page.locator('[data-metric="panel-role-delete"]').click();
    await expect(page.locator('[data-role-confirm]')).toContainText('Tesorería');
    await page.locator('[data-metric="panel-role-delete-confirm"]').click();
    await expect(page.locator('[data-roles-list] [data-role-name]')).toHaveText([
      'Administración',
      '@todos',
    ]);
    expect(organization.posted[1]).toEqual({
      action: 'delete-role',
      accountId: GAMES.id,
      roleId: FINANCE,
    });
  });

  test('the base role keeps its name and its place, and only what it carries changes', async ({
    page,
  }) => {
    await signedIn(page);
    await roles(page);
    await page.locator(`[data-role="${BASE}"] [data-metric="panel-role-select"]`).click();
    await page.locator('[data-metric="panel-role-tab-look"]').click();
    await expect(page.locator('[data-metric="panel-role-delete"]')).toHaveCount(0);
    await expect(page.locator('[data-metric="panel-role-name"]')).toHaveCount(0);
    await expect(page.locator('[data-role-look]')).toContainText(
      'lo que tiene cualquiera que entra',
    );
    await page.locator('[data-metric="panel-role-tab-permissions"]').click();
    await expect(page.getByRole('switch', { name: 'Recargar saldo' })).toBeEnabled();
  });

  test('Permisos: seventeen switches in five groups, then what only the owners do', async ({
    page,
  }) => {
    await signedIn(page);
    await roles(page);
    await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
    await page.locator('[data-metric="panel-role-tab-permissions"]').click();
    const sheet = page.locator('[data-role-permissions]');
    await expect(sheet.locator('h3')).toHaveText([
      'La organización',
      'Gente',
      'Encuentros',
      'Sedes',
      'Dinero',
      'Solo titulares · no se puede dar',
    ]);
    const switches = sheet.getByRole('switch');
    await expect(switches).toHaveCount(17);
    for (const name of ['Ver saldo y facturas', 'Recargar saldo', 'Datos de facturación']) {
      await expect(sheet.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'true');
    }
    await expect(sheet.getByRole('switch', { name: 'Construir' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    // «encuentro», never «ritual», on screen.
    await expect(sheet).toContainText('Publicar encuentros');
    await expect(sheet).not.toContainText('ritual');
    await expect(sheet.locator('[data-permission-row="administrator"]')).toHaveClass(/peligro/);
    await expect(sheet.locator('[data-owner-acts] li')).toHaveCount(7);
    for (const element of await switches.all()) {
      await expect(element).toHaveAttribute('data-metric', 'panel-role-permission');
    }
  });

  test('with «Administrador» on, every other permission shows on and given by it', async ({
    page,
  }) => {
    await signedIn(page);
    await roles(page);
    await page.locator('[data-metric="panel-role-tab-permissions"]').click();
    const sheet = page.locator('[data-role-permissions]');
    const build = sheet.getByRole('switch', { name: 'Construir' });
    await expect(build).toHaveAttribute('aria-checked', 'true');
    await expect(build).toBeDisabled();
    await expect(sheet.locator('[data-permission-row="build-in-worlds"]')).toContainText(
      'Lo da Administrador',
    );
    await expect(sheet.getByRole('switch', { name: 'Administrador' })).toBeEnabled();
  });

  test('saving a permission is one edit of the role; giving «Administrador» asks the wallet first', async ({
    page,
  }) => {
    const { organization } = await signedIn(page);
    await roles(page);
    await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
    await page.locator('[data-metric="panel-role-tab-permissions"]').click();
    const sheet = page.locator('[data-role-permissions]');
    await sheet.getByRole('switch', { name: 'Construir' }).click();
    await page.locator('[data-metric="panel-role-permissions-save"]').click();
    await expect(page.locator('[data-metric="panel-role-permissions-save"]')).toHaveCount(0);
    expect(organization.posted[0]).toEqual({
      action: 'edit-role',
      accountId: GAMES.id,
      roleId: FINANCE,
      change: { permissions: ['build-in-worlds', 'view-balance', 'top-up', 'manage-balance'] },
    });

    await sheet.getByRole('switch', { name: 'Administrador' }).click();
    await page.locator('[data-metric="panel-role-permissions-save"]').click();
    await expect(page.locator('[data-people-notices] [role="alert"]')).toContainText(
      'no recuerda tu cartera',
    );
    expect(organization.posted).toHaveLength(2);
    await page.locator('[data-metric="panel-role-permissions-reset"]').click();
    await expect(sheet.getByRole('switch', { name: 'Administrador' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('Miembros · N: who holds the role, × to take it, and «Añadir» to give it', async ({
    page,
  }) => {
    const { organization } = await signedIn(page);
    await roles(page);
    await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
    const tab = page.locator('[data-metric="panel-role-tab-members"]');
    await expect(tab).toHaveText('Miembros · 1');
    await tab.click();
    const holders = page.locator('[data-role-holders]');
    await expect(holders.locator('[data-holder]')).toHaveCount(1);
    await expect(holders.locator(`[data-holder="${ANA}"]`)).toContainText(short(ANA));
    // The name and the face the person chose, as in the table.
    await expect(holders.locator(`[data-holder="${ANA}"] [data-person-name]`)).toHaveText(
      'Ana Ruiz',
    );
    await expect(holders.locator(`[data-holder="${ANA}"] img[data-person-face]`)).toHaveAttribute(
      'src',
      ANA_FACE,
    );
    await expect(holders.getByRole('combobox').locator('option')).toHaveText([
      `Teo · ${short(TEO)}`,
    ]);
    await holders.getByRole('combobox').selectOption(TEO);
    await page.locator('[data-metric="panel-role-holder-give"]').click();
    await expect(holders.locator('[data-holder]')).toHaveCount(2);
    await expect(tab).toHaveText('Miembros · 2');
    await holders.locator(`[data-holder="${ANA}"] [data-metric="panel-role-holder-take"]`).click();
    await expect(holders.locator('[data-holder]')).toHaveCount(1);
    expect(organization.posted.map((body) => [body['action'], body['wallet']])).toEqual([
      ['give-role', TEO],
      ['take-role', ANA],
    ]);
  });

  test('without «Gestionar roles» the same screen is read-only, and says who can', async ({
    page,
  }) => {
    await signedIn(page, 'member');
    await roles(page);
    await expect(page.locator('[data-roles-readonly]')).toContainText('«Gestionar roles»');
    await expect(page.locator('[data-roles-readonly]')).toContainText('Administración');
    await expect(page.locator('[data-metric="panel-role-create"]')).toHaveCount(0);
    await expect(
      page.locator('[data-metric="panel-role-up"], [data-metric="panel-role-down"]'),
    ).toHaveCount(0);
    await page.locator('[data-metric="panel-role-tab-permissions"]').click();
    for (const element of await page.locator('[data-role-permissions]').getByRole('switch').all()) {
      await expect(element).toBeDisabled();
    }
    await page.locator('[data-metric="panel-role-tab-look"]').click();
    await expect(page.getByLabel('Nombre')).toBeDisabled();
    await expect(
      page.locator('[data-metric="panel-role-save"], [data-metric="panel-role-delete"]'),
    ).toHaveCount(0);
  });

  test('the house enters the roles with its strip', async ({ page }) => {
    await signedIn(page, 'house');
    await roles(page);
    await expect(page.locator('[data-panel-house]')).toContainText('Entras como la casa');
    await expect(page.locator('[data-roles-owners]')).toContainText(short(OWNER));
  });

  test('in English the screen speaks English', async ({ page }) => {
    await signedIn(page);
    await open(page, `/panel/roles/?org=${GAMES.id}`);
    await expect(page.locator('h1')).toHaveText('Roles');
    await expect(page.locator('[data-metric="panel-role-tab-look"]')).toHaveText('Look');
    await expect(page.locator('[data-metric="panel-role-tab-permissions"]')).toHaveText(
      'Permissions',
    );
    await expect(page.locator('[data-roles-owners]')).toContainText('Owners');
  });
});

test.describe('the old door', () => {
  test('Saldo’s «Miembros y roles» tab leads to the panel, and its old address follows', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/es/saldo/');
    const tab = page.locator('.saldo-pestanas a').nth(1);
    await expect(tab).toHaveAttribute('href', '/es/panel/miembros/');
    await page.goto('/es/saldo/miembros/');
    await expect(page).toHaveURL(/\/es\/panel\/miembros\/$/);
    const stub = await (await page.request.get('/es/saldo/miembros/')).text();
    expect(stub).toMatch(/http-equiv="refresh" content="0;url=\/es\/panel\/miembros\/"/);
    expect(stub).toMatch(/<a href="\/es\/panel\/miembros\/"/);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ['/es/panel/miembros/', '/es/panel/roles/']) {
    test(`${path} has no sideways scroll`, async ({ page }) => {
      await signedIn(page);
      await open(page, `${path}?org=${GAMES.id}`);
      await page.waitForLoadState('networkidle');
      const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        window: window.innerWidth,
      }));
      expect(widths.page, `${path} is ${widths.page}px wide`).toBeLessThanOrEqual(widths.window);
    });
  }

  test('the table of people scrolls inside its own region', async ({ page }) => {
    await signedIn(page);
    await members(page);
    const region = page.getByRole('region', { name: 'Miembros', exact: true });
    await expect(region).toHaveAttribute('tabindex', '0');
    const scroll = await region.evaluate((element) => ({
      inner: element.scrollWidth,
      outer: element.clientWidth,
    }));
    expect(scroll.inner).toBeGreaterThan(scroll.outer);
  });
});

for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`axe, ${colorScheme}`, () => {
    const screens: Array<[string, (page: Page) => Promise<void>]> = [
      [
        'Miembros, a menu open',
        async (page) => {
          await members(page);
          await row(page, TEO).locator('[data-metric="panel-member-menu"]').click();
        },
      ],
      [
        'Roles, its permissions',
        async (page) => {
          await roles(page);
          await page.locator('[data-metric="panel-role-tab-permissions"]').click();
        },
      ],
      [
        'Roles, its look',
        async (page) => {
          await roles(page);
          await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
          await page.locator('[data-metric="panel-role-tab-look"]').click();
        },
      ],
    ];
    for (const [name, reach] of screens) {
      test(`${name} passes WCAG A/AA`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await signedIn(page);
        await reach(page);
        await page.waitForLoadState('networkidle');
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
