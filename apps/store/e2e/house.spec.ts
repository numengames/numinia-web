/**
 * «La casa entra» (QA 2026-10-15) in a real browser against the built site:
 * an Oracle's session sees every organization in the panel's Miembros and
 * enters the ones it is not in as the house — with the strip «Entras como
 * la casa» — while a citizen's session sees only its own and cannot enter
 * another by asking for it, whatever it sends. The ranks of Miembros
 * (/api/saldo/ranks) are read here for real: the allowlist's Oracle, and
 * everyone else a Nomad (this server has no census).
 *
 * The e2e server of playwright.config.ts has no auth secrets (the other specs
 * play the till's answers with `page.route`), and this one tests the real
 * plumbing: the session cookie, the rank read from it, the flag sent to the
 * desk and the desk's own answers. So it starts the built server a second
 * time, on a free port, with throwaway secrets, and mints the cookies with
 * the same secret. `DATA_SOURCE` is frozen into the build as `fixture`, so
 * /api/saldo is answered by the fixture desk (lib/accounts-fixture.ts).
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const ORACLE = `0x${'ab'.repeat(20)}`;
const CITIZEN = `0x${'cd'.repeat(20)}`;
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';
const INSTITUTE = 'acc_team_active_inference';
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
  // Throwaway secrets, made here and never written down.
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

/** A session the server itself signed: the rank is in the cookie, as at sign-in. */
async function signIn(context: BrowserContext, wallet: string, rank: 'oracle' | 'nomad') {
  const now = Math.floor(Date.now() / 1000);
  const value = await createSessionToken(
    { sub: wallet, rank, iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION },
    secret,
  );
  await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
}

test('without a session Miembros asks you to sign in, and the API says nobody', async ({
  page,
}) => {
  await page.goto(`${origin}/es/panel/miembros/`);
  await expect(page.locator('[data-org-signed-out]')).toBeVisible();
  const overview = await page.request.get(`${origin}/api/saldo`);
  expect(overview.status()).toBe(401);
  const entering = await page.request.get(`${origin}/api/saldo/roles?cuenta=${TARUGO}&house=true`);
  expect(entering.status()).toBe(401);
  const ranks = await page.request.get(`${origin}/api/saldo/ranks?cuenta=${TARUGO}`);
  expect(ranks.status()).toBe(401);
});

test('an Oracle sees four organizations in Miembros and enters the others as the house', async ({
  page,
  context,
}) => {
  await signIn(context, ORACLE, 'oracle');
  await page.goto(`${origin}/es/panel/miembros/`);

  // Its own organization first, then the others by name (Reset holds two worlds in the fixture).
  const switcher = page.getByLabel('Panel de');
  await expect(switcher.locator('option')).toHaveText([
    'Numen Games',
    'Active Inference Institute',
    'La Tarugo',
    'Reset',
  ]);
  await expect(page.locator(`[data-person="${ORACLE}"]`)).toBeVisible();
  await expect(page.locator('[data-panel-house]')).toHaveCount(0);
  // Its rank in the city, read by the server: the allowlist says Oracle.
  await expect(page.locator(`[data-person="${ORACLE}"] [data-rank]`)).toHaveText('Oráculo');

  // Each of the others: the strip, and the people of an organization it is not in.
  for (const name of ['Active Inference Institute', 'La Tarugo']) {
    await switcher.selectOption({ label: name });
    await expect(page.locator('[data-panel-house]')).toContainText('Entras como la casa');
    await expect(page.locator('[data-person]').first()).toBeVisible();
    await expect(page.locator(`[data-person="${ORACLE}"]`)).toHaveCount(0);
  }
  // La Tarugo's people: no census on this server, so each is a Nomad.
  await expect(page.locator('[data-person] [data-rank]')).toHaveText(['Nómada', 'Nómada']);
  const ranks = await page.request.get(`${origin}/api/saldo/ranks?cuenta=${TARUGO}`);
  expect(ranks.status()).toBe(200);
  expect(ranks.headers()['cache-control']).toBe('private, max-age=300');
  expect(await ranks.json()).toEqual({
    ok: true,
    ranks: {
      '0x00000000000000000000000000000000000000e5': 'nomad',
      '0x00000000000000000000000000000000000000f6': 'nomad',
    },
  });

  // Everything the house reads is written down, and it can read that.
  await page.locator('[data-metric="panel-log-toggle"]').click();
  await expect(page.locator('[data-panel-log] li').first()).toContainText('La casa ha mirado');

  // Its roles too, with the owners apart.
  await page.locator('a[data-metric="panel-nav-roles"]').click();
  await expect(page.locator('[data-panel-house]')).toContainText('Entras como la casa');
  await expect(page.locator('[data-roles-list] [data-role]').first()).toBeVisible();

  // Back in its own, the strip is gone.
  await page.getByLabel('Panel de').selectOption({ label: 'Numen Games' });
  await expect(page.locator('[data-roles-list] [data-role]').first()).toBeVisible();
  await expect(page.locator('[data-panel-house]')).toHaveCount(0);
});

test('the Balance tab lists them too, and shows the statement of one the Oracle enters', async ({
  page,
  context,
}) => {
  await signIn(context, ORACLE, 'oracle');
  await page.goto(`${origin}/es/saldo/`);
  const picker = page.locator('#saldo-cuenta');
  await expect(picker).toBeVisible();
  const options = await picker.locator('option').allTextContents();
  expect(options).toHaveLength(5);
  expect(options.join(' | ')).toContain('Active Inference Institute');
  expect(options.join(' | ')).toContain('La Tarugo');

  const statement = page.waitForResponse(
    (response) =>
      response.url().includes('/api/saldo/statement') && response.url().includes(INSTITUTE),
  );
  await picker.selectOption(INSTITUTE);
  expect((await statement).status()).toBe(200);
});

