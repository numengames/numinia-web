/**
 * «Agentes» (IAs de organización), the panel's piece for a community's AIs, in
 * a real browser against the built site. As in panel-gente-lista.spec.ts the
 * e2e server has no auth secrets, so the session and the till's answers are
 * played by the browser (`page.route`); here the agents route is a small
 * stateful stand-in that answers the whole list after every write, shaped as
 * /api/saldo/agents sends it (lib/agents-source.ts), so what is under test
 * is what the screen does with it: the empty state, the rows (name, role
 * chips, the Encendida/Apagada switch, Activa/Dormida, the status line, who
 * answers), the switch, the state, giving and taking roles, removing with a
 * confirmation, the three-step invitation, every failure told in a sentence,
 * the five locales, the phone and axe.
 *
 * With SHOTS_DIR set, every state is also saved as a screenshot there.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ME = '0x42e6000000000000000000000000000000ca26';
const LUCIA = `0x${'a1'.repeat(20)}`;
const KEY_A = `ed25519:${'A'.repeat(43)}`;
const KEY_B = `ed25519:${'B'.repeat(43)}`;
const KEY_C = `ed25519:${'C'.repeat(43)}`;
const KEY_NEW = `ed25519:${'N'.repeat(43)}`;

const GAMES = {
  id: 'acc_t_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'admin',
  balanceCents: 0,
};

const ROLES = [
  { id: 'role_team', name: 'Equipo', color: '#3d8b5f', position: 3 },
  { id: 'role_money', name: 'Finanzas', color: '#c0392b', position: 2 },
  { id: 'role_guest', name: 'Visitas', color: null, position: 1 },
];

const ROLES_VIEW = {
  ok: true,
  accountId: GAMES.id,
  as: 'owner',
  roles: [
    ...ROLES.map((role) => ({
      ...role,
      hoist: false,
      permissions: [],
      members: 1,
      mayEdit: false,
    })),
    {
      id: 'role_base',
      name: '@todos',
      color: null,
      position: 0,
      hoist: false,
      permissions: [],
      members: 5,
      mayEdit: false,
    },
  ],
  members: [{ wallet: ME, owner: true, addedAt: '2026-06-03T09:00:00.000Z', roleIds: [] }],
};

const TOKEN = `ntk_${'Zy9_'.repeat(10)}abc`;
const TOKEN_NEW = `ntk_${'Qw3-'.repeat(10)}xyz`;

interface Agent {
  id: string;
  name: string;
  auth: 'key' | 'token';
  publicKey?: string;
  tokenPrefix?: string;
  tokenCreatedAt?: string;
  enabled: boolean;
  state: 'activa' | 'dormida';
  status: 'apagada' | 'sin-responsable' | 'sin-permiso' | 'activa' | 'dormida';
  responsible: string;
  responsibleName?: string;
  createdAt: string;
  updatedAt: string;
  roleIds: string[];
  assignable: string[];
  mayEdit: boolean;
  /** Where it lives (the till's, S20): all the community's worlds or the chosen ones. */
  worlds?: { todos: true } | { mundos: string[] };
}

/** The community's worlds, as /api/mundos?org= lists them. */
const WORLDS = ['agora-plaza', 'mi-rincon', 'taller-de-pruebas'];

const agent = (
  extra: Partial<Agent> & Pick<Agent, 'id' | 'name'> & { publicKey?: string },
): Agent => ({
  auth: 'key',
  enabled: true,
  state: 'activa',
  status: 'activa',
  responsible: ME,
  responsibleName: 'Pablo',
  createdAt: '2026-10-17T09:00:00.000Z',
  updatedAt: '2026-10-17T09:00:00.000Z',
  roleIds: [],
  assignable: ROLES.map((role) => role.id),
  mayEdit: true,
  worlds: { todos: true },
  ...extra,
});

const roster = (): Agent[] => [
  agent({ id: 'hermes', name: 'Hermes', publicKey: KEY_A, roleIds: ['role_team', 'role_money'] }),
  agent({
    id: 'luna',
    name: 'Luna',
    publicKey: KEY_B,
    state: 'dormida',
    status: 'dormida',
    roleIds: [],
  }),
  agent({
    id: 'huerfana',
    name: 'Huérfana',
    publicKey: KEY_C,
    status: 'sin-responsable',
    responsible: LUCIA,
    responsibleName: undefined as unknown as string,
    mayEdit: false,
    assignable: [],
    roleIds: ['role_guest'],
  }),
];

interface Stand {
  agents: Agent[];
  mayCreate: boolean;
  /** What the route answers instead of the list, for every call (a status and a body). */
  down: { status: number; body: unknown } | null;
  /** The next write is refused with this answer. */
  refuseWrite: { status: number; body: unknown } | null;
  calls: Array<{ method: string; body: unknown }>;
  /** What /api/mundos?org= answers: the community's worlds, or a status for a failure. */
  worlds: string[] | number;
}

function viewOf(stand: Stand) {
  return {
    ok: true,
    accountId: GAMES.id,
    as: 'owner',
    mayCreate: stand.mayCreate,
    assignableRoles: ROLES,
    agents: stand.agents.map((entry) => {
      const { responsibleName, ...rest } = entry;
      return responsibleName === undefined ? rest : { ...rest, responsibleName };
    }),
  };
}

function statusOf(entry: Agent): Agent['status'] {
  return entry.enabled ? entry.state : 'apagada';
}

