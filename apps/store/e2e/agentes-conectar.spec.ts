/**
 * «Agentes» and its one button «Conectar una IA», in a real browser against
 * the built site: the button opens the dialog with «Conecta tu IA» (the relay's
 * one address) in the five locales, the line under the title that tells these
 * AIs from Ajustes › «Agente IA», each card's chip saying where its AI came
 * from (`via`: Claude, ChatGPT, Hermes, the panel's code, a key, or the host),
 * and the ⋯ menu: «Desconectar» on an AI connected from an app (the token's
 * existing revoke), «Renovar código» on one made in the panel, «Quitar» on
 * any, each with its one-line explanation. As in
 * panel-agentes.spec.ts the session and the till's answers are played by the
 * browser (`page.route`), shaped as /api/saldo/agents sends them.
 *
 * With SHOTS_DIR set, the block and the rows are also saved as screenshots.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ME = '0x42e6000000000000000000000000000000ca26';
const RELAY = 'https://mcp.numinia.com/mcp';

const GAMES = {
  id: 'acc_t_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'admin',
  balanceCents: 0,
};

interface Agent {
  id: string;
  name: string;
  auth: 'key' | 'token';
  publicKey?: string;
  tokenPrefix?: string;
  tokenCreatedAt?: string;
  via?: string;
  enabled: boolean;
  state: 'activa' | 'dormida';
  status: 'apagada' | 'activa' | 'dormida';
  responsible: string;
  responsibleName: string;
  createdAt: string;
  updatedAt: string;
  roleIds: string[];
  assignable: string[];
  mayEdit: boolean;
  hears?: boolean;
}

const agent = (extra: Partial<Agent> & Pick<Agent, 'id' | 'name'>): Agent => ({
  auth: 'token',
  tokenPrefix: 'Zy9_Zy9_',
  tokenCreatedAt: '2026-10-19T09:00:00.000Z',
  enabled: true,
  state: 'activa',
  status: 'activa',
  responsible: ME,
  responsibleName: 'Pablo',
  createdAt: '2026-10-19T09:00:00.000Z',
  updatedAt: '2026-10-19T09:00:00.000Z',
  roleIds: [],
  assignable: [],
  mayEdit: true,
  ...extra,
});

const roster = (): Agent[] => [
  agent({ id: 'claude', name: 'Claude de Pablo', via: 'mcp:claude.ai' }),
  agent({ id: 'gpt', name: 'GPT de Lucía', via: 'mcp:chatgpt.com' }),
  agent({ id: 'otra', name: 'Otra IA', via: 'mcp:mistral.example' }),
  agent({ id: 'hermes', name: 'Hermes', via: 'panel' }),
  agent({
    id: 'vieja',
    name: 'Vieja',
    auth: 'key',
    tokenPrefix: undefined,
    tokenCreatedAt: undefined,
    publicKey: `ed25519:${'A'.repeat(43)}`,
  }),
];

interface Stand {
  agents: Agent[];
  calls: Array<{ method: string; body: unknown }>;
}

async function stage(
  page: Page,
  agents: Agent[] = roster(),
  rights: { mayCreate?: boolean } = {},
): Promise<Stand> {
  const stand: Stand = { agents, calls: [] };
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: ME, rank: 'oracle' } }),
  );
  await page.route('**/api/saldo', (route) => route.fulfill({ json: { accounts: [GAMES] } }));
  await page.route('**/api/saldo/roles?*', (route) =>
    route.fulfill({
      json: {
        roles: { ok: true, accountId: GAMES.id, as: 'owner', roles: [], members: [] },
        you: ME,
      },
    }),
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
          off: [],
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
    const body: unknown = method === 'GET' ? null : request.postDataJSON();
    stand.calls.push({ method, body });
    if (method === 'PATCH') {
      const change = body as { id: string; revokeToken?: true; hears?: boolean };
      const entry = stand.agents.find((candidate) => candidate.id === change.id);
      if (entry !== undefined && change.hears !== undefined) entry.hears = change.hears;
      if (entry !== undefined && change.revokeToken === true) {
        // The till's revoke: the token goes, the AI is switched off, `via` stays.
        delete entry.tokenPrefix;
        delete entry.tokenCreatedAt;
        entry.enabled = false;
        entry.status = 'apagada';
      }
    }
    return route.fulfill({
      json: {
        agents: {
          ok: true,
          accountId: GAMES.id,
          as: 'owner',
          mayCreate: rights.mayCreate ?? true,
          assignableRoles: [],
          agents: stand.agents,
        },
      },
    });
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
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}

