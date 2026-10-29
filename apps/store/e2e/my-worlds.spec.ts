/**
 * «Tus mundos» (/mis-mundos/, cut I) in a real browser against the built
 * site: signed in, the worlds of the communities you belong to, grouped by
 * community, each with its card; a wallet whose communities have no world
 * reads the empty line and the way to the city's worlds; signed out, the
 * door comes back here. The rail's counter beside «Tus mundos» says the
 * same figure, read from the real /api/mundos/mine. Like e2e/agenda.spec.ts
 * it starts the built server a second time (the page is rendered on
 * demand), on a free port, with throwaway secrets; the fixture desk is the
 * data, per process, so each test uses its own wallet — the seed puts every
 * wallet in «Numen Games», which holds three worlds.
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const PABLO = `0x${'ab'.repeat(20)}`;
const MARIA = `0x${'cd'.repeat(20)}`;
const GAMES = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';

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

async function signIn(context: BrowserContext, wallet: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const value = await createSessionToken(
    {
      sub: wallet,
      rank: 'nomad',
      iat: now,
      exp: now + 3_600,
      terms: LEGAL_CORPUS_VERSION,
    } as never,
    secret,
  );
  await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
}

const myWorldsPage = (prefix = '/es') => `${origin}${prefix}/mis-mundos/`;

test.describe('signed out', () => {
  test('the page explains and offers the door, which comes back here; the API refuses', async ({
    page,
  }) => {
    await page.goto(myWorldsPage());
    await expect(page.locator('h1')).toHaveText('Tus mundos');
    await expect(page.locator('[data-my-worlds="out"]')).toBeVisible();
    await expect(page.locator('[data-metric="my-worlds-sign-in"]')).toHaveAttribute(
      'href',
      `/es/lap/session/?vuelta=${encodeURIComponent('/es/mis-mundos/')}`,
    );
    await expect(page.locator('[data-world-card]')).toHaveCount(0);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);
    expect((await page.request.get(`${origin}/api/mundos/mine`)).status()).toBe(401);
  });
});

test.describe('signed in', () => {
  test('the worlds of your communities, grouped, each with its card; the rail counts them', async ({
    page,
    context,
  }) => {
    await signIn(context, PABLO);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(myWorldsPage());
    const group = page.locator(`[data-my-worlds-community="${GAMES}"]`);
    await expect(group).toBeVisible();
    const name = group.locator('[data-metric="my-worlds-community"]');
    await expect(name).toHaveText('Numen Games');
    await expect(name).toHaveAttribute('href', '/es/communities/numen-games/');
    await expect(group.locator('[data-world-card]')).toHaveCount(3);
    await expect(group.locator('[data-metric="worlds-card-enter"]').first()).toBeVisible();
    await expect(group.locator('[data-metric="worlds-card-page"]').first()).toHaveAttribute(
      'href',
      /\/es\/mundos\/[a-z-]+\/$/,
    );
    // Only your communities: the ones the wallet is not in are not here.
    await expect(page.locator('[data-my-worlds-community]')).toHaveCount(1);
    await expect(page.locator('[data-my-worlds="empty"]')).toHaveCount(0);
    // The rail's counter reads the same figure from the real API.
    await expect(
      page.locator('.rail-tu [data-metric="you-worlds"] [data-you-count="worlds"]'),
    ).toHaveText('3');
    await expect(page.locator('.rail-tu [data-metric="you-worlds"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);

    const api = await page.request.get(`${origin}/api/mundos/mine`);
    expect(api.status()).toBe(200);
    expect(await api.json()).toEqual({
      ok: true,
      count: 3,
      communities: [
        {
          accountId: GAMES,
          name: 'Numen Games',
          worldIds: ['agora-plaza', 'alchemists-tower', 'atlantis-library'],
        },
      ],
    });
  });

  test('with no world among your communities: the empty line and the way to the city’s worlds', async ({
    page,
    context,
  }) => {
    await signIn(context, MARIA);
    // María leaves Numen Games (the one community the seed puts her in): nothing of hers has a world.
    const left = await page.request.post(`${origin}/api/saldo`, {
      data: { action: 'remove-member', accountId: GAMES, wallet: MARIA },
    });
    expect(left.status()).toBe(200);
    await page.goto(myWorldsPage());
    await expect(page.locator('[data-my-worlds="empty"]')).toBeVisible();
    await expect(page.locator('[data-my-worlds="empty"]')).toContainText(
      'Tus comunidades no tienen mundos todavía',
    );
    await expect(page.locator('[data-metric="my-worlds-all"]')).toHaveAttribute(
      'href',
      '/es/mundos/',
    );
    await expect(page.locator('[data-world-card]')).toHaveCount(0);
    // Never a «0» in the rail.
    await expect(page.locator('[data-metric="chrome-account"]')).toBeVisible();
    await expect(page.locator('[data-you-count="worlds"]').first()).toBeHidden();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('the five languages', async ({ page, context }) => {
    await signIn(context, PABLO);
    for (const [prefix, title] of [
      ['', 'Your worlds'],
      ['/ja', 'あなたのワールド'],
      ['/ko', '내 월드'],
      ['/pt-br', 'Seus mundos'],
    ] as const) {
      await page.goto(myWorldsPage(prefix));
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('[data-world-card]')).toHaveCount(3);
    }
  });
});
