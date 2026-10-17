/**
 * «Ajustes de la comunidad» and «Qué ha pasado» (cut 8) in a real browser
 * against the built site and the fixture desk. As in panel-dinero.spec.ts
 * this starts the built server a second time with throwaway secrets, mints a
 * session cookie with them, and lets the fixture desk answer: the plumbing
 * is the real one, the organizations are the seed's.
 *
 * What is under test: the three cards of /panel/ajustes/ (pieces, words, the
 * house's access as read-only text), what turning a piece off does to the
 * rail and to the page of the piece (the plain «apagada» page and its button),
 * the presets reaching the rail and the summary, a member who may only read,
 * and «Qué ha pasado»: thirty lines, «Ver más», and the house's reads under
 * its name.
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const ORACLE = `0x${'ab'.repeat(20)}`;
const OWNER = `0x${'cd'.repeat(20)}`;
const BUSY = `0x${'ee'.repeat(20)}`;
const FRESH = `0x${'11'.repeat(20)}`;
const MEMBER = '0x00000000000000000000000000000000000000d4';
const NUMEN = 'acc_team_numen_games';
const INSTITUTE = 'acc_team_active_inference';

let server: ChildProcess | undefined;
let origin = '';
let secret = '';
let stderr = '';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() =>
        resolve(typeof address === 'object' && address !== null ? address.port : 0),
      );
    });
  });
}

async function waitUntilAnswering(url: string): Promise<void> {
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    const answered = await fetch(url).then(
      (response) => response.text().then(() => true),
      () => false,
    );
    if (answered) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`the second server never answered at ${url}: ${stderr}`);
}

test.beforeAll(async () => {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  secret = randomBytes(32).toString('hex');
  server = spawn(
    process.execPath,
    [fileURLToPath(new URL('../dist/server/entry.mjs', import.meta.url))],
    {
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        DATA_SOURCE: 'fixture',
        AUTH_SESSION_SECRET: secret,
        THIRDWEB_SECRET_KEY: randomBytes(32).toString('hex'),
        ADMIN_WALLET_ADDRESSES: ORACLE,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  server.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  await waitUntilAnswering(`${origin}/api/auth/session`);
});

test.afterAll(async () => {
  const stopping = server;
  if (stopping === undefined) return;
  const gone = new Promise((resolve) => stopping.once('exit', resolve));
  stopping.kill();
  await gone;
});

async function signIn(context: BrowserContext, wallet: string, rank: 'oracle' | 'nomad') {
  const now = Math.floor(Date.now() / 1000);
  const value = await createSessionToken(
    { sub: wallet, rank, iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION },
    secret,
  );
  await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
}

const panel = (page: Page) => page.locator('[data-org-panel]');
const rail = (page: Page) => page.locator('[data-org-rail]');
const piece = (page: Page, id: string) => page.locator(`[data-settings-piece="${id}"]`);

async function ready(page: Page): Promise<void> {
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
}

async function openSettings(page: Page, org = NUMEN, path = '/es/panel/ajustes/'): Promise<void> {
  await page.goto(`${origin}${path}?org=${org}`);
  await ready(page);
  await expect(page.locator('[data-settings]')).toBeVisible();
}

test.describe('Ajustes', () => {
  test('shows the pieces, the words and the house’s access as the wireframe does', async ({
    page,
    context,
  }) => {
    await signIn(context, OWNER, 'nomad');
    await openSettings(page);
    await expect(page.locator('h1')).toHaveText('Ajustes');
    const cards = page.locator('.ajustes-tarjeta');
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(0)).toContainText('Piezas');
    await expect(cards.nth(1)).toContainText('Cómo se llama cada cosa');
    await expect(cards.nth(2)).toContainText('Acceso de la casa');
    await expect(cards.nth(3)).toContainText('Agente IA');
    // The eight screens that exist; summary and settings are always on, the other six have a switch.
    await expect(page.locator('[data-settings-piece]')).toHaveCount(8);
    for (const id of ['summary', 'settings']) {
      await expect(piece(page, id)).toContainText('Siempre encendida');
      await expect(piece(page, id).getByRole('switch')).toHaveCount(0);
    }
    for (const id of ['venues', 'members', 'gente', 'roles', 'agents', 'balance']) {
      await expect(piece(page, id)).toContainText('Encendida');
      await expect(piece(page, id).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
      await expect(piece(page, id).getByRole('switch')).toHaveAttribute(
        'data-metric',
        `panel-settings-piece-${id}`,
      );
    }
    // The house's access is text: the real switch is not built, so nothing here changes anything.
    const house = page.locator('[data-settings-house]');
    await expect(house).toContainText('La casa entra a ayudar con la comunidad y su sede');
    await expect(house).toContainText('sale en el registro, con nombre');
    await expect(house.getByRole('switch')).toHaveCount(0);
    await expect(house.getByRole('button')).toHaveCount(0);
    // The organization's built-in AI agent (Historia 1): read-only, cheapest model, a trial cap.
    const aiAgent = page.locator('[data-settings-ai-agent]');
    await expect(aiAgent).toHaveAttribute('data-ai-agent-enabled', 'true');
    await expect(aiAgent).toContainText('Agente IA: activo · gpt-5-nano · tope');
    await expect(aiAgent.locator('[data-ai-agent-line]')).toContainText(/1,50\s*US\$/);
    await expect(aiAgent.getByRole('switch')).toHaveCount(0);
    await expect(aiAgent.getByRole('button')).toHaveCount(0);
    // The rail has the new piece as a link, no longer «En construcción».
    await expect(rail(page).locator('a[data-metric="panel-nav-settings"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('turning a piece off takes it from the rail and the cards; its address says «apagada» and turns it on', async ({
    page,
    context,
  }) => {
    await signIn(context, OWNER, 'nomad');
    await openSettings(page);
    await piece(page, 'roles').getByRole('switch').click();
    await expect(page.locator('[data-settings-status]')).toHaveAttribute(
      'data-settings-status',
      'saved',
    );
    await expect(piece(page, 'roles')).toContainText('Apagada');
    await expect(rail(page).locator('[data-piece="roles"]')).toHaveCount(0);
    await expect(rail(page).locator('.etiqueta').first()).toHaveText('Piezas · 10');
    // It persists: another visit still has it off, on the summary too.
    await page.goto(`${origin}/es/panel/?org=${NUMEN}`);
    await ready(page);
    await expect(page.locator('[data-org-cards] [data-org-card="roles"]')).toHaveCount(0);
    // Its address is a plain page, not an error, and the owner can turn it on from there.
    await page.goto(`${origin}/es/panel/roles/?org=${NUMEN}`);
    await ready(page);
    const off = page.locator('[data-piece-off="roles"]');
    await expect(off).toContainText('Esta pieza está apagada');
    await expect(off).toContainText('«Roles» está apagada en esta comunidad.');
    await off.getByRole('button', { name: 'Encenderla' }).click();
    await expect(off).toHaveCount(0);
    await expect(rail(page).locator('[data-piece="roles"]')).toHaveCount(1);
    await expect(page.locator('[data-roles]').or(page.locator('[data-org-content]'))).toBeVisible();
  });

  test('the three presets change what the panel says — the rail and the summary — and nothing else', async ({
    page,
    context,
  }) => {
    await signIn(context, OWNER, 'nomad');
    await openSettings(page);
    const sede = rail(page).locator('a[data-metric="panel-nav-venues"]');
    await expect(sede).toHaveText('Sedes');
    const presets = page.locator('.gente-seg button');
    await expect(presets).toHaveText(['Sencillo', 'Mixto', 'Numinia']);
    await expect(presets.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await presets.nth(0).click();
    await expect(sede).toHaveText('Salas');
    await expect(rail(page).locator('[data-piece="gatherings"]')).toContainText('Reuniones');
    await expect(page.locator('[data-settings-now]')).toContainText(
      'Salas · Reuniones · Coordinación',
    );
    await expect(presets.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await page.goto(`${origin}/es/panel/?org=${NUMEN}`);
    await ready(page);
    await expect(page.locator('[data-org-you]')).toContainText('Coordinación');
    await expect(page.locator('[data-org-card="venues"]')).toContainText('Salas');
    // The back stays standard: the words changed, the address did not.
    await expect(rail(page).locator('a[data-metric="panel-nav-venues"]')).toHaveAttribute(
      'href',
      new RegExp(`/es/panel/sedes/\\?org=${NUMEN}$`),
    );
    await openSettings(page);
    await presets.nth(2).click();
    await expect(sede).toHaveText('Sedes');
    await expect(page.locator('[data-settings-now]')).toContainText(
      'Sedes · Rituales · Propietario',
    );
    await presets.nth(1).click();
    await expect(page.locator('[data-settings-now]')).toContainText('Sedes · Encuentros · Titular');
  });

  test('a member reads them but cannot change them: switches and presets are off, and it says why', async ({
    page,
    context,
  }) => {
    await signIn(context, MEMBER, 'nomad');
    await openSettings(page, INSTITUTE);
    await expect(page.locator('[data-settings-readonly]')).toContainText(
      'Solo quien administra la comunidad puede cambiar esto.',
    );
    for (const id of ['venues', 'members', 'gente', 'roles', 'agents', 'balance']) {
      await expect(piece(page, id).getByRole('switch')).toBeDisabled();
    }
    await expect(page.locator('.gente-seg button').first()).toBeDisabled();
  });

  test('a piece that is off, reached by a member, says so and who can turn it on', async ({
    page,
    context,
  }) => {
    await signIn(context, MEMBER, 'nomad');
    await page.route('**/api/saldo/settings?*', (route) =>
      route.fulfill({
        json: {
          settings: {
            ok: true,
            accountId: INSTITUTE,
            off: ['roles'],
            vocabulary: 'mixed',
            mayEdit: false,
            aiAgent: { enabled: true, model: 'gpt-5-nano', trialCapCents: 150 },
          },
        },
      }),
    );
    await page.goto(`${origin}/es/panel/roles/?org=${INSTITUTE}`);
    await ready(page);
    const off = page.locator('[data-piece-off="roles"]');
    await expect(off).toContainText('Quien administra la comunidad puede encenderla en Ajustes.');
    await expect(off.getByRole('button')).toHaveCount(0);
  });

  test('says no when the till refuses the change, and changes nothing on the screen', async ({
    page,
    context,
  }) => {
    await signIn(context, OWNER, 'nomad');
    await openSettings(page);
    await page.route('**/api/saldo/settings', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 403, json: { error: 'refused', problems: ['nope'] } })
        : route.fallback(),
    );
    await piece(page, 'balance').getByRole('switch').click();
    await expect(page.locator('[data-settings-status]')).toHaveAttribute(
      'data-settings-status',
      'failed',
    );
    await expect(page.locator('[data-settings-status]')).toContainText('No se ha podido guardar');
    await expect(piece(page, 'balance')).toContainText('Encendida');
    await expect(rail(page).locator('[data-piece="balance"]')).toHaveCount(1);
  });

  for (const [locale, name, title] of [
    ['', 'en', 'Settings'],
    ['/ja', 'ja', '設定'],
    ['/ko', 'ko', '설정'],
    ['/pt-br', 'pt-br', 'Configurações'],
  ] as const) {
    test(`speaks ${name}: the page, its three cards and the rail`, async ({ page, context }) => {
      await signIn(context, OWNER, 'nomad');
      await openSettings(page, NUMEN, `${locale}/panel/ajustes/`);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('.ajustes-tarjeta')).toHaveCount(4);
      await expect(rail(page).locator('a[data-metric="panel-nav-settings"]')).toHaveAttribute(
        'href',
        new RegExp(`^${locale}/panel/ajustes/`),
      );
    });
  }

  test('fits a 390-pixel phone and passes axe', async ({ page, context }) => {
    await signIn(context, OWNER, 'nomad');
    await page.setViewportSize({ width: 390, height: 800 });
    await openSettings(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('Qué ha pasado', () => {
  test('lists thirty lines, newest first, and «Ver más» brings the rest', async ({
    page,
    context,
  }) => {
    await signIn(context, BUSY, 'nomad');
    for (let i = 0; i < 31; i += 1) {
      const changed = await page.request.post(`${origin}/api/saldo/settings`, {
        data: { accountId: NUMEN, vocabulary: i % 2 === 0 ? 'simple' : 'numinia' },
      });
      expect(changed.ok()).toBe(true);
    }
    await page.goto(`${origin}/es/panel/?org=${NUMEN}`);
    await ready(page);
    const latest = page.locator('[data-summary-latest]');
    const rows = latest.locator('[data-happened-list] li');
    await expect(rows).toHaveCount(30);
    await expect(rows.first()).toContainText('Ajustes de la comunidad cambiados');
    const more = latest.getByRole('button', { name: 'Ver más' });
    await expect(more).toHaveAttribute('data-metric', 'panel-happened-more');
    await more.click();
    await expect(rows).toHaveCount(31);
    await expect(more).toHaveCount(0);
    // Times are the visitor's own zone: a <time> with the UTC instant stored.
    await expect(rows.first().locator('time')).toHaveAttribute('datetime', /\dZ$/);
  });

  test('shows the house’s reads as «La casa», with the name, and the house’s changes the same', async ({
    page,
    context,
  }) => {
    await signIn(context, ORACLE, 'oracle');
    await page.goto(`${origin}/es/panel/?org=${INSTITUTE}`);
    await ready(page);
    const rows = page.locator('[data-summary-latest] [data-happened-list] li');
    await expect(rows.first()).toContainText('La casa');
    await expect(page.locator('[data-happened-act="house-read"]').first()).toBeVisible();
    // The house acts too: its change is a line with its name on it.
    const changed = await page.request.post(`${origin}/api/saldo/settings`, {
      data: { accountId: INSTITUTE, vocabulary: 'mixed', off: ['balance'] },
    });
    expect(changed.ok()).toBe(true);
    await page.reload();
    await ready(page);
    await expect(page.locator('[data-happened-act="settings-changed"]').first()).toContainText(
      'La casa',
    );
  });

  test('says there is nothing yet when the log is empty, and says so when it cannot read it', async ({
    page,
    context,
  }) => {
    await signIn(context, FRESH, 'nomad');
    await page.goto(`${origin}/es/panel/?org=${NUMEN}`);
    await ready(page);
    await expect(page.locator('[data-happened-empty]')).toContainText(
      'Todavía no ha pasado nada que contar.',
    );
    await page.route('**/api/saldo/happened?*', (route) =>
      route.fulfill({ status: 502, json: { error: 'till-failed' } }),
    );
    await page.reload();
    await ready(page);
    const failed = page.locator('[data-happened-failed]');
    await expect(failed).toContainText('No se ha podido leer lo que ha pasado.');
    await expect(failed.getByRole('button', { name: 'Reintentar' })).toHaveAttribute(
      'data-metric',
      'panel-happened-retry',
    );
  });
});