async function stage(
  page: Page,
  options: { agents?: Agent[]; mayCreate?: boolean; off?: string[] } = {},
): Promise<Stand> {
  const stand: Stand = {
    agents: options.agents ?? roster(),
    mayCreate: options.mayCreate ?? true,
    down: null,
    refuseWrite: null,
    calls: [],
    worlds: WORLDS,
  };
  await page.route('**/api/mundos?org=*', (route) =>
    typeof stand.worlds === 'number'
      ? route.fulfill({ status: stand.worlds, json: {} })
      : route.fulfill({
          json: { worlds: stand.worlds.map((worldId) => ({ worldId, accountId: GAMES.id })) },
        }),
  );
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: ME, rank: 'oracle' } }),
  );
  await page.route('**/api/saldo', (route) => route.fulfill({ json: { accounts: [GAMES] } }));
  await page.route('**/api/saldo/roles?*', (route) =>
    route.fulfill({ json: { roles: ROLES_VIEW, you: ME } }),
  );
  await page.route('**/api/saldo/ranks?*', (route) =>
    route.fulfill({ json: { ok: true, ranks: {} } }),
  );
  await page.route('**/api/saldo/settings?*', (route) =>
    route.fulfill({
      json: {
        settings: {
          ok: true,
          accountId: GAMES.id,
          off: options.off ?? [],
          vocabulary: 'mixed',
          mayEdit: true,
          aiAgent: { enabled: true, model: 'gpt-5-nano', trialCapCents: 150, spentCents: 0 },
        },
      },
    }),
  );
  await page.route(/\/api\/saldo\/agents(\?|$)/, async (route) => {
    const request = route.request();
    const method = request.method();
    const body: unknown = method === 'GET' || method === 'DELETE' ? null : request.postDataJSON();
    stand.calls.push({ method, body });
    if (stand.down !== null) {
      return route.fulfill({ status: stand.down.status, json: stand.down.body });
    }
    if (method !== 'GET' && stand.refuseWrite !== null) {
      const refusal = stand.refuseWrite;
      stand.refuseWrite = null;
      return route.fulfill({ status: refusal.status, json: refusal.body });
    }
    if (method === 'POST') {
      const draft = body as {
        id: string;
        name: string;
        auth?: 'token';
        publicKey?: string;
        roleIds?: string[];
      };
      const viaToken = draft.auth === 'token';
      stand.agents.push(
        agent({
          id: draft.id,
          name: draft.name,
          roleIds: draft.roleIds ?? [],
          ...(viaToken
            ? {
                auth: 'token' as const,
                tokenPrefix: TOKEN.slice(4, 12),
                tokenCreatedAt: '2026-10-17T10:00:00.000Z',
              }
            : { publicKey: draft.publicKey as string }),
        }),
      );
      if (viaToken) {
        return route.fulfill({ json: { agents: viewOf(stand), token: TOKEN } });
      }
    } else if (method === 'PATCH') {
      const change = body as {
        id: string;
        enabled?: boolean;
        state?: 'activa' | 'dormida';
        giveRole?: string;
        takeRole?: string;
        renewToken?: true;
        worlds?: Agent['worlds'];
      };
      const entry = stand.agents.find((candidate) => candidate.id === change.id);
      if (entry !== undefined) {
        if (change.enabled !== undefined) entry.enabled = change.enabled;
        if (change.state !== undefined) entry.state = change.state;
        if (change.worlds !== undefined) entry.worlds = change.worlds;
        if (change.giveRole !== undefined) entry.roleIds.push(change.giveRole);
        if (change.takeRole !== undefined) {
          entry.roleIds = entry.roleIds.filter((id) => id !== change.takeRole);
        }
        entry.status = statusOf(entry);
        if (change.renewToken === true && entry.auth === 'token') {
          entry.tokenPrefix = TOKEN_NEW.slice(4, 12);
          entry.tokenCreatedAt = '2026-10-17T11:00:00.000Z';
          return route.fulfill({ json: { agents: viewOf(stand), token: TOKEN_NEW } });
        }
      }
    } else if (method === 'DELETE') {
      const id = new URL(request.url()).searchParams.get('agente');
      stand.agents = stand.agents.filter((candidate) => candidate.id !== id);
    }
    return route.fulfill({ json: { agents: viewOf(stand) } });
  });
  return stand;
}

async function open(page: Page, path = '/es/panel/agentes/'): Promise<void> {
  await page.goto(`${path}?org=${GAMES.id}`);
  await expect(page.locator('[data-org-panel]')).toHaveAttribute('data-state', 'ready');
}

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env['SHOTS_DIR'];
  if (dir === undefined || dir === '') return;
  // A modal dialog is drawn over the viewport: take the viewport, not the whole page.
  const modal = (await page.locator('dialog[open]').count()) > 0;
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: !modal });
}

const row = (page: Page, id: string) => page.locator(`[data-agent="${id}"]`);

/** «Conectar una IA» → «Pedir un código» → «Crear código»: the invitation dialog. */
async function openInvite(page: Page): Promise<void> {
  await page.locator('[data-metric="panel-agentes-connect"]').click();
  await page.locator('[data-agentes-way-go="code"]').click();
  await page.locator('[data-agentes-advanced]').click();
  await expect(page.locator('dialog[open][data-agentes-dialog]')).toBeVisible();
}

/** An action of the card's ⋯ menu: open the menu, choose it. */
async function menuAction(card: Locator, action: 'disconnect' | 'renew' | 'remove'): Promise<void> {
  await card.locator('[data-metric="panel-agentes-menu"]').click();
  await card.locator(`[data-agent-action="${action}"]`).click();
}
const list = (page: Page) => page.locator('[data-agentes-list]');
const NOTICE = 'Los cambios llegan a los mundos en unos 10 minutos como máximo.';

