/**
 * «Mundos ↔ organizaciones» (cut 4) in a real browser against the built
 * site: the house assigns a world to an organization from the Worlds room
 * (one at a time and several at once), a member of that organization finds it
 * in the panel's «Sedes», anyone opens the world's own page — and only the
 * organization's people see its «Administración» block. Like
 * e2e/census-list.spec.ts it starts the built server a second time (a world's
 * page is rendered on demand), on a free port, with throwaway secrets, and
 * mints the cookies with the same secret; the fixture desk and the fixture
 * fleet are the data. Every test that writes uses worlds the others only read.
 */

import AxeBuilder from '@axe-core/playwright';
import { createHash, randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const HOUSE = `0x${'99'.repeat(20)}`;
const ADMIN = `0x${'ab'.repeat(20)}`;
const NUMEN = 'acc_team_numen_games';
const TARUGO = 'acc_team_la_tarugo';

/** The till account of a community: derived from its id, as the till and the store derive it. */
const communityAccount = (community: string): string =>
  `acc_t_${createHash('sha256').update(`numinia-till community ${community}`).digest('hex').slice(0, 32)}`;

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
        // The Oracles' allowlist: only the house's wallet.
        ADMIN_WALLET_ADDRESSES: HOUSE,
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

async function signIn(context: BrowserContext, wallet: string, rank: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const value = await createSessionToken(
    { sub: wallet, rank, iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION } as never,
    secret,
  );
  await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
}

/** The fleet's world ids and the placements, as the house reads them (the server is the truth). */
async function fleetState(
  page: Page,
): Promise<{ ids: string[]; placed: Map<string, string>; provisioned: Set<string> }> {
  const fleet = await page.request.get(`${origin}/api/admin/worlds`);
  expect(fleet.status()).toBe(200);
  const rows = ((await fleet.json()) as { rows: { id: string; order: unknown; status: string }[] })
    .rows;
  const homes = await page.request.get(`${origin}/api/admin/worlds/homes`);
  expect(homes.status()).toBe(200);
  const list = ((await homes.json()) as { homes: { worldId: string; accountId: string }[] }).homes;
  return {
    ids: rows.map((row) => row.id),
    placed: new Map(list.map((home) => [home.worldId, home.accountId])),
    provisioned: new Set(
      rows.filter((row) => row.order !== null && row.status !== 'changing').map((row) => row.id),
    ),
  };
}

const room = (prefix = '/es') => `${origin}${prefix}/lap/admin/worlds/`;
const venues = (org: string, prefix = '/es') => `${origin}${prefix}/panel/sedes/?org=${org}`;
const worldPage = (id: string, prefix = '/es') => `${origin}${prefix}/mundos/${id}/`;

/** A world's id as the screens read it: «agora-plaza» → «Agora Plaza». */
const asWords = (id: string): string =>
  id
    .split(/[-_]+/)
    .filter((word) => word !== '')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** Finite animations (the dialog's, the waiting moon's entrance) end before axe measures contrast. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('the house places worlds', () => {
  test.describe.configure({ mode: 'serial' });
  let world = '';
  let second = '';
  let third = '';

  test('assigns one world, and the row says whose it is', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    const state = await fleetState(page);
    const free = state.ids.filter((id) => !state.placed.has(id));
    expect(free.length).toBeGreaterThanOrEqual(3);
    [world, second, third] = [free[0] ?? '', free[1] ?? '', free[2] ?? ''];

    await page.goto(room());
    const home = page.locator(`[data-home-of="${world}"]`);
    await expect(home).toBeVisible();
    await expect(home).toContainText('Sin organización');
    await home.locator('[data-metric="worlds-assign"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toContainText('Asignar');
    await dialog.getByRole('combobox').selectOption('c:numen-games');
    await dialog.locator('[data-metric="worlds-assign-save"]').click();
    await expect(page.locator('[data-placed-note]')).toContainText('Numen Games');
    await expect(home.locator('[data-home-name]')).toHaveText('Numen Games');
    await expect(home).toHaveAttribute('data-placed', 'yes');
    // The row leads to the world's own page.
    await expect(home.locator('[data-metric="worlds-page-link"]')).toHaveAttribute(
      'href',
      `/es/mundos/${world}/`,
    );
  });

  test('assigns several chosen rows to one organization in one go', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(room());
    for (const id of [second, third]) {
      await page.locator(`[data-home-of="${id}"] input[type="checkbox"]`).check();
    }
    await expect(page.locator('[data-picked-count]')).toContainText('2 mundos elegidos');
    await page.locator('[data-metric="worlds-assign-chosen"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading')).toContainText('Asignar 2 mundos');
    await dialog.getByRole('combobox').selectOption(`t:${TARUGO}`);
    await dialog.locator('[data-metric="worlds-assign-save"]').click();
    await expect(page.locator('[data-placed-note]')).toContainText(
      '2 mundos asignados a La Tarugo',
    );
    for (const id of [second, third]) {
      await expect(page.locator(`[data-home-of="${id}"] [data-home-name]`)).toHaveText('La Tarugo');
    }
    // The choice is cleared once placed.
    await expect(page.locator('[data-picked-count]')).toHaveCount(0);
  });

  test('a member of the organization finds the world in Sedes and opens its page', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    await page.goto(venues(NUMEN));
    const card = page.locator(`[data-venue="${world}"]`);
    await expect(card).toBeVisible();
    await expect(page.locator('[data-venues-count]')).toContainText('sede');
    await expect(card.locator('[data-venue-enterers]')).toContainText(
      /Pued(e|en) entrar \d+ person/,
    );
    await card.locator('[data-metric="panel-venue-open"]').click();
    await expect(page).toHaveURL(worldPage(world));
    // The heading names the world, never its raw id (lib/world-index.ts).
    await expect(page.locator('[data-world-id]')).toHaveText(asWords(world));
    await expect(page.locator('[data-world-org]')).toHaveText('Numen Games');
    // «Quién entra»: read from the organization's roles, with the people who may.
    const enters = page.locator('[data-world-enters]');
    await expect(enters.getByRole('heading', { name: 'Quién entra' })).toBeVisible();
    await expect(enters.getByRole('heading', { name: 'Gente que puede entrar' })).toBeVisible();
    expect(await enters.locator('[data-world-person]').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-world-enter] [data-metric="world-enter"]')).toBeVisible();
    const manage = page.locator('[data-world-manage]');
    await expect(manage).toBeVisible();
    await expect(manage.getByRole('heading')).toHaveText('Administración');
    await expect(manage.locator('a[data-metric="world-page-venues"]')).toHaveAttribute(
      'href',
      `/es/panel/sedes/?org=${NUMEN}`,
    );
  });

  test('anyone opens the world page: its community, and no Administración', async ({ browser }) => {
    const stranger = await browser.newContext();
    const page = await stranger.newPage();
    await page.goto(worldPage(world));
    await expect(page.locator('[data-world-org]')).toHaveText('Numen Games');
    await expect(page.locator('[data-world-manage]')).toHaveCount(0);
    // Who may enter is for the people of the organization: a stranger is not shown the list.
    // Signed out, «Entrar» is the door, which comes back here.
    await expect(page.locator('[data-world-enter-door]')).toBeVisible();
    await expect(page.locator('[data-world-enters]')).toHaveCount(0);
    // The same page in the other languages: on screen the community is named, never «organización».
    for (const [prefix, label] of [
      ['', 'Who keeps it'],
      ['/ja', '管理者'],
      ['/ko', '관리하는 곳'],
      ['/pt-br', 'Quem cuida'],
    ] as const) {
      await page.goto(worldPage(world, prefix));
      await expect(page.locator('[data-world-fact="keeper"] .etiqueta')).toHaveText(label);
    }
    // A world the fleet does not have is a 404 in every language, not a page with a message.
    for (const prefix of ['', '/es', '/ja', '/ko', '/pt-br']) {
      const unknown = await page.request.get(`${origin}${prefix}/mundos/no-such-world/`);
      expect(unknown.status()).toBe(404);
    }
    const bad = await page.request.get(`${origin}/es/mundos/..%2Fx/`);
    expect(bad.status()).toBe(404);
    await stranger.close();
  });

  test('someone from another organization sees the page without its Administración', async ({
    page,
    context,
  }) => {
    // The admin of Numen Games is not in La Tarugo, where the second world is.
    await signIn(context, ADMIN, 'nomad');
    await page.goto(worldPage(second));
    await expect(page.locator('[data-world-org]')).toHaveText('La Tarugo');
    await expect(page.locator('[data-world-manage]')).toHaveCount(0);
    const refused = await page.request.get(`${origin}/api/mundos?org=${TARUGO}`);
    expect(refused.status()).toBe(403);
  });
});

