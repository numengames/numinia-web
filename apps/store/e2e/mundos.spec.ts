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
import { randomBytes } from 'node:crypto';
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
async function fleetState(page: Page): Promise<{ ids: string[]; placed: Map<string, string> }> {
  const fleet = await page.request.get(`${origin}/api/admin/worlds`);
  expect(fleet.status()).toBe(200);
  const rows = ((await fleet.json()) as { rows: { id: string }[] }).rows;
  const homes = await page.request.get(`${origin}/api/admin/worlds/homes`);
  expect(homes.status()).toBe(200);
  const list = ((await homes.json()) as { homes: { worldId: string; accountId: string }[] }).homes;
  return {
    ids: rows.map((row) => row.id),
    placed: new Map(list.map((home) => [home.worldId, home.accountId])),
  };
}

const room = (prefix = '/es') => `${origin}${prefix}/lap/admin/worlds/`;
const venues = (org: string, prefix = '/es') => `${origin}${prefix}/panel/sedes/?org=${org}`;
const worldPage = (id: string, prefix = '/es') => `${origin}${prefix}/mundos/${id}/`;

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
    await dialog.getByRole('combobox').selectOption(NUMEN);
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
    await dialog.getByRole('combobox').selectOption(TARUGO);
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
    await card.locator('[data-metric="panel-venue-open"]').click();
    await expect(page).toHaveURL(worldPage(world));
    await expect(page.locator('[data-world-id]')).toHaveText(world);
    await expect(page.locator('[data-world-org]')).toHaveText('Numen Games');
    const manage = page.locator('[data-world-manage]');
    await expect(manage).toBeVisible();
    await expect(manage.getByRole('heading')).toHaveText('Administración');
    await expect(manage.locator('a[data-metric="world-page-venues"]')).toHaveAttribute(
      'href',
      `/es/panel/sedes/?org=${NUMEN}`,
    );
  });

  test('anyone opens the world page: the organization, and no Administración', async ({
    browser,
  }) => {
    const stranger = await browser.newContext();
    const page = await stranger.newPage();
    await page.goto(worldPage(world));
    await expect(page.locator('[data-world-org]')).toHaveText('Numen Games');
    await expect(page.locator('[data-world-manage]')).toHaveCount(0);
    // The same page in the other languages, and one a world never was.
    for (const [prefix, label] of [
      ['', 'Organization'],
      ['/ja', '組織'],
      ['/ko', '조직'],
      ['/pt-br', 'Organização'],
    ] as const) {
      await page.goto(worldPage(world, prefix));
      await expect(page.locator('[data-world-page] .etiqueta').first()).toHaveText(label);
    }
    await page.goto(worldPage('no-such-world'));
    await expect(page.locator('[data-world-missing]')).toBeVisible();
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