const row = (page: Page, id: string) => page.locator(`[data-agent="${id}"]`);
const block = (page: Page) => page.locator('[data-agentes-connect-url]');
const connect = (page: Page) => page.locator('[data-metric="panel-agentes-connect"]');
const dialog = (page: Page) => page.locator('dialog[data-agentes-connect-dialog]');
const menuOf = (card: Locator) => card.locator('[data-metric="panel-agentes-menu"]');

/** The dialog of the one button. */
async function openConnect(page: Page): Promise<void> {
  await connect(page).click();
  await expect(dialog(page)).toBeVisible();
}

test.describe('Agentes — Conectar una IA', () => {
  const cases: ReadonlyArray<readonly [string, string, string, string, string]> = [
    ['/es/panel/agentes/', 'Conectar una IA', 'Ajustes › Agente IA', 'Desde Claude', 'Con clave'],
    ['/panel/agentes/', 'Connect an AI', 'Settings › AI agent', 'From Claude', 'With a key'],
    ['/ja/panel/agentes/', 'AIをつなぐ', '設定 › AIエージェント', 'Claudeから', '鍵で接続'],
    ['/ko/panel/agentes/', 'AI 연결하기', '설정 › AI 에이전트', 'Claude에서', '키로 연결'],
    [
      '/pt-br/panel/agentes/',
      'Conectar uma IA',
      'Configurações › Agente de IA',
      'Do Claude',
      'Com chave',
    ],
  ];
  for (const [path, button, settings, fromClaude, withKey] of cases) {
    test(`${path} has the one button, the dialog with the address and the chips in its own words`, async ({
      page,
    }) => {
      await stage(page);
      await open(page, path);
      await expect(connect(page)).toHaveText(button);
      await expect(page.locator('[data-agentes-connect]')).toHaveCount(1);
      await expect(page.locator('[data-agentes-subtitle]')).toContainText(settings);
      await expect(row(page, 'claude').locator('[data-agent-via]')).toHaveText(fromClaude);
      await expect(row(page, 'vieja').locator('[data-agent-via]')).toHaveText(withKey);
      // The address is not on the list page any more: only in the dialog the button opens.
      await expect(block(page)).toHaveCount(0);
      await openConnect(page);
      await expect(block(page).locator('[data-agentes-relay-url]')).toHaveText(RELAY);
      await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText(button);
    });
  }

  test('the settings line leads to Ajustes, keeping the community', async ({ page }) => {
    await stage(page);
    await open(page);
    await expect(page.locator('[data-agentes-settings-link]')).toHaveAttribute(
      'href',
      `/es/panel/ajustes/?org=${GAMES.id}`,
    );
  });

  test('says the steps for Claude, ChatGPT, Hermes and a client without login, and that it does not hear', async ({
    page,
  }) => {
    await stage(page);
    await open(page);
    await openConnect(page);
    const steps = block(page);
    await expect(steps.locator('[data-agentes-step="claude"]')).toContainText(
      'añade un conector personalizado',
    );
    await expect(steps.locator('[data-agentes-step="chatgpt"]')).toContainText(
      'activa el modo desarrollador',
    );
    const link = steps.locator('[data-agentes-hermes-link]');
    await expect(link).toHaveText('Añadir a Hermes');
    const href = (await link.getAttribute('href')) ?? '';
    expect(href.startsWith('hermes://mcp/install?name=numinia&config=')).toBe(true);
    const config = new URL(href).searchParams.get('config') ?? '';
    expect(JSON.parse(atob(config.replace(/-/g, '+').replace(/_/g, '/')))).toEqual({
      url: RELAY,
      auth: 'oauth',
    });
    await expect(steps.locator('[data-agentes-token-command]')).toHaveText(
      `hermes mcp add numinia --url ${RELAY} --auth header`,
    );
    await expect(steps.locator('[data-agentes-hear]')).toHaveText(
      'Para que una IA oiga lo que se habla cerca, enciende «Oír lo que se habla cerca» en su tarjeta: viene apagado.',
    );
  });

  test('copies the address, and «Cerrar» closes the dialog', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await stage(page);
    await open(page);
    await openConnect(page);
    const copy = block(page).locator('[data-metric="panel-agentes-url-copy"]');
    await copy.click();
    await expect(copy).toHaveText('Copiado');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(RELAY);
    await dialog(page).locator('[data-metric="panel-agentes-connect-close"]').click();
    await expect(dialog(page)).toHaveCount(0);
  });

  test('the token and the key stay reachable from the dialog', async ({ page }) => {
    await stage(page);
    await open(page);
    await openConnect(page);
    await expect(dialog(page).locator('[data-agentes-advanced]')).toHaveText(
      'Con un token o una clave (avanzado)',
    );
    await dialog(page).locator('[data-agentes-advanced]').click();
    await expect(dialog(page)).toHaveCount(0);
    const invite = page.locator('dialog[open][data-agentes-dialog]');
    await expect(invite).toBeVisible();
    await expect(invite.getByRole('radio', { name: /Con un token/ })).toBeChecked();
    await expect(invite.getByRole('radio', { name: /Con mi propia llave/ })).toBeVisible();
  });

  test('the button is off for whoever may not manage roles, and says why', async ({ page }) => {
    await stage(page, undefined, { mayCreate: false });
    await open(page);
    await expect(connect(page)).toBeDisabled();
    await expect(page.locator('[data-agentes-no-right]')).toContainText(
      'hace falta poder gestionar los roles',
    );
  });

  test('with no AI, the empty state has one line and the same single button', async ({ page }) => {
    await stage(page, []);
    await open(page);
    const empty = page.locator('[data-agentes-none]');
    await expect(empty).toContainText('Todavía no hay ninguna IA en tu comunidad');
    await expect(empty.getByRole('img')).toHaveAccessibleName(
      'Una IA unida por un cable a un mundo',
    );
    await expect(page.locator('[data-agentes-list]')).toHaveCount(0);
    await expect(connect(page)).toHaveCount(1);
    await expect(page.locator('[data-agentes-notice]')).toHaveText(
      'Los cambios llegan a los mundos en unos 10 minutos como máximo.',
    );
    await shot(page, '10-empty-desktop');
    await openConnect(page);
  });
});

