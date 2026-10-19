/**
 * «Agentes» learns the URL way (paso 2 of the remote MCP, W12), in a real
 * browser against the built site: the block «Conecta tu IA» with the relay's
 * one address in the five locales, the line under the title that tells these
 * AIs from Ajustes › «Agente IA», each row saying how its AI was connected
 * (`via`: from the panel, or from an app's host), and «Desconectar» on a row
 * connected from an app, which is the token's existing revoke. As in
 * panel-agentes.spec.ts the session and the till's answers are played by the
 * browser (`page.route`), shaped as /api/saldo/agents sends them.
 *
 * With SHOTS_DIR set, the block and the rows are also saved as screenshots.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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

async function stage(page: Page, agents: Agent[] = roster()): Promise<Stand> {
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
      const change = body as { id: string; revokeToken?: true };
      const entry = stand.agents.find((candidate) => candidate.id === change.id);
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
          mayCreate: true,
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

test.describe('Agentes — Conecta tu IA', () => {
  const cases: ReadonlyArray<readonly [string, string, string, string]> = [
    [
      '/es/panel/agentes/',
      'Conecta tu IA',
      'IAs que traen los miembros',
      'Conectada desde claude.ai',
    ],
    ['/panel/agentes/', 'Connect your AI', 'AIs that members bring', 'Connected from claude.ai'],
    ['/ja/panel/agentes/', 'AIをつなぐ', 'メンバーが連れてくるAI', 'claude.ai から接続'],
    ['/ko/panel/agentes/', 'AI 연결하기', '멤버가 데려오는 AI', 'claude.ai에서 연결됨'],
    [
      '/pt-br/panel/agentes/',
      'Conecte sua IA',
      'IAs que os membros trazem',
      'Conectada de claude.ai',
    ],
  ];
  for (const [path, title, subtitle, via] of cases) {
    test(`${path} shows the block, the address and the app's host in its own words`, async ({
      page,
    }) => {
      await stage(page);
      await open(page, path);
      await expect(block(page).getByRole('heading', { level: 2 })).toHaveText(title);
      await expect(block(page).locator('[data-agentes-relay-url]')).toHaveText(RELAY);
      await expect(page.locator('[data-agentes-subtitle]')).toContainText(subtitle);
      await expect(row(page, 'claude').locator('[data-agent-via="url"]')).toHaveText(via);
    });
  }

  test('says the steps for Claude, ChatGPT, Hermes and a client without login, and that it does not hear', async ({
    page,
  }) => {
    await stage(page);
    await open(page);
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
      'Por ahora la IA no oye lo que se habla cerca de ella en los mundos.',
    );
    // The token way stays the panel's default for adding an AI by hand.
    await expect(page.locator('[data-metric="panel-agentes-invite"]')).toBeEnabled();
  });

  test('copies the address', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await stage(page);
    await open(page);
    const copy = block(page).locator('[data-metric="panel-agentes-url-copy"]');
    await copy.click();
    await expect(copy).toHaveText('Copiado');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(RELAY);
  });
});

test.describe('Agentes — how each AI is connected', () => {
  test('a row says the panel or the app’s host; an AI from an app has «Desconectar», not «Renovar»', async ({
    page,
  }) => {
    await stage(page);
    await open(page);
    const claude = row(page, 'claude');
    await expect(claude.locator('[data-agent-via]')).toHaveText('Conectada desde claude.ai');
    await expect(claude.locator('[data-agent-disconnect]')).toBeVisible();
    await expect(claude.locator('[data-agent-renew]')).toHaveCount(0);
    await expect(claude.locator('[data-agent-token-line]')).toHaveCount(0);

    const hermes = row(page, 'hermes');
    await expect(hermes.locator('[data-agent-via]')).toHaveText('Conectada desde el panel');
    await expect(hermes.locator('[data-agent-disconnect]')).toHaveCount(0);
    await expect(hermes.locator('[data-agent-renew]')).toBeVisible();

    // An AI made before `via` existed says nothing about it.
    await expect(row(page, 'vieja').locator('[data-agent-via]')).toHaveCount(0);
    await shot(page, '01-conecta-tu-ia-desktop');
  });

  test('«Desconectar» asks, «No» leaves it, «Sí» calls the token’s revoke', async ({ page }) => {
    const stand = await stage(page);
    await open(page);
    const claude = row(page, 'claude');
    const button = claude.locator('[data-metric="panel-agentes-disconnect"]');
    await expect(button).toHaveAccessibleName('Desconectar a Claude de Pablo');
    await button.click();
    await expect(claude.locator('[data-agent-disconnect]')).toContainText(
      '¿Desconectar a Claude de Pablo? Se apaga y su conexión desde claude.ai deja de valer.',
    );
    await shot(page, '02-desconectar-pregunta');
    await claude.locator('[data-metric="panel-agentes-disconnect-no"]').click();
    expect(stand.calls.filter((call) => call.method === 'PATCH')).toEqual([]);

    await button.click();
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
    await expect(claude.locator('[data-agent-disconnect]')).toHaveCount(0);
    await expect(claude.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  test('who may not edit the AI gets no «Desconectar»', async ({ page }) => {
    await stage(page, [
      agent({ id: 'claude', name: 'Claude de Lucía', via: 'mcp:claude.ai', mayEdit: false }),
    ]);
    await open(page);
    await expect(row(page, 'claude').locator('[data-agent-via]')).toHaveText(
      'Conectada desde claude.ai',
    );
    await expect(row(page, 'claude').locator('[data-agent-disconnect]')).toHaveCount(0);
  });
});

for (const [name, size] of [
  ['phone 390', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test.describe(`Agentes — Conecta tu IA, ${name}`, () => {
    test.use({ viewport: size });

    test('the block, the rows and the confirmation fit and are axe clean', async ({ page }) => {
      await stage(page);
      await open(page);
      await expect(block(page)).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      let results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      await row(page, 'claude').locator('[data-metric="panel-agentes-disconnect"]').click();
      results = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(results.violations).toEqual([]);
      if (name.startsWith('phone')) await shot(page, '03-conecta-tu-ia-phone');
    });
  });
}
