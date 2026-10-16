/**
 * «El censo» (cut of 2026-10-16) in a real browser against the built site:
 * an Oracle — the house — sees on the Census page everyone who has signed
 * in, searches them, adds one to an organization and finds them in that
 * organization's Members; the panel's «Add member» suggests from the same
 * list as the house types; a session that is not the house gets nothing and
 * asks for nothing; the page fits a phone and is clean for axe.
 *
 * Like e2e/profile-name.spec.ts it starts the built server a second time,
 * on a free port, with throwaway secrets, and mints the cookies with the
 * same secret. The fixture desk (`DATA_SOURCE=fixture`) seeds six people who
 * signed in; each test that writes uses an organization the others only read.
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
const LUCIA = '0x00000000000000000000000000000000000000a1';
const NUEVA = '0x0000000000000000000000000000000000000a07';
const D4 = '0x00000000000000000000000000000000000000d4';
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

/** Every request the page makes to the list of who has signed in. */
function citizensRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/admin/citizens')) seen.push(request.url());
  });
  return seen;
}

const census = (prefix = '/es') => `${origin}${prefix}/lap/admin/census/`;
const members = (org: string, prefix = '/es') => `${origin}${prefix}/panel/miembros/?org=${org}`;

test.describe('the house sees who has signed in', () => {
  test('lists, searches and adds a person to an organization, then finds them in Members', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(census());
    const list = page.locator('[data-citizens]');
    await expect(list).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Quién ha entrado' })).toBeVisible();
    await expect(list.locator('[data-citizens-before]')).toBeVisible();
    await expect(list.locator('tr[data-citizen]')).toHaveCount(6);
    // A published name, with the short wallet below it and a face.
    const lucia = list.locator(`tr[data-citizen="${LUCIA}"]`);
    await expect(lucia).toContainText('Lucía Vidal');
    await expect(lucia).toContainText('0x0000…00a1');
    await expect(lucia.locator('img')).toHaveAttribute('src', /\/thumbs\/1x\//);

    await list.getByRole('searchbox').fill('lucía');
    await expect(list.locator('tr[data-citizen]')).toHaveCount(1);
    await list.getByRole('searchbox').fill('0a07');
    await expect(list.locator('tr[data-citizen]')).toHaveCount(1);

    const row = list.locator(`tr[data-citizen="${NUEVA}"]`);
    await expect(row.locator('[data-citizen-orgs]')).toHaveText('0');
    await row.locator('[data-metric="census-citizen-add"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox').selectOption(NUMEN);
    await dialog.locator('[data-metric="census-citizen-add-save"]').click();
    await expect(page.locator('[data-citizens-status]')).toContainText('Numen Games');
    await expect(row.locator('[data-citizen-orgs]')).toHaveText('1');

    await page.goto(members(NUMEN));
    await expect(page.locator(`tr[data-person="${NUEVA}"]`)).toBeVisible();
  });

  test('suggests people of the list in Members → Add member, by keyboard', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    const asked = citizensRequests(page);
    await page.goto(members(TARUGO));
    await page.locator('[data-metric="panel-member-add"]').click();
    const input = page.getByRole('combobox');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await input.fill('luc');
    const options = page.getByRole('listbox').getByRole('option');
    await expect(options).toHaveCount(1);
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(options.first()).toContainText('Lucía Vidal');
    expect(asked.length).toBeGreaterThan(0);
    await input.press('ArrowDown');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    await expect(input).toHaveAttribute('aria-activedescendant', /.+/);
    await input.press('Enter');
    await expect(input).toHaveValue(LUCIA);
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await page.locator('[data-metric="panel-member-add-save"]').click();
    await expect(page.locator(`tr[data-person="${LUCIA}"]`)).toBeVisible();
  });

  test('still takes a full wallet typed by hand', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(members(TARUGO));
    await page.locator('[data-metric="panel-member-add"]').click();
    await page.getByRole('combobox').fill(D4.toUpperCase().replace('0X', '0x'));
    await page.locator('[data-metric="panel-member-add-save"]').click();
    await expect(page.locator(`tr[data-person="${D4}"]`)).toBeVisible();
  });
});

test.describe('anyone else gets nothing', () => {
  for (const rank of ['nomad', 'archon']) {
    test(`a ${rank} sees no list on the Census page and asks for none`, async ({
      page,
      context,
    }) => {
      await signIn(context, ADMIN, rank);
      const asked = citizensRequests(page);
      await page.goto(census());
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-citizens]')).toBeHidden();
      await expect(page.locator('tr[data-citizen]')).toHaveCount(0);
      expect(asked).toEqual([]);
      const direct = await page.request.get(`${origin}/api/admin/citizens`);
      expect(direct.status()).toBe(403);
    });
  }

  test('an organization’s admin types a wallet as before: no suggestions, no request', async ({
    page,
    context,
  }) => {
    await signIn(context, ADMIN, 'nomad');
    const asked = citizensRequests(page);
    await page.goto(members(NUMEN));
    await page.locator('[data-metric="panel-member-add"]').click();
    const input = page.locator('#gente-cartera');
    await input.fill('luc');
    await page.waitForTimeout(600);
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(input).not.toHaveAttribute('role', 'combobox');
    expect(asked).toEqual([]);
  });
});

test.describe('fit and finish', () => {
  test('fits a phone of 390 without sideways scrolling', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(context, HOUSE, 'oracle');
    await page.goto(census());
    await expect(page.locator('tr[data-citizen]').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('is clean for axe, in English too', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    for (const prefix of ['/es', '']) {
      await page.goto(census(prefix));
      await expect(page.locator('tr[data-citizen]').first()).toBeVisible();
      const axe = await new AxeBuilder({ page }).include('[data-citizens]').analyze();
      expect(axe.violations).toEqual([]);
    }
    await page.goto(census(''));
    await expect(page.locator('[data-citizens]').getByRole('heading')).toHaveText(
      'Who has signed in',
    );
  });
});