test.describe('Agentes — the chip and the ⋯ menu of each AI', () => {
  test('each card says where its AI came from', async ({ page }) => {
    await stage(page);
    await open(page);
    const chip = (id: string) => row(page, id).locator('[data-agent-via]');
    await expect(chip('claude')).toHaveText('Desde Claude');
    await expect(chip('gpt')).toHaveText('Desde ChatGPT');
    await expect(chip('otra')).toHaveText('Desde mistral.example');
    await expect(chip('hermes')).toHaveText('Desde el panel (con código)');
    await expect(chip('vieja')).toHaveText('Con clave');
    await expect(row(page, 'claude')).toHaveAttribute('data-agent-client', 'claude');
    await shot(page, '01-cards-desktop');
  });

  test('the menu offers only what applies, each with its one-line explanation', async ({
    page,
  }) => {
    await stage(page);
    await open(page);
    const actions = async (id: string) => {
      const card = row(page, id);
      await menuOf(card).click();
      const found = await card
        .locator('[data-agent-action]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-agent-action')));
      await page.keyboard.press('Escape');
      return found;
    };
    expect(await actions('claude')).toEqual(['disconnect', 'remove']);
    expect(await actions('hermes')).toEqual(['renew', 'remove']);
    expect(await actions('vieja')).toEqual(['remove']);

    const claude = row(page, 'claude');
    await menuOf(claude).click();
    await expect(menuOf(claude)).toHaveAttribute('aria-expanded', 'true');
    await expect(claude.locator('[data-agent-action="disconnect"]')).toContainText(
      'La apaga y corta su conexión con Claude. Para volver, conéctala otra vez desde Claude.',
    );
    await expect(claude.locator('[data-agent-action="remove"]')).toContainText(
      'La borra de la comunidad. Ya no podrá entrar en ningún mundo.',
    );
    await expect(claude.locator('.agentes-menu-pie')).toContainText('pide confirmar');
    await shot(page, '02-menu-desktop');
    // The keyboard: the first item has the focus, the arrows move, Escape closes and gives it back.
    await expect(claude.locator('[data-agent-action="disconnect"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(claude.locator('[data-agent-action="remove"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(claude.locator('[data-agent-action="disconnect"]')).toBeFocused();
    await page.keyboard.press('End');
    await expect(claude.locator('[data-agent-action="remove"]')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(claude.locator('[data-agent-action="disconnect"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(claude.locator('[data-agent-menu]')).toHaveCount(0);
    await expect(menuOf(claude)).toBeFocused();
  });

  test('«Desconectar» asks, «No» leaves it, «Sí» calls the token’s revoke', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    const claude = row(page, 'claude');
    await menuOf(claude).click();
    await claude.locator('[data-agent-action="disconnect"]').click();
    await expect(claude.locator('[data-agent-menu]')).toHaveCount(0);
    const ask = claude.locator('[data-agent-confirm="disconnect"]');
    await expect(ask).toContainText(
      '¿Desconectar a Claude de Pablo? Se apaga y su conexión desde claude.ai deja de valer.',
    );
    await shot(page, '03-desconectar-pregunta');
    await ask.locator('[data-metric="panel-agentes-disconnect-no"]').click();
    expect(stand.calls.filter((call) => call.method === 'PATCH')).toEqual([]);

    await menuOf(claude).click();
    await claude.locator('[data-agent-action="disconnect"]').click();
    await claude.locator('[data-metric="panel-agentes-disconnect-yes"]').click();
    await expect(claude.locator('[data-agent-url-none]')).toHaveText(
      'Desconectada. Para volver, conéctala otra vez desde claude.ai.',
    );
    expect(stand.calls.filter((call) => call.method === 'PATCH')).toEqual([
      {
        method: 'PATCH',
        body: { accountId: GAMES.id, id: 'claude', revokeToken: true },
      },
    ]);
    // Disconnected: nothing left to disconnect; only «Quitar».
    await menuOf(claude).click();
    await expect(claude.locator('[data-agent-action]')).toHaveText([/Quitar/]);
    await expect(claude.locator('[data-metric="panel-agentes-switch"]')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('who may not edit the AI gets no menu and no controls', async ({ page }) => {
    await stage(page, [
      agent({ id: 'claude', name: 'Claude de Lucía', via: 'mcp:claude.ai', mayEdit: false }),
    ]);
    await open(page);
    const claude = row(page, 'claude');
    await expect(claude.locator('[data-agent-via]')).toHaveText('Desde Claude');
    await expect(menuOf(claude)).toHaveCount(0);
    await expect(claude.locator('[data-metric="panel-agentes-switch"]')).toBeDisabled();
    await expect(claude.locator('[data-metric="panel-agentes-hear"]')).toBeDisabled();
    await expect(claude.getByRole('radio').first()).toBeDisabled();
    await expect(claude.locator('[data-agent-read-only]')).toBeVisible();
  });

  test('ESTADO says its hint and OÍR follows its switch', async ({ page }) => {
    await stage(page);
    await open(page);
    const claude = row(page, 'claude');
    await expect(claude.locator('[data-agent-state-hint]')).toHaveText(
      'Atenta y dispuesta a interactuar.',
    );
    await expect(claude.locator('[data-agent-hear] .saldo-nota')).toHaveText(
      'Si lo enciendes, la IA lee el chat cercano en los mundos donde esté.',
    );
    await claude.locator('[data-metric="panel-agentes-hear"]').click();
    await expect(claude.locator('[data-agent-hear]')).toHaveAttribute('data-agent-hear', 'on');
    await expect(claude.locator('[data-agent-hear] .saldo-nota')).toHaveText(
      'Encendido: la IA lee el chat cercano en los mundos donde esté.',
    );
  });
});

for (const [name, size] of [
  ['phone 390', { width: 390, height: 844 }],
  ['desktop', { width: 1440, height: 900 }],
] as const) {
  const tag = name.startsWith('phone') ? 'phone' : 'desktop';
  test.describe(`Agentes — Conectar una IA, ${name}`, () => {
    test.use({ viewport: size });

    const fits = (page: Page) =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    test('the cards, the menu and the dialog fit and are axe clean', async ({ page }) => {
      await stage(page);
      await open(page);
      await expect(connect(page)).toBeVisible();
      expect(await fits(page)).toBe(true);
      let results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await shot(page, `20-cards-${tag}`);

      const claude = row(page, 'claude');
      await menuOf(claude).click();
      await expect(claude.locator('[data-agent-menu]')).toBeVisible();
      expect(await fits(page)).toBe(true);
      // The menu is whole on the screen and its last line is reachable.
      const box = await claude.locator('[data-agent-menu]').boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      if (tag === 'phone') expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
      results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await shot(page, `21-menu-${tag}`);
      if (tag === 'phone') {
        // The veil closes it with a tap outside.
        await page.mouse.click(10, 10);
        await expect(claude.locator('[data-agent-menu]')).toHaveCount(0);
      } else {
        await page.keyboard.press('Escape');
      }
      await row(page, 'claude').scrollIntoViewIfNeeded();

      await openConnect(page);
      expect(await fits(page)).toBe(true);
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
      await shot(page, `22-dialog-${tag}`);
    });

    test('the empty state fits and is axe clean', async ({ page }) => {
      await stage(page, []);
      await open(page);
      await expect(page.locator('[data-agentes-none]')).toBeVisible();
      expect(await fits(page)).toBe(true);
      const results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await shot(page, `23-empty-${tag}`);
    });
  });
}
