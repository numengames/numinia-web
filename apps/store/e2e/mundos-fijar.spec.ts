/**
 * The worlds room pins a world to a build (t_3cc88e4d, t_561c1f03,
 * t_69d84138): «Fijar a otra versión» and «Quitar el fijado» only where the
 * machine's door says it listens to pin, the held worlds, the halted state
 * with its reason and the last pass. Run against the fixture build: the
 * fleet is fleet.json (bronte-xs-ca-003 listens to pin and has halted;
 * lantern-hall is held; atrium's last update failed; open-1 does not pin).
 */

import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const HOUSE = `0x${'99'.repeat(20)}`;

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

const ROOM = (lang = 'es') => (lang === 'en' ? '' : `/${lang}`) + '/lap/admin/worlds/';

test.describe('the worlds room pins a world to a build', () => {
  test('lists the held world, the failed one, the halt and the last pass', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(`${origin}${ROOM()}`);
    const banner = page.locator('[data-fleet-engine]');
    await expect(banner).toBeVisible();
    await expect(page.locator('[data-pinned-world="lantern-hall"]')).toContainText(
      'client demo until Friday',
    );
    await expect(page.locator('[data-laggard="atrium"]')).toContainText(
      'its new build did not answer its health check',
    );
    const release = page.locator('[data-release="bronte-xs-ca-003"]');
    await expect(release).toHaveAttribute('data-halted', 'true');
    await expect(release).toContainText('atrium did not answer its health check');
    await expect(release).toContainText('rolled-back');
    // The machine that does not listen to pin says nothing of it.
    await expect(page.locator('[data-release="open-1"]')).toHaveCount(0);
  });

  test('«Fijar a otra versión» asks for a build of its engine and a reason', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(`${origin}${ROOM()}`);
    await page.locator('[data-metric="worlds-pin"]').first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    const build = dialog.locator('#mundo-fijar-version');
    const reason = dialog.locator('#mundo-fijar-motivo');
    const confirm = dialog.locator('[data-metric="worlds-change-pin"]');
    await expect(confirm).toBeDisabled();
    await build.fill('latest');
    await expect(dialog.locator('[data-pin-bad]')).toBeVisible();
    await build.fill('sha-0d15ea5');
    await expect(dialog.locator('[data-pin-bad]')).toHaveCount(0);
    await expect(dialog.locator('[data-pin-image]')).toHaveText(
      'ghcr.io/numengames/numinia-engine:sha-0d15ea5',
    );
    // A build without a reason is not enough; a reason is one line.
    await expect(confirm).toBeDisabled();
    await reason.fill('client demo');
    await expect(confirm).toHaveCount(1);
  });

  test('«Quitar el fijado» shows what holds the world and offers the reason', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(`${origin}${ROOM()}`);
    await page
      .locator('[data-pinned-world="lantern-hall"] [data-metric="worlds-fleet-unpin"]')
      .click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.locator('[data-unpin-from]')).toContainText('client demo until Friday');
    await expect(dialog.locator('#mundo-fijar-motivo')).not.toHaveValue('');
    await expect(dialog.locator('[data-metric="worlds-change-unpin"]')).toHaveCount(1);
    await dialog.locator('#mundo-fijar-motivo').fill('');
    await expect(dialog.locator('[data-metric="worlds-change-unpin"]')).toBeDisabled();
  });

  test('a machine that does not listen to pin offers no pin at all', async ({ page, context }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(`${origin}${ROOM()}`);
    // The room has worlds on the machines that do not pin, and they have no such control.
    for (const world of ['agora-plaza', 'forge']) {
      const card = page.locator(`[data-world="${world}"]`).first();
      await expect(card).toBeVisible();
      await expect(
        card.locator('[data-metric="worlds-pin"], [data-metric="worlds-unpin"]'),
      ).toHaveCount(0);
    }
    await expect(
      page.locator('[data-world="atrium"]').first().locator('[data-metric="worlds-pin"]'),
    ).toHaveCount(1);
  });

  for (const lang of ['es', 'en', 'ja', 'ko', 'pt-br']) {
    test(`${lang}: the held world is listed in its own language`, async ({ page, context }) => {
      await signIn(context, HOUSE, 'oracle');
      await page.goto(`${origin}${ROOM(lang)}`);
      await expect(page.locator('[data-pinned-worlds]')).toBeVisible();
      await expect(page.locator('[data-pinned-world="lantern-hall"]')).toContainText(
        'lantern-hall',
      );
    });
  }
});
