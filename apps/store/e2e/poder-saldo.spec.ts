/**
 * «Poder y saldo» (MVL-B, 2026-10-18): the wizard's ON/OFF choice when
 * creating a world. Like e2e/mundos.spec.ts it starts the built server a
 * second time, on a free port, with throwaway secrets, against the fixture
 * till and the fixture fleet. Scope: the balance gate the wizard shows
 * before «Crear» — not the signed CreateWorld transaction itself (no e2e
 * here drives a wallet signature; that stays a vitest/unit concern).
 */

import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const HOUSE = `0x${'99'.repeat(20)}`;
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';

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

const room = (prefix = '/es') => `${origin}${prefix}/lap/admin/worlds/`;

/** The house tops up an organization's till account for real, through the same checkout+confirm the Saldo screen uses. */
async function topUp(
  requester: { post(url: string, opts: { data: unknown }): Promise<{ json(): Promise<unknown> }> },
  accountId: string,
): Promise<void> {
  const started = (await requester
    .post(`${origin}/api/saldo`, {
      data: { action: 'topup', accountId, amount: '10', locale: 'es' },
    })
    .then((response) => response.json())) as { result: { ok: boolean; url: string } };
  expect(started.result.ok).toBe(true);
  const sessionId = new URL(started.result.url).searchParams.get('session_id');
  const confirmed = (await requester
    .post(`${origin}/api/saldo`, { data: { action: 'confirm', sessionId } })
    .then((response) => response.json())) as { result: { ok: boolean; balanceCents: number } };
  expect(confirmed.result.ok).toBe(true);
  expect(confirmed.result.balanceCents).toBeGreaterThan(0);
}

/** A brand-new till team: born with no balance, like a Numen Games equivalent would when first opened. */
async function freshZeroBalanceTeam(requester: {
  post(url: string, opts: { data: unknown }): Promise<{ json(): Promise<unknown> }>;
}): Promise<string> {
  const made = (await requester
    .post(`${origin}/api/saldo`, { data: { action: 'create-team', name: 'MVLB Sin Saldo' } })
    .then((response) => response.json())) as { result: { ok: boolean; account: { id: string } } };
  expect(made.result.ok).toBe(true);
  return made.result.account.id;
}

test.describe('creating a world chooses on or off, and on checks the balance first', () => {
  test.describe.configure({ mode: 'serial' });
  let zeroBalanceTeam = '';

  test('Numen Games already has balance; a brand-new organization starts at zero', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await topUp(page.request, NUMEN);
    zeroBalanceTeam = await freshZeroBalanceTeam(page.request);
    expect(zeroBalanceTeam).toMatch(/^acc_team_/);
  });

  test('on blocks without balance, then the same org allows it once funded', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(room());
    await page.locator('[data-metric="worlds-new"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Step 0: a free id.
    await dialog.locator('#mundo-id').fill('mvlb-poder-saldo-test');
    await dialog.locator('[data-metric="worlds-wizard-next"]').click();

    // Step 1: open-1 (its door answers in the fixture), a free address.
    await dialog.locator('#mundo-dominio').fill('mvlb-poder-saldo-test');
    await expect(dialog.locator('[data-metric="worlds-wizard-next"]')).toBeEnabled();
    await dialog.locator('[data-metric="worlds-wizard-next"]').click();

    // Step 2: the only engine open-1 offers without naming any (Hyperfy).
    await dialog.locator('[data-metric="worlds-wizard-engine"]').first().click();
    await expect(dialog.locator('[data-metric="worlds-wizard-next"]')).toBeEnabled();
    await dialog.locator('[data-metric="worlds-wizard-next"]').click();

    // Step 3: «Encendido» is the default; choosing the zero-balance organization blocks it.
    const createButton = dialog.locator('[data-metric="worlds-wizard-create"]');
    await expect(dialog.locator('[data-power="on"]')).toHaveAttribute('aria-checked', 'true');
    await dialog.locator('#mundo-org').selectOption(`t:${zeroBalanceTeam}`);
    await expect(dialog.locator('[data-balance-blocked]')).toBeVisible();
    await expect(dialog.locator('[data-balance-blocked] a')).toHaveAttribute(
      'href',
      /\/panel\/saldo\//,
    );
    await expect(createButton).toBeDisabled();

    // Numen Games was funded above: choosing it instead lifts the block.
    await dialog.locator('#mundo-org').selectOption('c:numen-games');
    await expect(dialog.locator('[data-balance-ok]')).toBeVisible();
    await expect(dialog.locator('[data-balance-blocked]')).toHaveCount(0);
    await expect(createButton).toBeEnabled();

    // «Apagado» needs no organization and no balance at all.
    await dialog.locator('[data-power="off"]').click();
    await expect(dialog.locator('#mundo-org')).toHaveCount(0);
    await expect(dialog.locator('[data-balance-blocked]')).toHaveCount(0);
    await expect(createButton).toBeEnabled();
  });
});