test.describe('the «IA» section of a world’s page', () => {
  const KEY = `ed25519:${'Q'.repeat(43)}`;
  /** Optional: IA_SHOTS_DIR=<dir> keeps a picture of each state for a person to look at. */
  const shot = async (page: Page, name: string): Promise<void> => {
    const dir = process.env.IA_SHOTS_DIR;
    if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  };

  test('the people who manage a world invite an AI, see it arrive and remove it', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    await page.goto(worldPage('agora-plaza'));
    const section = page.locator('[data-world-ai]');
    await expect(section.getByRole('heading', { name: 'IA' })).toBeVisible();
    await expect(section.locator('[data-world-ai-empty]')).toContainText(
      'Este mundo aún no tiene IAs.',
    );
    await shot(page, '01-empty');

    await section.locator('[data-metric="ai-invite"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-metric="ai-invite-name"]').fill('Hermes Pablo');
    await dialog.locator('[data-metric="ai-invite-ability-build"]').check();
    await shot(page, '02-step-1');
    await dialog.locator('[data-metric="ai-invite-next"]').click();
    await expect(dialog.locator('[data-world-ai-command]')).toHaveText(
      'node tools/agente.ts nuevo hermes-pablo --nombre "Hermes Pablo"',
    );
    // The next step waits for a public key of the engine's own shape.
    await dialog.locator('[data-metric="ai-invite-key"]').fill('ed25519:corta');
    await expect(dialog.getByRole('alert')).toContainText('ed25519:');
    await expect(dialog.locator('[data-metric="ai-invite-next"]')).toBeDisabled();
    await shot(page, '03-step-2-bad-key');
    await dialog.locator('[data-metric="ai-invite-key"]').fill(KEY);
    await shot(page, '04-step-2');
    await dialog.locator('[data-metric="ai-invite-next"]').click();
    await shot(page, '05-step-3');
    await dialog.locator('[data-metric="ai-invite-add"]').click();
    await expect(dialog).toBeHidden();

    const row = section.locator('[data-world-ai-agent="hermes-pablo"]');
    await expect(row).toContainText('Hermes Pablo');
    await expect(row.locator('[data-world-ai-ability]')).toHaveText('Puede también construir');
    await expect(row.locator('[data-presence]')).toHaveAttribute('data-presence', 'waiting');
    await shot(page, '06-waiting');

    // Asking again for the same name is refused in plain words, before any call.
    await section.locator('[data-metric="ai-invite"]').click();
    await dialog.locator('[data-metric="ai-invite-name"]').fill('Hermes Pablo');
    await dialog.locator('[data-metric="ai-invite-next"]').click();
    await expect(dialog.getByText('Ya hay una IA con ese nombre')).toBeVisible();
    await shot(page, '07-name-taken');
    await dialog.locator('[data-metric="ai-invite-cancel"]').click();

    // Remove, with a confirmation that can be declined.
    await row.locator('[data-metric="ai-remove"]').click();
    await expect(row).toContainText('¿Quitar a Hermes Pablo?');
    await shot(page, '08-confirm');
    await row.locator('[data-metric="ai-remove-no"]').click();
    await expect(row).toBeVisible();
    await row.locator('[data-metric="ai-remove"]').click();
    await row.locator('[data-metric="ai-remove-yes"]').click();
    await expect(section.locator('[data-world-ai-agent]')).toHaveCount(0);
    await expect(section.locator('[data-world-ai-empty]')).toBeVisible();
  });

  test('fits a phone and is clean for axe, dialog included, in every language', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signIn(context, ADMIN, 'nomad');
    for (const [prefix, title, invite] of [
      ['/es', 'IA', 'Invitar a una IA'],
      ['', 'AI', 'Invite an AI'],
      ['/ja', 'AI', 'AIを招待する'],
      ['/ko', 'AI', 'AI 초대하기'],
      ['/pt-br', 'IA', 'Convidar uma IA'],
    ] as const) {
      await page.goto(worldPage('agora-plaza', prefix));
      const section = page.locator('[data-world-ai]');
      await expect(section.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await section.getByRole('button', { name: invite }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await settle(page);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      const dialog = page.locator('dialog[open]');
      expect(
        await dialog.evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(0);
      if (prefix === '/es') {
        await shot(page, '09-phone-dialog');
        const found = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(found.violations.map((v) => v.id)).toEqual([]);
      }
      await page.locator('[data-metric="ai-invite-cancel"]').click();
      if (prefix === '/es') {
        await settle(page);
        await shot(page, '10-phone-section');
        const found = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(found.violations.map((v) => v.id)).toEqual([]);
      }
    }
  });

  test('anyone else does not see the section at all', async ({ browser }) => {
    const stranger = await browser.newContext();
    const page = await stranger.newPage();
    await page.goto(worldPage('agora-plaza'));
    await expect(page.locator('[data-world-org]')).toHaveText('Numen Games');
    await expect(page.locator('[data-world-ai]')).toHaveCount(0);
    await expect(page.locator('[data-world-functions]')).toHaveCount(0);
    await stranger.close();
  });
});

test.describe('the «Funciones de este mundo» block of a world’s page', () => {
  const shot = async (page: Page, name: string): Promise<void> => {
    const dir = process.env.IA_SHOTS_DIR;
    if (dir) await page.screenshot({ path: `${dir}/funciones-${name}.png`, fullPage: true });
  };

  test('the people who manage a world switch what it offers, and see what the server fixes', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    await page.goto(worldPage('agora-plaza'));
    const section = page.locator('[data-world-functions]');
    await expect(section.getByRole('heading', { name: 'Funciones de este mundo' })).toBeVisible();
    const rows = section.locator('[data-world-function]');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveAttribute('data-world-function', 'puerta');
    await expect(rows.nth(0)).toContainText('Normas de entrada');
    await expect(rows.nth(0)).toContainText(
      'Términos de Numinia y normas de la comunidad: quien entra las acepta antes de moverse',
    );
    await expect(rows.nth(1)).toContainText('Dardos');
    await expect(rows.nth(2)).toContainText('Pesca');
    await shot(page, '01-read');

    const entry = section.getByRole('switch', { name: 'Normas de entrada' });
    await expect(entry).toBeChecked();
    const darts = section.getByRole('switch', { name: 'Dardos' });
    await expect(darts).toBeChecked();
    await darts.click();
    await expect(darts).not.toBeChecked();
    await expect(section.locator('[data-world-functions-notice="status"]')).toHaveText(
      'Dardos: apagada.',
    );
    await expect(section.locator('[data-world-function="dardos"]')).toHaveAttribute(
      'data-world-function-on',
      'off',
    );
    // The other switches did not move.
    await expect(entry).toBeChecked();
    await shot(page, '02-darts-off');
    await darts.click();
    await expect(darts).toBeChecked();
    await expect(section.locator('[data-world-functions-notice]')).toHaveText('Dardos: encendida.');

    // Fishing is fixed by the server: off, disabled, and it says so.
    const fishing = section.getByRole('switch', { name: 'Pesca' });
    await expect(fishing).toBeDisabled();
    await expect(fishing).not.toBeChecked();
    await expect(section.locator('[data-world-function="pesca"]')).toContainText(
      'Lo fija el servidor',
    );
    await shot(page, '03-fixed');
  });

  test('a world without the door says so in one line and the rest of the page works', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    await page.goto(`${worldPage('agora-plaza')}?motor=viejo`);
    const section = page.locator('[data-world-functions]');
    await expect(section).toHaveAttribute('data-world-functions', 'unsupported');
    await expect(section).toContainText(
      'Este mundo aún no permite cambiarlo desde aquí (necesita el motor 0.4x o más)',
    );
    await expect(section.getByRole('switch')).toHaveCount(0);
    await shot(page, '04-old-engine');
    // The «IA» section, same door, keeps working.
    await expect(page.locator('[data-world-ai]')).toHaveAttribute('data-world-ai', 'ready');
  });

  test('fits a phone and is clean for axe, in every language', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signIn(context, ADMIN, 'nomad');
    for (const [prefix, title, entry] of [
      ['/es', 'Funciones de este mundo', 'Normas de entrada'],
      ['', 'Features of this world', 'Conditions of entry'],
      ['/ja', 'このワールドの機能', '入場ルール'],
      ['/ko', '이 월드의 기능', '입장 규칙'],
      ['/pt-br', 'Funções deste mundo', 'Normas de entrada'],
    ] as const) {
      await page.goto(worldPage('agora-plaza', prefix));
      const section = page.locator('[data-world-functions]');
      await expect(section.getByRole('heading', { name: title })).toBeVisible();
      await expect(section.getByRole('switch', { name: entry })).toBeVisible();
      await settle(page);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      if (prefix === '/es') {
        await shot(page, '05-phone');
        const found = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(found.violations.map((v) => v.id)).toEqual([]);
      }
    }
  });
});