test.describe('Agentes — the list', () => {
  test('is a piece of the rail, kept by the organization, with its title and the notice', async ({
    page,
  }) => {
    await stage(page);
    await open(page, '/es/panel/');
    const link = page.locator('[data-org-rail] a[data-metric="panel-nav-agents"]');
    await expect(link).toHaveText('Agentes');
    await expect(link).toHaveAttribute('href', `/es/panel/agentes/?org=${GAMES.id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/es/panel/agentes/\\?org=${GAMES.id}$`));
    await expect(page.locator('h1')).toHaveText('Agentes');
    await expect(page.locator('[data-agentes-notice]')).toHaveText(NOTICE);
    await expect(list(page)).toBeVisible();
  });

  test('says there is none yet, and the notice is still there', async ({ page }) => {
    await stage(page, { agents: [] });
    await open(page);
    await expect(page.locator('[data-agentes-none]')).toContainText(
      'Todavía no hay ninguna IA en tu comunidad',
    );
    await expect(page.locator('[data-agentes-notice]')).toHaveText(NOTICE);
    await expect(page.locator('[data-metric="panel-agentes-connect"]')).toBeEnabled();
    await shot(page, '01-empty-desktop');
  });

  test('draws a row per AI: name, role chips, switch, state, status line and who answers', async ({
    page,
  }) => {
    await stage(page);
    await open(page);
    await expect(page.locator('[data-agent]')).toHaveCount(3);

    const hermes = row(page, 'hermes');
    await expect(hermes.locator('.agentes-nombre')).toHaveText('Hermes');
    await expect(hermes.locator('[data-agent-role]')).toHaveText(['Equipo×', 'Finanzas×']);
    const toggle = hermes.locator('[data-metric="panel-agentes-switch"]');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(toggle).toHaveAccessibleName('Hermes Encendida');
    await expect(toggle).toHaveAttribute('data-metric', 'panel-agentes-switch');
    await expect(hermes.locator('[data-agent-status-line]')).toContainText('Puede entrar');
    await expect(hermes.locator('[data-agent-responsible]')).toHaveText('Responde por ella: Pablo');
    await expect(hermes.getByRole('radio', { name: /Activa/ })).toBeChecked();
    await expect(hermes.locator('[data-agent-state-hint]')).toHaveText(
      'Atenta y dispuesta a interactuar.',
    );
    await expect(hermes.locator('[data-agent-dot]')).toBeVisible();
    await expect(hermes.locator('[data-agent-moon]')).toBeVisible();
    await expect(hermes.locator('[data-agent-state-option="dormida"]')).toContainText('Dormida');
    await expect(row(page, 'luna').locator('[data-agent-state-hint]')).toHaveText(
      'Mira y escucha; solo habla si la llaman y no construye.',
    );

    const luna = row(page, 'luna');
    await expect(luna.getByRole('radio', { name: /Dormida/ })).toBeChecked();
    await expect(luna.locator('[data-agent-no-roles]')).toHaveText('Sin roles: solo mira y habla.');

    // An AI nobody answers for: told in plain words, shown with the short wallet, read only.
    const orphan = row(page, 'huerfana');
    await expect(orphan.locator('[data-agent-status-line]')).toContainText(
      'quien respondía por ella dejó la comunidad',
    );
    await expect(orphan.locator('[data-agent-responsible]')).toHaveText(
      'Responde por ella: 0xa1a1…a1a1',
    );
    await expect(orphan.locator('[data-agent-read-only]')).toBeVisible();
    await expect(orphan.locator('[data-metric="panel-agentes-switch"]')).toBeDisabled();
    await expect(orphan.getByRole('radio').first()).toBeDisabled();
    await expect(orphan.locator('[data-metric="panel-agentes-menu"]')).toHaveCount(0);
    await expect(orphan.locator('[data-metric="panel-agentes-role-take"]')).toHaveCount(0);
    await shot(page, '02-list-desktop');
  });

  test('«sin permiso» is told in its own words', async ({ page }) => {
    await stage(page, {
      agents: [
        agent({ id: 'sola', name: 'Sola', publicKey: KEY_A, status: 'sin-permiso', roleIds: [] }),
      ],
    });
    await open(page);
    await expect(row(page, 'sola').locator('[data-agent-status-line]')).toContainText(
      'Sin permiso',
    );
  });
});

