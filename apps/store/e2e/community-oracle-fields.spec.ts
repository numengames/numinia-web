/**
 * Card t_371c917d (2026-10-18) in a real browser against the built site:
 * while a community has no titular yet, an Oracle adds themself as its
 * titular and first member in one step from its page, and renames the
 * card (and fills in its summary) — both persist past a reload and the
 * public page shows the edited name and summary to anyone.
 *
 * Like e2e/community-requests.spec.ts it starts the built server a second
 * time, on a free port, with throwaway secrets, and mints the cookie with
 * the same secret. The fixture desk keeps its state in memory for the run.
 */

import { createHash, randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const HOUSE = `0x${'99'.repeat(20)}`;
const COMMUNITY = 'vic';

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

const communityPage = (community: string, prefix = '/es') =>
  `${origin}${prefix}/communities/${community}/`;
const members = (community: string, prefix = '/es') =>
  `${origin}${prefix}/panel/miembros/?org=${communityAccount(community)}`;

test.describe.configure({ mode: 'serial' });

test.describe('the Oracle on a community with no titular yet', () => {
  test('the strip shows no Oracle panel to a visitor, or to a signed-in nomad', async ({
    page,
    context,
  }) => {
    await page.goto(communityPage(COMMUNITY));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-oracle-panel]')).toBeHidden();
    await signIn(context, `0x${'ab'.repeat(20)}`, 'nomad');
    await page.goto(communityPage(COMMUNITY));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-oracle-panel]')).toBeHidden();
  });

  test('an Oracle sees the panel and adds themself as titular in one step', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(communityPage(COMMUNITY));
    const panel = page.locator('[data-oracle-panel]');
    await expect(panel).toBeVisible();
    await panel.locator('[data-oracle-join]').click();
    await expect(panel.locator('[data-oracle-join-said]')).toContainText(
      'Ya eres titular y primer miembro.',
    );
    // Added: the panel's own join action no longer shows (the community has a titular now).
    await expect(panel).toBeHidden();
  });

  test('the Oracle is listed as the first — and only — member, as Titular', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(members(COMMUNITY));
    const rows = page.locator('tbody tr[data-person]');
    await expect(rows).toHaveCount(1);
    const first = rows.first();
    await expect(first).toHaveAttribute('data-person', HOUSE);
    await expect(first).toContainText('Titular');
  });
});

test.describe('the Oracle renames a community’s card and fills in its summary', () => {
  test('saved from the page, the new name and summary show to anyone, past a reload', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(communityPage('trgcon'));
    const panel = page.locator('[data-oracle-panel]');
    await expect(panel).toBeVisible();
    const form = panel.locator('[data-oracle-fields]');
    await form.locator('#oraculo-nombre').fill('TRG Con, la de verdad');
    await form.locator('#oraculo-resumen').fill('El encuentro anual de la comunidad, editado.');
    await form.locator('[data-oracle-fields-save]').click();
    await expect(form.locator('[data-oracle-fields-said]')).toContainText('Guardado.');
    await expect(page.locator('h1[data-community-field="name"]')).toHaveText(
      'TRG Con, la de verdad',
    );

    // A fresh, signed-out visitor loads the static page and still sees the edit.
    const visitor = await context.browser()?.newContext();
    if (visitor === undefined) throw new Error('no browser for the visitor context');
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(communityPage('trgcon'));
    await expect(visitorPage.locator('h1[data-community-field="name"]')).toHaveText(
      'TRG Con, la de verdad',
    );
    await expect(visitorPage.locator('p[data-community-field="summary"]')).toHaveText(
      'El encuentro anual de la comunidad, editado.',
    );
    await visitor.close();
  });
});