test.describe('each machine’s recipe, as the machine says', () => {
  test('the room reports it and hands out no fixed recipe: one last line only where it is needed', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(room());
    const machine = (alias: string) => page.locator(`[data-machine="${alias}"]`);
    // open-1 follows main by itself, up to date, and tries each recipe first.
    await expect(machine('open-1')).toHaveAttribute('data-recipe', 'current');
    await expect(machine('open-1')).toHaveAttribute('data-canary', 'yes');
    await expect(machine('open-1')).toContainText('Se actualiza sola · al día.');
    await expect(machine('open-1')).toContainText('Máquina de prueba (canario)');
    await expect(machine('open-1').locator('.linea-copiar')).toHaveCount(0);
    // bronte-xs-ca-003 saw a newer recipe on main and waits for its rest: nothing to copy.
    await expect(machine('bronte-xs-ca-003')).toHaveAttribute('data-recipe', 'resting');
    await expect(machine('bronte-xs-ca-003')).toContainText('esperando reposo');
    await expect(machine('bronte-xs-ca-003').locator('.linea-copiar')).toHaveCount(0);
    // open-2 does not update itself yet: one notice, and the last line, from main.
    await expect(machine('open-2')).toHaveAttribute('data-recipe', 'manual');
    await expect(machine('open-2')).toContainText('necesita una última instalación');
    await expect(machine('open-2').locator('.linea-copiar pre')).toHaveText(
      'curl -fsSL https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds/machine/bootstrap.sh | sudo bash -s -- "$(cat /etc/fleet/alias)"',
    );
    // A machine whose door does not answer gets the line that installs main, with the wallet.
    await expect(machine('open-3').locator('.linea-copiar pre')).toHaveText(
      `curl -fsSL https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds/machine/bootstrap.sh | sudo bash -s -- open-3 ${HOUSE}`,
    );
    // No machine is told it runs «an older recipe», and no line names a fixed commit.
    await expect(page.locator('[data-worlds-panel]')).not.toContainText('receta anterior');
    for (const line of await page.locator('.linea-copiar pre').allTextContents()) {
      expect(line).not.toContain('FLEET_REF');
      expect(line).toContain('/numinia-assets/main/');
    }
  });
});