test.describe('Agentes — «En el mundo»: where it lives (S20)', () => {
  const where = (card: Locator) => card.locator('[data-agent-where]');

  test('says, always, that the settings reach the worlds once their engine is updated', async ({
    page,
  }) => {
    await stage(page);
    await open(page);
    const hermes = row(page, 'hermes');
    await expect(hermes.locator('[data-agent-world-section] h2')).toHaveText('En el mundo');
    await expect(hermes.locator('[data-agent-world-note]')).toContainText(
      'llegan a los mundos cuando se actualiza su motor',
    );
  });

  test('lives in all the community’s worlds by default, and says so', async ({ page }) => {
    await stage(page);
    await open(page);
    const hermes = row(page, 'hermes');
    await expect(where(hermes)).toHaveAttribute('data-agent-where', 'all');
    await expect(hermes.getByRole('radio', { name: 'Todos los de la comunidad' })).toBeChecked();
    await expect(hermes.locator('[data-agent-where-hint]')).toContainText(
      'también en los que lleguen',
    );
    await shot(page, '20-donde-vive-todos-desktop');
  });

  test('picks one world, then several, then all again; each pick is one PATCH', async ({
    page,
  }) => {
    const stand = await stage(page);
    await open(page);
    const hermes = row(page, 'hermes');
    await hermes.getByRole('radio', { name: 'Un mundo' }).click();
    await expect(where(hermes)).toHaveAttribute('data-agent-where', 'one');
    expect(stand.calls.at(-1)?.body).toEqual({
      accountId: GAMES.id,
      id: 'hermes',
      worlds: { mundos: ['agora-plaza'] },
    });
    const pick = hermes.getByLabel('Mundo donde vive Hermes');
    await expect(pick).toHaveValue('agora-plaza');
    await pick.selectOption('mi-rincon');
    expect(stand.calls.at(-1)?.body).toMatchObject({ worlds: { mundos: ['mi-rincon'] } });
    await shot(page, '21-donde-vive-uno-desktop');

    await hermes.getByRole('radio', { name: 'Varios' }).click();
    await expect(where(hermes)).toHaveAttribute('data-agent-where', 'several');
    const list = hermes.getByRole('list', { name: 'Mundos donde vive Hermes' });
    await expect(list.getByRole('checkbox')).toHaveCount(3);
    await expect(list.getByRole('checkbox', { name: 'mi-rincon' })).toBeChecked();
    await list.getByRole('checkbox', { name: 'taller-de-pruebas' }).click();
    await expect(list.getByRole('checkbox', { name: 'taller-de-pruebas' })).toBeChecked();
    expect(stand.calls.at(-1)?.body).toMatchObject({
      worlds: { mundos: ['mi-rincon', 'taller-de-pruebas'] },
    });
    await shot(page, '22-donde-vive-varios-desktop');
    await list.getByRole('checkbox', { name: 'mi-rincon' }).click();
    await expect(list.getByRole('checkbox', { name: 'mi-rincon' })).not.toBeChecked();
    expect(stand.calls.at(-1)?.body).toMatchObject({
      worlds: { mundos: ['taller-de-pruebas'] },
    });
    // It has to live somewhere: the last one cannot be unticked.
    await expect(list.getByRole('checkbox', { name: 'taller-de-pruebas' })).toBeDisabled();

    await hermes.getByRole('radio', { name: 'Todos los de la comunidad' }).click();
    expect(stand.calls.at(-1)?.body).toMatchObject({ worlds: { todos: true } });
    await expect(where(hermes)).toHaveAttribute('data-agent-where', 'all');
  });

  test('draws what the till says: chosen worlds come back ticked after a reload', async ({
    page,
  }) => {
    await stage(page, {
      agents: [
        agent({
          id: 'hermes',
          name: 'Hermes',
          publicKey: KEY_A,
          worlds: { mundos: ['mi-rincon'] },
        }),
        agent({
          id: 'luna',
          name: 'Luna',
          publicKey: KEY_B,
          worlds: { mundos: ['mi-rincon', 'agora-plaza'] },
        }),
      ],
    });
    await open(page);
    await expect(where(row(page, 'hermes'))).toHaveAttribute('data-agent-where', 'one');
    await expect(row(page, 'hermes').getByLabel('Mundo donde vive Hermes')).toHaveValue(
      'mi-rincon',
    );
    await expect(where(row(page, 'luna'))).toHaveAttribute('data-agent-where', 'several');
  });

  test('is read-only for whoever may not edit the AI', async ({ page }) => {
    await stage(page);
    await open(page);
    const huerfana = row(page, 'huerfana');
    await expect(where(huerfana)).toHaveAttribute('disabled', '');
    await expect(huerfana.getByRole('radio', { name: 'Un mundo' })).toBeDisabled();
    await expect(huerfana.getByRole('radio', { name: 'Todos los de la comunidad' })).toBeChecked();
  });

  test('a community with no worlds says so; one whose worlds cannot be read says that', async ({
    page,
  }) => {
    const stand = await stage(page);
    stand.worlds = [];
    await open(page);
    const hermes = row(page, 'hermes');
    await expect(hermes.locator('[data-agent-where-hint]')).toContainText('aún no tiene mundos');
    await expect(hermes.getByRole('radio', { name: 'Un mundo' })).toBeDisabled();
    await expect(hermes.getByRole('radio', { name: 'Varios' })).toBeDisabled();
    stand.worlds = 500;
    await open(page);
    await expect(row(page, 'hermes').locator('[data-agent-where-hint]')).toContainText(
      'No se han podido leer los mundos',
    );
  });

  test('tells it when the till says that world is no longer the community’s', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    stand.refuseWrite = {
      status: 403,
      body: { problems: ['every world must be placed in the AI’s organization'] },
    };
    await row(page, 'hermes').getByRole('radio', { name: 'Un mundo' }).click();
    await expect(page.locator('[role="alert"]')).toContainText('ya no es de la comunidad');
  });

  for (const [label, size] of [
    ['1440', { width: 1440, height: 900 }],
    ['390', { width: 390, height: 844 }],
  ] as const) {
    test(`fits at ${label} with the worlds listed, no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(size);
      await stage(page, {
        agents: [
          agent({
            id: 'hermes',
            name: 'Hermes',
            publicKey: KEY_A,
            worlds: { mundos: ['agora-plaza', 'taller-de-pruebas'] },
          }),
        ],
      });
      await open(page);
      const hermes = row(page, 'hermes');
      await hermes.getByRole('radio', { name: 'Varios' }).click();
      await expect(hermes.locator('[data-agent-where-list]')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(axe.violations).toEqual([]);
      await shot(page, `20-donde-vive-${label}`);
    });
  }

  test('the section is the same in the five locales, with its own words', async ({ page }) => {
    await stage(page);
    const titles: Record<string, string> = {
      es: 'En el mundo',
      en: 'In the world',
      ja: 'ワールドでの設定',
      ko: '월드에서',
      'pt-br': 'No mundo',
    };
    for (const [locale, title] of Object.entries(titles)) {
      await open(page, locale === 'en' ? '/panel/agentes/' : `/${locale}/panel/agentes/`);
      await expect(row(page, 'hermes').locator('[data-agent-world-section] h2')).toHaveText(title);
      await expect(row(page, 'hermes').locator('[data-agent-where-option]')).toHaveCount(3);
    }
  });
});

test.describe('Agentes — changing one', () => {
  test('the switch turns an AI off and on, and the line follows', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    const hermes = row(page, 'hermes');
    await hermes.locator('[data-metric="panel-agentes-switch"]').click();
    await expect(hermes.locator('[data-metric="panel-agentes-switch"]')).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(hermes.locator('[data-agent-onoff]')).toHaveText('Apagada');
    await expect(hermes.locator('[data-metric="panel-agentes-switch"]')).toHaveAccessibleName(
      'Hermes Apagada',
    );
    await expect(hermes.locator('[data-agent-status-line]')).toContainText('Apagada: no entra');
    expect(stand.calls.at(-1)).toEqual({
      method: 'PATCH',
      body: { accountId: GAMES.id, id: 'hermes', enabled: false },
    });
    await expect(page.locator('[data-agentes-notice]')).toBeVisible();
    await shot(page, '03-toggle-off-desktop');
    await hermes.locator('[data-metric="panel-agentes-switch"]').click();
    await expect(hermes.locator('[data-metric="panel-agentes-switch"]')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(hermes.locator('[data-agent-onoff]')).toHaveText('Encendida');
  });

  test('the state selector puts an AI to sleep and wakes it', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    const hermes = row(page, 'hermes');
    await hermes.getByRole('radio', { name: /Dormida/ }).click();
    await expect(hermes.getByRole('radio', { name: /Dormida/ })).toBeChecked();
    await expect(hermes.locator('[data-agent-status-line]')).toContainText('en reposo');
    expect(stand.calls.at(-1)?.body).toEqual({
      accountId: GAMES.id,
      id: 'hermes',
      state: 'dormida',
    });
    await shot(page, '04-dormida-desktop');
    await hermes.getByRole('radio', { name: /Activa/ }).click();
    await expect(hermes.getByRole('radio', { name: /Activa/ })).toBeChecked();
  });

  test('gives a role it does not hold and takes one it does', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    const luna = row(page, 'luna');
    await luna.getByLabel('Dar un rol a Luna').selectOption('role_money');
    await luna.getByRole('button', { name: 'Dar', exact: true }).click();
    await expect(luna.locator('[data-agent-role]')).toHaveText(['Finanzas×']);
    expect(stand.calls.at(-1)?.body).toEqual({
      accountId: GAMES.id,
      id: 'luna',
      giveRole: 'role_money',
    });
    // It no longer offers what it holds.
    await expect(luna.getByLabel('Dar un rol a Luna').locator('option')).toHaveText([
      'Dar un rol…',
      'Equipo',
      'Visitas',
    ]);
    await luna.getByRole('button', { name: 'Quitar el rol Finanzas a Luna' }).click();
    await expect(luna.locator('[data-agent-no-roles]')).toBeVisible();
    expect(stand.calls.at(-1)?.body).toEqual({
      accountId: GAMES.id,
      id: 'luna',
      takeRole: 'role_money',
    });
  });

  test('removes an AI only after the confirmation, and «No» leaves it', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    const luna = row(page, 'luna');
    await menuAction(luna, 'remove');
    await expect(luna.getByRole('group', { name: 'Quitar a Luna' })).toContainText(
      '¿Quitar a Luna? Ya no podrá entrar en ningún mundo de la comunidad.',
    );
    await shot(page, '05-remove-confirm-desktop');
    await luna.getByRole('button', { name: 'No, dejarla' }).click();
    await expect(row(page, 'luna')).toHaveCount(1);
    expect(stand.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0);
    await menuAction(luna, 'remove');
    await luna.getByRole('button', { name: 'Sí, quitar' }).click();
    await expect(row(page, 'luna')).toHaveCount(0);
    expect(stand.calls.filter((call) => call.method === 'DELETE')).toHaveLength(1);
  });
});

test.describe('Agentes — the invitation', () => {
  test('three steps for a talker: name and permission, the command and the key, the summary', async ({
    page,
  }) => {
    const stand = await stage(page);
    await open(page);
    await openInvite(page);
    const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
    await expect(dialog).toBeVisible();
    // The token is the default; the key way is the advanced one.
    await expect(dialog.getByRole('radio', { name: /Con un token/ })).toBeChecked();
    await dialog.getByRole('radio', { name: /Con mi propia llave/ }).check();
    await expect(dialog).toContainText('Paso 1 de 3');
    await shot(page, '06-invite-step1-desktop');

    // A bad name stops the first step.
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await expect(dialog).toContainText('Escribe un nombre.');
    await dialog.getByLabel('¿Cómo se llama?').fill('Hermes');
    await expect(dialog).toContainText('Ya hay una IA con ese nombre. Elige otro.');
    await dialog.getByLabel('¿Cómo se llama?').fill('Ariadna Dos');
    await expect(dialog.getByRole('radio', { name: /Solo mirar y hablar/ })).toBeChecked();
    await dialog.getByRole('button', { name: 'Siguiente' }).click();

    await expect(dialog).toContainText('Paso 2 de 3');
    await expect(dialog.locator('[data-agentes-command]')).toHaveText(
      'node tools/agente.ts nuevo ariadna-dos --nombre "Ariadna Dos"',
    );
    const next = dialog.getByRole('button', { name: 'Siguiente' });
    await expect(next).toBeDisabled();
    await dialog.getByPlaceholder('ed25519:…').fill('ed25519:corta');
    await expect(dialog).toContainText('Esa línea no es una clave pública');
    await expect(next).toBeDisabled();
    await shot(page, '07-invite-step2-desktop');
    await dialog.getByPlaceholder('ed25519:…').fill(KEY_NEW);
    await next.click();

    await expect(dialog).toContainText('Paso 3 de 3');
    await expect(dialog.locator('[data-agentes-summary-name]')).toHaveText('Ariadna Dos');
    await expect(dialog.locator('[data-agentes-summary-roles]')).toHaveText('Ninguno');
    await shot(page, '08-invite-step3-desktop');
    await dialog.getByRole('button', { name: 'Añadir' }).click();
    await expect(dialog).toBeHidden();
    await expect(row(page, 'ariadna-dos')).toBeVisible();
    await expect(row(page, 'ariadna-dos').locator('[data-agent-no-roles]')).toBeVisible();
    expect(stand.calls.at(-1)).toEqual({
      method: 'POST',
      body: {
        accountId: GAMES.id,
        id: 'ariadna-dos',
        name: 'Ariadna Dos',
        auth: 'key',
        publicKey: KEY_NEW,
        roleIds: [],
      },
    });
  });

  test('«También construir» asks for roles among the ones that can be given', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    await openInvite(page);
    const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
    await dialog.getByRole('radio', { name: /Con mi propia llave/ }).check();
    await dialog.getByLabel('¿Cómo se llama?').fill('Obrera');
    await dialog.getByRole('radio', { name: /también construir/i }).check();
    await expect(dialog.locator('[data-agentes-roles]')).toContainText('¿Con qué roles?');
    await expect(dialog.getByRole('checkbox')).toHaveCount(3);
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await expect(dialog).toContainText('Elige al menos un rol.');
    await shot(page, '09-invite-build-roles-desktop');
    await dialog.getByRole('checkbox', { name: 'Equipo' }).check();
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await dialog.getByPlaceholder('ed25519:…').fill(KEY_NEW);
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await expect(dialog.locator('[data-agentes-summary-roles]')).toHaveText('Equipo');
    await dialog.getByRole('button', { name: 'Atrás' }).click();
    await expect(dialog).toContainText('Paso 2 de 3');
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await dialog.getByRole('button', { name: 'Añadir' }).click();
    await expect(row(page, 'obrera')).toBeVisible();
    await expect(row(page, 'obrera').locator('[data-agent-role]')).toHaveText(['Equipo×']);
    expect(stand.calls.at(-1)?.body).toMatchObject({ id: 'obrera', roleIds: ['role_team'] });
  });

  test('when the till refuses the last step, it says why in a sentence and keeps the dialog', async ({
    page,
  }) => {
    const stand = await stage(page);
    await open(page);
    await openInvite(page);
    const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
    await dialog.getByRole('radio', { name: /Con mi propia llave/ }).check();
    await dialog.getByLabel('¿Cómo se llama?').fill('Repetida');
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await dialog.getByPlaceholder('ed25519:…').fill(KEY_A);
    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    stand.refuseWrite = {
      status: 403,
      body: {
        error: 'refused',
        problems: ['the organization already has an agent with that id or that key'],
      },
    };
    await dialog.getByRole('button', { name: 'Añadir' }).click();
    const failed = dialog.locator('[data-agentes-add-failed]');
    await expect(failed).toHaveText(
      'Ya hay una IA con ese nombre o con esa clave. Prueba con otro nombre.',
    );
    await expect(failed).not.toContainText('organization already');
    await shot(page, '10-invite-error-desktop');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toBeHidden();
  });

  test('is disabled, with the reason, for whoever may not manage roles', async ({ page }) => {
    await stage(page, { mayCreate: false });
    await open(page);
    await expect(page.locator('[data-metric="panel-agentes-connect"]')).toBeDisabled();
    await expect(page.locator('[data-agentes-no-right]')).toContainText(
      'hace falta poder gestionar los roles',
    );
  });
});

test.describe('Agentes — when something fails', () => {
  test('a write the till refuses is told in plain words, never a code', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    stand.refuseWrite = {
      status: 403,
      body: {
        error: 'refused',
        problems: ['you may act only on roles and members below your own highest role'],
      },
    };
    await row(page, 'hermes').locator('[data-metric="panel-agentes-switch"]').click();
    const line = page.locator('[data-agentes-notice-line="alert"]');
    await expect(line).toContainText('Solo puedes actuar sobre roles y personas');
    await expect(line).not.toContainText('below your own');
    // The switch went back to what the till still has.
    await expect(
      row(page, 'hermes').locator('[data-metric="panel-agentes-switch"]'),
    ).toHaveAttribute('aria-checked', 'true');
    await shot(page, '11-write-refused-desktop');
  });

  test('a till that is not bound says «Esto aún no está disponible»', async ({ page }) => {
    const stand = await stage(page);
    stand.down = { status: 503, body: { error: 'not-bound' } };
    await open(page);
    await expect(page.locator('[data-agentes-failed="unavailable"]')).toHaveText(
      'Esto aún no está disponible',
    );
    await expect(page.locator('[data-agentes-failed] button')).toHaveCount(0);
    await expect(page.locator('[data-agentes-notice]')).toHaveText(NOTICE);
    await shot(page, '12-not-bound-desktop');
  });

  test('a till that fails offers to try again, and the list comes back', async ({ page }) => {
    const stand = await stage(page);
    stand.down = { status: 502, body: { error: 'till-failed' } };
    await open(page);
    const failed = page.locator('[data-agentes-failed="failed"]');
    await expect(failed).toContainText('Algo ha salido mal. Inténtalo de nuevo.');
    await shot(page, '13-failed-desktop');
    stand.down = null;
    await failed.getByRole('button', { name: 'Reintentar' }).click();
    await expect(list(page)).toBeVisible();
  });

  test('a body that is not the list is a failure too, not a blank screen', async ({ page }) => {
    const stand = await stage(page);
    stand.down = { status: 200, body: { agents: { ok: true } } };
    await open(page);
    await expect(page.locator('[data-agentes-failed="failed"]')).toBeVisible();
  });
});

test.describe('Agentes — the community decides', () => {
  test('when the community turns the piece off, the rail loses it and the address says so', async ({
    page,
  }) => {
    await stage(page, { off: ['agents'] });
    await open(page);
    await expect(page.locator('[data-piece-off="agents"]')).toBeVisible();
    await expect(page.locator('[data-org-rail] a[data-metric="panel-nav-agents"]')).toHaveCount(0);
    await expect(list(page)).toHaveCount(0);
  });
});

test.describe('Agentes — every language', () => {
  const cases: Array<[string, string, string, string]> = [
    [
      '/panel/agentes/',
      'Agents',
      'Changes reach the worlds within about 10 minutes at most.',
      'On',
    ],
    ['/es/panel/agentes/', 'Agentes', NOTICE, 'Encendida'],
    [
      '/ja/panel/agentes/',
      'エージェント',
      '変更が世界に届くまで、長くても10分ほどかかります。',
      'オン',
    ],
    [
      '/ko/panel/agentes/',
      '에이전트',
      '변경 사항은 세계에 길어도 약 10분 안에 반영됩니다.',
      '켜짐',
    ],
    [
      '/pt-br/panel/agentes/',
      'Agentes',
      'As mudanças chegam aos mundos em cerca de 10 minutos, no máximo.',
      'Ligada',
    ],
  ];
  for (const [path, title, notice, on] of cases) {
    test(`${path} says its title, the notice and the switch in its own words`, async ({ page }) => {
      await stage(page);
      await open(page, path);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('[data-agentes-notice]')).toHaveText(notice);
      await expect(row(page, 'hermes').locator('[data-agent-onoff]')).toHaveText(on);
      await shot(page, `20-locale-${path.replace(/\W+/g, '') || 'en'}`);
    });
  }
});

for (const [name, size] of [
  ['phone 390', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  const tag = name.startsWith('phone') ? 'phone' : 'desktop';
  test.describe(`Agentes — ${name}`, () => {
    test.use({ viewport: size });

    test('the empty state and the list have no sideways scroll and are axe clean', async ({
      page,
    }) => {
      const stand = await stage(page, { agents: [] });
      await open(page);
      await expect(page.locator('[data-agentes-none]')).toBeVisible();
      await shot(page, `30-empty-${tag}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      let results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);

      stand.agents = roster();
      await page.reload();
      await expect(list(page)).toBeVisible();
      await shot(page, `31-list-${tag}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
    });

    test('the confirmation and the three steps of the invitation are axe clean', async ({
      page,
    }) => {
      await stage(page);
      await open(page);
      await menuAction(row(page, 'luna'), 'remove');
      await shot(page, `32-confirm-${tag}`);
      let results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await row(page, 'luna').getByRole('button', { name: 'No, dejarla' }).click();

      await openInvite(page);
      const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
      await dialog.getByRole('radio', { name: /Con mi propia llave/ }).check();
      await dialog.getByLabel('¿Cómo se llama?').fill('Ariadna');
      await dialog.getByRole('radio', { name: /también construir/i }).check();
      await shot(page, `33-step1-${tag}`);
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
      await dialog.getByRole('checkbox', { name: 'Equipo' }).check();
      await dialog.getByRole('button', { name: 'Siguiente' }).click();
      await shot(page, `34-step2-${tag}`);
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
      await dialog.getByPlaceholder('ed25519:…').fill(KEY_NEW);
      await dialog.getByRole('button', { name: 'Siguiente' }).click();
      await shot(page, `35-step3-${tag}`);
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Agentes — ${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test('the list, the confirmation and the invitation are axe clean', async ({ page }) => {
      await stage(page);
      await open(page);
      await expect(list(page)).toBeVisible();
      await shot(page, `40-list-${scheme}`);
      let results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await menuAction(row(page, 'luna'), 'remove');
      results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await row(page, 'luna').getByRole('button', { name: 'No, dejarla' }).click();
      await openInvite(page);
      const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
      await dialog.getByRole('radio', { name: /Con mi propia llave/ }).check();
      await dialog.getByLabel('¿Cómo se llama?').fill('Ariadna');
      await dialog.getByRole('radio', { name: /también construir/i }).check();
      await dialog.getByRole('button', { name: 'Siguiente' }).click();
      await shot(page, `41-invite-roles-error-${scheme}`);
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

const tokenRow = (): Agent =>
  agent({
    id: 'ariadna',
    name: 'Ariadna',
    auth: 'token',
    tokenPrefix: TOKEN.slice(4, 12),
    tokenCreatedAt: '2026-10-17T10:00:00.000Z',
  });

test.describe('Agentes — the token way', () => {
  test('is the default of the invitation: name, permission and «Añadir», then the secret once', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const stand = await stage(page);
    await open(page);
    await openInvite(page);
    const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
    await expect(dialog.getByRole('radio', { name: /Con un token/ })).toBeChecked();
    await expect(
      dialog.getByRole('radio', { name: /Con mi propia llave \(avanzado\)/ }),
    ).not.toBeChecked();
    await expect(dialog).not.toContainText('Paso 1 de 3');
    await expect(dialog.getByRole('button', { name: 'Siguiente' })).toHaveCount(0);
    await shot(page, '01-choice-step-desktop');

    await dialog.getByRole('button', { name: 'Añadir' }).click();
    await expect(dialog).toContainText('Escribe un nombre.');
    await dialog.getByLabel('¿Cómo se llama?').fill('Ariadna');
    await dialog.getByRole('button', { name: 'Añadir' }).click();

    const once = page.getByRole('dialog', { name: 'Copia tu token ahora, no lo volverás a ver' });
    await expect(once).toBeVisible();
    await expect(once.locator('[data-agentes-token]')).toHaveText(TOKEN);
    await expect(once.locator('[data-agentes-connect]')).toContainText(
      'hermes mcp add numinia-mundo --command node --env',
    );
    await expect(once.locator('[data-agentes-connect]')).toContainText(`AGENTE_TOKEN=${TOKEN}`);
    await expect(once.locator('[data-agentes-connect]')).toContainText('AGENTE_ORG=acc_t_games');
    await shot(page, '02-show-once-desktop');
    expect(stand.calls.at(-1)).toEqual({
      method: 'POST',
      body: { accountId: GAMES.id, id: 'ariadna', name: 'Ariadna', auth: 'token', roleIds: [] },
    });

    // Escape does not close it; «Copiar» copies the secret; only «Ya lo he copiado» closes.
    await page.keyboard.press('Escape');
    await expect(once).toBeVisible();
    await once.getByRole('button', { name: 'Copiar', exact: true }).click();
    await expect(once.getByRole('button', { name: 'Copiado' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TOKEN);
    await once.getByRole('button', { name: 'Copiar las tres líneas' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      'hermes mcp test numinia-mundo',
    );
    await once.getByRole('button', { name: 'Ya lo he copiado' }).click();
    await expect(once).toBeHidden();

    // The secret is gone from the page; the row has the prefix and the day.
    await expect(page.locator('body')).not.toContainText(TOKEN);
    const line = row(page, 'ariadna').locator('[data-agent-token-line]');
    await expect(line).toHaveText(
      `Código ntk_${TOKEN.slice(4, 12)}… · creado el 17 de octubre de 2026`,
    );
    await shot(page, '03-row-with-prefix-desktop');
  });

  test('says so when the clipboard is not available', async ({ page }) => {
    await stage(page);
    await open(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
    });
    await page.reload();
    await expect(page.locator('[data-org-panel]')).toHaveAttribute('data-state', 'ready');
    await openInvite(page);
    const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
    await dialog.getByLabel('¿Cómo se llama?').fill('Ariadna');
    await dialog.getByRole('button', { name: 'Añadir' }).click();
    const once = page.getByRole('dialog', { name: 'Copia tu token ahora, no lo volverás a ver' });
    await once.getByRole('button', { name: 'Copiar', exact: true }).click();
    await expect(once.locator('[data-agentes-copy-failed]')).toContainText(
      'No se ha podido copiar',
    );
  });

  test('renews after a confirmation: «No» leaves it, «Sí» shows the new secret once', async ({
    page,
  }) => {
    const stand = await stage(page, { agents: [...roster(), tokenRow()] });
    await open(page);
    const renewal = row(page, 'ariadna');
    await expect(row(page, 'hermes').locator('[data-agent-action="renew"]')).toHaveCount(0);
    await menuAction(renewal, 'renew');
    await expect(renewal).toContainText('¿Renovar el código de Ariadna?');
    await shot(page, '04-renew-confirm-desktop');
    await renewal.getByRole('button', { name: 'No, dejarlo' }).click();
    expect(stand.calls.filter((call) => call.method === 'PATCH')).toHaveLength(0);

    await menuAction(renewal, 'renew');
    await renewal.getByRole('button', { name: 'Sí, renovar' }).click();
    const once = page.getByRole('dialog', { name: 'Copia tu token ahora, no lo volverás a ver' });
    await expect(once.locator('[data-agentes-token]')).toHaveText(TOKEN_NEW);
    expect(stand.calls.at(-1)).toEqual({
      method: 'PATCH',
      body: { accountId: GAMES.id, id: 'ariadna', renewToken: true },
    });
    await once.getByRole('button', { name: 'Ya lo he copiado' }).click();
    await expect(row(page, 'ariadna').locator('[data-agent-token-line]')).toContainText(
      TOKEN_NEW.slice(4, 12),
    );
  });

  test('a key AI has no token line and no renew', async ({ page }) => {
    await stage(page);
    await open(page);
    await expect(row(page, 'hermes').locator('[data-agent-token-line]')).toHaveCount(0);
  });

  test('the phone: the choice, the secret and the row fit and are axe clean', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stage(page);
    await open(page);
    await openInvite(page);
    const dialog = page.getByRole('dialog', { name: 'Invitar a una IA' });
    await shot(page, '05-choice-step-phone');
    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await dialog.getByLabel('¿Cómo se llama?').fill('Ariadna');
    await dialog.getByRole('button', { name: 'Añadir' }).click();
    const once = page.getByRole('dialog', { name: 'Copia tu token ahora, no lo volverás a ver' });
    await expect(once).toBeVisible();
    await shot(page, '06-show-once-phone');
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await once.getByRole('button', { name: 'Ya lo he copiado' }).click();
    await shot(page, '07-row-with-prefix-phone');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test('desktop: the choice, the secret and the renewal are axe clean in light and dark', async ({
    page,
  }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await stage(page, { agents: [tokenRow()] });
      await open(page);
      await menuAction(row(page, 'ariadna'), 'renew');
      let results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await row(page, 'ariadna').getByRole('button', { name: 'Sí, renovar' }).click();
      const once = page.getByRole('dialog', { name: 'Copia tu token ahora, no lo volverás a ver' });
      await expect(once).toBeVisible();
      await shot(page, `08-show-once-${scheme}`);
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
      await once.getByRole('button', { name: 'Ya lo he copiado' }).click();
    }
  });

  for (const [path, invite, name, copied] of [
    [
      '/panel/agentes/',
      'Invite an AI',
      'Copy your token now, you won’t see it again',
      'I have copied it',
    ],
    [
      '/ja/panel/agentes/',
      '',
      'トークンを今すぐコピーしてください。二度と表示されません',
      'コピーしました',
    ],
    ['/ko/panel/agentes/', '', '지금 토큰을 복사하세요. 다시 볼 수 없습니다', '복사했습니다'],
    ['/pt-br/panel/agentes/', '', 'Copie seu token agora, você não o verá de novo', 'Já copiei'],
  ] as const) {
    test(`${path} says the show-once screen in its own words`, async ({ page }) => {
      void invite;
      await stage(page);
      await open(page, path);
      await openInvite(page);
      await page.locator('dialog[open] input[type="text"]').first().fill('Ariadna');
      await page.locator('dialog[open] [data-metric="panel-agentes-invite-add-token"]').click();
      const once = page.getByRole('dialog', { name });
      await expect(once).toBeVisible();
      await expect(once.getByRole('button', { name: copied })).toBeVisible();
      await expect(once.locator('[data-agentes-token]')).toHaveText(TOKEN);
      await shot(
        page,
        `09-show-once-${path.split('/')[1] === 'panel' ? 'en' : path.split('/')[1]}`,
      );
    });
  }
});