test('a citizen sees only its own organization and cannot enter another by asking for it', async ({
  page,
  context,
}) => {
  await signIn(context, CITIZEN, 'nomad');
  await page.goto(`${origin}/es/panel/miembros/`);
  await expect(page.locator(`[data-person="${CITIZEN}"] [data-owner-chip]`)).toBeVisible();
  // One organization: no switcher, no strip of the house.
  await expect(page.locator('#org-switch')).toHaveCount(0);
  await expect(page.locator('[data-panel-house]')).toHaveCount(0);

  const overview = await page.request.get(`${origin}/api/saldo`);
  const { accounts } = (await overview.json()) as { accounts: { name: string | null }[] };
  expect(accounts.map((account) => account.name)).toEqual([null, 'Numen Games']);
  expect(JSON.stringify(accounts)).not.toContain('house');

  // Another organization, with every claim a browser could add: the till’s refusal, always.
  for (const query of [
    `cuenta=${TARUGO}`,
    `cuenta=${TARUGO}&house=true`,
    `house=1&cuenta=${TARUGO}`,
  ]) {
    for (const path of ['roles', 'log', 'statement', 'ranks']) {
      const reply = await page.request.get(`${origin}/api/saldo/${path}?${query}`);
      expect(reply.status()).toBe(403);
      expect(await reply.json()).toEqual({ error: 'refused', problems: ['not a member'] });
    }
  }
  // The personal account has no people to rank.
  const personal = await page.request.get(`${origin}/api/saldo/ranks?cuenta=acc_personal`);
  expect(personal.status()).toBe(404);
  const rename = { action: 'rename', accountId: TARUGO, name: 'Mine' };
  const refused = await page.request.post(`${origin}/api/saldo`, { data: rename });
  expect(await refused.json()).toEqual({ result: { ok: false, problems: ['not a member'] } });
  // A body that says it is the house is not read: it is refused before the desk sees it.
  const claimed = await page.request.post(`${origin}/api/saldo`, {
    data: { ...rename, house: true },
  });
  expect(claimed.status()).toBe(400);
  // And a rank the cookie does not carry cannot be added to it.
  const roles = await page.request.get(`${origin}/api/saldo/roles?cuenta=${NUMEN}`);
  expect(roles.status()).toBe(200);
  expect(((await roles.json()) as { roles: { as: string } }).roles.as).toBe('owner');
});

test('a forged or foreign cookie is no session, Oracle or not', async ({ page, context }) => {
  const now = Math.floor(Date.now() / 1000);
  const foreign = await createSessionToken(
    { sub: ORACLE, rank: 'oracle', iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION },
    randomBytes(32).toString('hex'),
  );
  await context.addCookies([{ name: 'numinia_session', value: foreign, url: origin }]);
  const reply = await page.request.get(`${origin}/api/saldo`);
  expect(reply.status()).toBe(401);
});

test('Miembros and Roles are accessible as the house, on a phone too', async ({
  page,
  context,
}) => {
  await signIn(context, ORACLE, 'oracle');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/es/panel/miembros/', '/es/panel/roles/']) {
      await page.goto(`${origin}${path}?org=${TARUGO}`);
      await expect(page.locator('[data-panel-house]')).toBeVisible();
      await expect(
        page.locator('[data-person], [data-roles-list] [data-role]').first(),
      ).toBeVisible();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll, `${path} at ${width}`).toBeLessThanOrEqual(width);
      const results = await new AxeBuilder({ page }).exclude('.binaria').analyze();
      expect(results.violations, `${path} at ${width}`).toEqual([]);
    }
  }
});

// The seam between the two cuts: the panel (e2e/panel.spec.ts plays the till's
// answers with page.route) reading what the house's session really gets.
test('the panel offers an Oracle the same four organizations and says «La casa» in the three it only enters', async ({
  page,
  context,
}) => {
  await signIn(context, ORACLE, 'oracle');
  await page.goto(`${origin}/es/panel/`);
  const switcher = page.getByLabel('Panel de');
  await expect(switcher.locator('option')).toHaveText([
    'Numen Games',
    'Active Inference Institute',
    'La Tarugo',
    'Reset',
  ]);
  const you = page.locator('[data-org-you]');
  await expect(you).toContainText('Eres titular');

  await switcher.selectOption({ label: 'Active Inference Institute' });
  await expect(page).toHaveURL(new RegExp(`/es/panel/\\?org=${INSTITUTE}$`));
  await expect(you).toContainText('La casa');
  await expect(you).toContainText('Entras como la casa');

  // The hosted Members screen keeps the organization and shows the strip too.
  await page.locator('a[data-metric="panel-nav-members"]').click();
  await expect(page).toHaveURL(new RegExp(`/es/panel/miembros/\\?org=${INSTITUTE}$`));
  await expect(page.locator('[data-panel-house]')).toContainText('Entras como la casa');
});

test('the panel of a citizen offers its own organization only, whatever ?org= names', async ({
  page,
  context,
}) => {
  await signIn(context, CITIZEN, 'nomad');
  await page.goto(`${origin}/es/panel/?org=${TARUGO}`);
  await expect(page.locator('[data-org-name]')).toHaveText('Numen Games');
  await expect(page.locator('#org-switch')).toHaveCount(0);
  await expect(page.locator('[data-org-you]')).toContainText('Eres titular');
  // The Oracle's rooms are signage for an Oracle only.
  await expect(page.locator('[data-org-rooms]').first()).toBeHidden();
});