test.describe('only the house places', () => {
  test('a person who is not the house cannot read or write placements', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    expect((await page.request.get(`${origin}/api/admin/worlds/homes`)).status()).toBe(403);
    const place = await page.request.post(`${origin}/api/admin/worlds/place`, {
      data: { worldIds: ['agora-plaza'], accountId: NUMEN },
    });
    expect(place.status()).toBe(403);
    await page.goto(room());
    await expect(page.locator('[data-home-of]')).toHaveCount(0);
  });
});

test.describe('a community is an organization', () => {
  test.describe.configure({ mode: 'serial' });

  test('the dialog lists the register’s communities first, then the till’s other organizations', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    const register = await page.request.get(`${origin}/api/admin/communities`);
    expect(register.status()).toBe(200);
    const { communities } = (await register.json()) as { communities: { id: string }[] };
    expect(communities.length).toBeGreaterThanOrEqual(14);

    await page.goto(room());
    await page.locator('[data-metric="worlds-assign"]').first().click();
    const dialog = page.getByRole('dialog');
    const select = dialog.getByRole('combobox');
    await expect(select).toBeVisible();
    const first = select.locator('optgroup[label="Comunidades"] option');
    await expect(first).toHaveCount(communities.length);
    await expect(first.filter({ hasText: 'MERGE' })).toHaveCount(1);
    await expect(select.locator('optgroup[label="Otras"] option')).toContainText(['La Tarugo']);
    // Numen Games is a community the till already has: it is listed once, not twice.
    await expect(select.locator('option', { hasText: 'Numen Games' })).toHaveCount(1);
    // The empty message belongs to an empty register, which this is not.
    await expect(dialog.locator('[data-request="PlaceWorlds"]')).not.toContainText(
      'No hay organizaciones',
    );
    // A community the till already has needs nothing opened; one it does not have says so.
    await select.selectOption('c:numen-games');
    await expect(dialog.locator('[data-opens-home]')).toHaveCount(0);
    await select.selectOption('t:acc_team_la_tarugo');
    await expect(dialog.locator('[data-opens-home]')).toHaveCount(0);
    await select.selectOption('c:merge');
    await expect(dialog.locator('[data-opens-home]')).toHaveCount(1);
  });

  test('assigning to a community with no account has the house open it on save', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    const state = await fleetState(page);
    const free = state.ids.filter((id) => !state.placed.has(id));
    expect(free.length).toBeGreaterThanOrEqual(2);
    const [world, other] = [free[0] ?? '', free[1] ?? ''];

    await page.goto(room());
    const row = page.locator(`[data-home-of="${world}"]`);
    await row.locator('[data-metric="worlds-assign"]').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').selectOption('c:merge');
    await expect(dialog.locator('[data-opens-home]')).toHaveText(
      'Se abre la sede de la comunidad al asignar.',
    );
    await dialog.locator('[data-metric="worlds-assign-save"]').click();
    await expect(page.locator('[data-placed-note]')).toContainText('MERGE');
    await expect(row.locator('[data-home-name]')).toHaveText('MERGE');
    const homes = await page.request.get(`${origin}/api/admin/worlds/homes`);
    const placed = ((await homes.json()) as { homes: { worldId: string; accountId: string }[] })
      .homes;
    expect(placed.find((home) => home.worldId === world)?.accountId).toBe(
      communityAccount('merge'),
    );

    // The house has used it: the next time there is nothing left to open.
    await page.locator(`[data-home-of="${other}"] [data-metric="worlds-assign"]`).click();
    await page.getByRole('dialog').getByRole('combobox').selectOption('c:merge');
    await expect(page.getByRole('dialog').locator('[data-opens-home]')).toHaveCount(0);
    await page.getByRole('dialog').locator('[data-metric="worlds-assign-save"]').click();
    await expect(page.locator('[data-placed-note]')).toContainText('MERGE');
    await expect(page.locator(`[data-home-of="${other}"] [data-home-name]`)).toHaveText('MERGE');
  });

  test('only the house opens a community’s organization, and asking twice finds the same one', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    expect((await page.request.get(`${origin}/api/admin/communities`)).status()).toBe(403);
    const refused = await page.request.post(`${origin}/api/admin/community-team`, {
      data: { community: 'reset' },
    });
    expect(refused.status()).toBe(403);

    await context.clearCookies();
    await signIn(context, HOUSE, 'oracle');
    const ask = (community: string) =>
      page.request.post(`${origin}/api/admin/community-team`, { data: { community } });
    const one = await ask('reset');
    expect(one.status()).toBe(200);
    expect(await one.json()).toEqual({
      ok: true,
      account: { id: communityAccount('reset'), name: 'R3S3T' },
    });
    expect(await (await ask('reset')).json()).toEqual(await one.json());
    expect((await ask('no-such-community')).status()).toBe(404);
  });
});

test.describe('the house is an administrator of every community', () => {
  test.describe.configure({ mode: 'serial' });

  test('only the house opens them all', async ({ page, context }) => {
    await signIn(context, ADMIN, 'nomad');
    const refused = await page.request.post(`${origin}/api/admin/community-team`, {
      data: { all: true },
    });
    expect(refused.status()).toBe(403);
  });

  test('«Abrir todas las comunidades» opens them, says how many, and can be pressed again', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    const register = await page.request.get(`${origin}/api/admin/communities`);
    const { communities } = (await register.json()) as { communities: { id: string }[] };

    await page.goto(room());
    const button = page.locator('[data-metric="worlds-open-all-communities"]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Abrir todas las comunidades');
    await expect(button).toHaveAttribute('title', /administradora/);
    await button.click();
    const note = page.locator('[data-opened-all]');
    await expect(note).toHaveText(`${communities.length} comunidades abiertas`);
    await button.click();
    await expect(note).toHaveText(`${communities.length} comunidades abiertas`);

    // The house is a member with the administrator role, and the roles carry the default colours.
    const asked = await page.request.get(
      `${origin}/api/saldo/roles?cuenta=${communityAccount('merge')}`,
    );
    expect(asked.status()).toBe(200);
    const view = (
      (await asked.json()) as {
        roles: {
          roles: { name: string; color: string | null }[];
          members: { wallet: string; owner: boolean; roleIds: string[] }[];
        };
      }
    ).roles;
    expect(view.members.map((member) => member.wallet)).toEqual([HOUSE]);
    expect(view.members[0]?.roleIds).toHaveLength(1);
    expect(view.roles.map((role) => role.color)).toEqual(['#d98324', '#2f7fa8', '#3d8b5f', null]);
  });

  test('in Numen Games the administrators are the Oráculos', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.request.post(`${origin}/api/admin/community-team`, { data: { all: true } });
    const asked = await page.request.get(
      `${origin}/api/saldo/roles?cuenta=${communityAccount('numen-games')}`,
    );
    const view = (
      (await asked.json()) as { roles: { roles: { name: string; color: string | null }[] } }
    ).roles;
    expect(view.roles[0]).toMatchObject({ name: 'Oráculos', color: '#d98324' });
  });
});

test.describe('Sedes says what it has', () => {
  const org = NUMEN;
  const answer = (page: Page, status: number, json: object): Promise<void> =>
    page.route('**/api/mundos?org=*', (route) => route.fulfill({ status, json }));

  test('an organization with no worlds gets the usual empty state', async ({ page, context }) => {
    await signIn(context, ADMIN, 'nomad');
    await answer(page, 200, { worlds: [] });
    await page.goto(venues(org));
    await expect(page.locator('[data-venues-empty]')).toContainText('todavía no tiene sedes');
    await expect(page.locator('[data-venue]')).toHaveCount(0);
  });

  test('a refusal and a failure each say so, and a failure can be retried', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    await answer(page, 403, {});
    await page.goto(venues(org));
    await expect(page.locator('[data-venues-forbidden]')).toBeVisible();
    await page.unroute('**/api/mundos?org=*');
    await answer(page, 500, {});
    await page.goto(venues(org));
    await expect(page.locator('[data-venues-failed]')).toBeVisible();
    await page.unroute('**/api/mundos?org=*');
    await answer(page, 200, { worlds: [{ worldId: 'x-world', accountId: org }] });
    await page.locator('[data-metric="panel-venues-retry"]').click();
    await expect(page.locator('[data-venue="x-world"]')).toBeVisible();
  });
});

test.describe('fit and finish', () => {
  test('the three screens fit a phone of 390 without sideways scrolling', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(context, HOUSE, 'oracle');
    await page.goto(room());
    await expect(page.locator('[data-home-of]').first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.goto(venues(NUMEN));
    await expect(page.locator('[data-venue]').first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.goto(worldPage('agora-plaza'));
    await expect(page.locator('[data-world-org]')).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('the three screens are clean for axe, in Spanish and in English', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    for (const prefix of ['/es', '']) {
      await page.goto(room(prefix));
      await expect(page.locator('[data-home-of]').first()).toBeVisible();
      await settle(page);
      // What this cut adds to the room (its machines' bootstrap block is not its own).
      const placeBar = await new AxeBuilder({ page })
        .include('[data-place-bar]')
        .include('[data-home-of]')
        .analyze();
      expect(placeBar.violations).toEqual([]);

      await page.goto(venues(NUMEN, prefix));
      await expect(page.locator('[data-venue]').first()).toBeVisible();
      await settle(page);
      const sedes = await new AxeBuilder({ page }).include('[data-org-panel]').analyze();
      expect(sedes.violations).toEqual([]);

      await page.goto(worldPage('agora-plaza', prefix));
      await expect(page.locator('[data-world-org]')).toBeVisible();
      await settle(page);
      const mundo = await new AxeBuilder({ page }).include('[data-world-page]').analyze();
      expect(mundo.violations).toEqual([]);
    }
  });

  test('the place dialog is clean for axe too', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(room());
    await page.locator('[data-metric="worlds-assign"]').first().click();
    await expect(page.getByRole('dialog').getByRole('combobox')).toBeVisible();
    await settle(page);
    const axe = await new AxeBuilder({ page }).include('dialog[open]').analyze();
    expect(axe.violations).toEqual([]);
  });
});

test.describe('the world’s page as the wireframe draws it (cut K)', () => {
  test('a stranger: the hero with the door as «Entrar», the facts, no «Gestionarlo», the machine, the community', async ({
    browser,
  }) => {
    const stranger = await browser.newContext();
    const page = await stranger.newPage();
    await page.goto(worldPage('agora-plaza'));
    // The hero: the name over the cover, «Entrar» signed out is the door that comes back here.
    const hero = page.locator('[data-world-hero]');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.mh-nombre')).toHaveText('Agora Plaza');
    const door = hero.locator('[data-world-enter-door]');
    await expect(door).toBeVisible();
    await expect(door).toHaveText(/Entrar/);
    await expect(door).toHaveAttribute(
      'href',
      `/es/lap/session/?vuelta=${encodeURIComponent('/es/mundos/agora-plaza/')}`,
    );
    await expect(hero).toContainText('Entras con tu nombre y tu avatar');
    // The fixture's worlds say nobody: no pill, no «Dentro ahora», no invented capacity.
    await expect(hero.locator('[data-world-inside]')).toHaveCount(0);
    await expect(page.locator('[data-world-fact="inside"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/\d+ de \d+/);
    // The chips as the card paints them, the title, the lead with its community linked.
    await expect(page.locator('[data-world-state="on"]')).toHaveText(/Encendido/);
    await expect(page.locator('[data-world-chips] .chip.ambar')).toHaveText('De la ciudad');
    await expect(page.locator('h1[data-world-id]')).toHaveText('Agora Plaza');
    const lead = page.locator('[data-world-lead]');
    await expect(lead).toContainText('Es de todos; lo cuida Numen Games.');
    await expect(lead.locator('a')).toHaveAttribute('href', '/es/communities/numen-games/');
    // The facts: who keeps it (linked), who goes in (the guest line for a stranger).
    await expect(page.locator('[data-world-fact="keeper"] [data-world-org]')).toHaveText(
      'Numen Games',
    );
    await expect(page.locator('[data-world-fact="enters"] dd')).toHaveText('Entras como invitado');
    // «Gestionarlo» is for the community's people alone.
    await expect(page.locator('[data-world-share]')).toBeVisible();
    await expect(page.locator('[data-world-manage-act]')).toHaveCount(0);
    await expect(page.locator('[data-world-manage]')).toHaveCount(0);
    // «Su máquina»: the fleet names the machine and nothing else — one line, as words.
    await expect(page.locator('[data-world-machine-name]')).toHaveText('Corre en Open 1');
    await expect(page.locator('body')).not.toContainText(/estimado|EJEMPLO|ping/i);
    // The community's card at the end.
    const community = page.locator('[data-world-community]');
    await expect(community).toHaveAttribute('href', '/es/communities/numen-games/');
    await expect(community).toContainText('Numen Games');
    await expect(community).toContainText('Lo cuida para la ciudad');
    await stranger.close();
  });

  test('«Encuentros aquí» with none says so and leads to the community’s calendar', async ({
    browser,
  }) => {
    const stranger = await browser.newContext();
    const page = await stranger.newPage();
    await page.goto(worldPage('agora-plaza'));
    const none = page.locator('[data-world-encounters-none]');
    await expect(none).toContainText('Ningún encuentro anunciado aquí todavía.');
    await expect(none.locator('a')).toHaveAttribute(
      'href',
      '/es/communities/numen-games/#encuentros',
    );
    await expect(page.locator('[data-world-encounter]')).toHaveCount(0);
    await stranger.close();
  });

  test('«Compartir» copies the link and says so', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    await page.goto(worldPage('agora-plaza'));
    await page.locator('[data-world-share]').click();
    await expect(page.locator('[data-world-toast]')).toHaveText('Enlace copiado');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/\/es\/mundos\/agora-plaza\/$/);
    await context.close();
  });

  test('signed in: «Entrar» is the pass flow in the hero; one of the community: «Gestionarlo» and «Quién entra»', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    await page.goto(worldPage('agora-plaza'));
    const hero = page.locator('[data-world-hero]');
    const enter = hero.locator('[data-world-enter-slot] [data-metric="world-enter"]');
    await expect(enter).toBeVisible();
    await expect(enter).toHaveText('Entrar');
    await expect(hero.locator('[data-world-enter-door]')).toBeHidden();
    // Only one primary button on the screen.
    await expect(page.locator('main .btn-primario:visible')).toHaveCount(1);
    // «Quién entra»: the organization's rule, read from the till, replaces the guest line.
    await expect(page.locator('[data-world-fact="enters"] [data-world-enters-rule]')).toHaveText(
      /Entra cualquier persona de la comunidad|Los titulares entran siempre|\S+/,
    );
    await expect(page.locator('[data-world-fact="enters"] dd')).not.toHaveText(
      'Entras como invitado',
    );
    // «Gestionarlo» reveals the «Administración» block.
    const act = page.locator('[data-world-manage-act]');
    await expect(act).toBeVisible();
    await expect(act).toHaveText('Gestionarlo');
    await act.click();
    await expect(page.locator('[data-world-manage]')).toBeInViewport();
    await expect(page.locator('[data-world-manage] h2')).toHaveText('Administración');
  });

  test('clean for axe, in night and day, and fits a 390 px phone', async ({ browser }) => {
    for (const colorScheme of ['dark', 'light'] as const) {
      const stranger = await browser.newContext({ colorScheme });
      const page = await stranger.newPage();
      await page.goto(worldPage('agora-plaza'));
      await expect(page.locator('[data-world-org]')).toBeVisible();
      await settle(page);
      const axe = await new AxeBuilder({ page })
        .include('[data-world-hero]')
        .include('.mundo-cabeza')
        .include('[data-world-facts]')
        .include('.mundo-dos')
        .analyze();
      expect(axe.violations).toEqual([]);
      await stranger.close();
    }
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await phone.newPage();
    await page.goto(worldPage('agora-plaza'));
    await expect(page.locator('[data-world-hero]')).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await phone.close();
  });
});

test.describe('t_a856c570: the house renames an existing world, and it persists', () => {
  test.describe.configure({ mode: 'serial' });
  let world = '';

  test('renames a world from its card, and the new name shows at once', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    const state = await fleetState(page);
    // A rename does not care whether a world is already assigned to an
    // organization — only that it exists and has a steady machine, so the
    // card shows the button. Any provisioned world but the one other tests
    // name by id directly (agora-plaza) does. Run last so its state changes
    // cannot affect any of the room's other, unrelated tests.
    const steady = state.ids.filter((id) => id !== 'agora-plaza' && state.provisioned.has(id));
    expect(steady.length).toBeGreaterThanOrEqual(1);
    world = steady[0] ?? '';

    await page.goto(room());
    const renameButton = page.locator(`[data-rename-for="${world}"]`);
    await expect(renameButton).toBeVisible();
    await renameButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toContainText('nombre');
    await dialog.locator('#mundos-rename').fill('La Reserva Nueva');
    await dialog.locator('[data-metric="worlds-rename-save"]').click();
    await expect(page.locator('[data-renamed-note]')).toHaveText('Nombre guardado.');
    await expect(page.locator(`[data-world="${world}"] h3`)).toHaveText('La Reserva Nueva');
  });

  test('the new name survives a reload', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(room());
    await expect(page.locator(`[data-world="${world}"] h3`)).toHaveText('La Reserva Nueva');
    await page.reload();
    await expect(page.locator(`[data-world="${world}"] h3`)).toHaveText('La Reserva Nueva');
    // The till itself, not just the screen: what the room reads on a fresh load.
    const homesAfterReload = await page.request.get(`${origin}/api/admin/worlds/homes`);
    expect(homesAfterReload.status()).toBe(200);
    const { names: list } = (await homesAfterReload.json()) as {
      names: { worldId: string; name: string }[];
    };
    expect(list.find((entry) => entry.worldId === world)?.name).toBe('La Reserva Nueva');
  });

  test('only the house renames, and a body out of shape is refused', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    await context.clearCookies();
    await signIn(context, ADMIN, 'nomad');
    const refused = await page.request.post(`${origin}/api/admin/worlds/rename`, {
      data: { worldId: world, name: 'Should not land' },
    });
    expect(refused.status()).toBe(403);

    await context.clearCookies();
    await signIn(context, HOUSE, 'oracle');
    const bad = await page.request.post(`${origin}/api/admin/worlds/rename`, {
      data: { worldId: world, name: '' },
    });
    expect(bad.status()).toBe(400);
    // Still the renamed name: the refused attempt wrote nothing.
    await page.goto(room());
    await expect(page.locator(`[data-world="${world}"] h3`)).toHaveText('La Reserva Nueva');
  });
});
