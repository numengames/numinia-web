/**
 * «Normas de la comunidad», the public page (condiciones/w3), in a real browser against the
 * built site and the fixture desk: a second built server with throwaway secrets (a community's
 * terms are read on demand from the till, not at build time).
 *
 * What is under test, with no session: Numinia's fixed line first (with the link to the Terms of
 * Use), then each point with its title, text, mandatory/optional and rule/data, then the
 * versions published (number and date) — and nothing about who published; a community that
 * published nothing says Numinia's rules are the only ones; a community that does not exist or
 * is not public is a 404 (page and JSON); the card on the community's page leads here; and at
 * 390 px the page does not overflow and axe finds nothing. Set TERMS_PUBLIC_SHOT to a folder to
 * keep photos.
 */

import AxeBuilder from '@axe-core/playwright';
import { createHash, randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type Page } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const HOUSE = `0x${'99'.repeat(20)}`;
/** A published community the seed gives terms to, one it does not, and one only prepared. */
const WITH_TERMS = 'numen-games';
const OPENED_BY_HOUSE = 'vic';
const NO_TERMS = 'reset';
const PREPARED = 'adigital';

let server: ChildProcess | undefined;
let origin = '';
let secret = '';
let stderr = '';

const communityAccount = (community: string): string =>
  `acc_t_${createHash('sha256').update(`numinia-till community ${community}`).digest('hex').slice(0, 32)}`;

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
  // The house opens Vic's account and publishes two versions, as it would for a community that
  // asked for it: the history of the page then has more than one row.
  const now = Math.floor(Date.now() / 1000);
  const token = await createSessionToken(
    { sub: HOUSE, rank: 'oracle', iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION },
    secret,
  );
  const headers = { cookie: `numinia_session=${token}`, 'content-type': 'application/json' };
  const opened = await fetch(`${origin}/api/admin/community-team`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ community: OPENED_BY_HOUSE }),
  });
  expect(opened.status).toBe(200);
  const puntos = [
    {
      id: 'respeto',
      titulo: 'Respeto',
      texto: 'Tratamos a todo el mundo con respeto.\nSin insultos ni acoso.',
      obligatorio: true,
      tipo: 'norma',
    },
    {
      id: 'informe',
      titulo: 'Informe de la sesión',
      texto: 'Guardar un informe de lo que ocurre en el encuentro.',
      obligatorio: false,
      tipo: 'datos',
    },
  ];
  for (const [version, own] of [
    ['1.0', puntos.slice(0, 1)],
    ['1.1', puntos],
  ] as const) {
    const published = await fetch(`${origin}/api/saldo/terms`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accountId: communityAccount(OPENED_BY_HOUSE), version, puntos: own }),
    });
    expect(published.status).toBe(200);
  }
});

test.afterAll(async () => {
  const stopping = server;
  if (stopping === undefined) return;
  const gone = new Promise((resolve) => stopping.once('exit', resolve));
  stopping.kill();
  await gone;
});

const termsPage = (community: string, prefix = '/es') =>
  `${origin}${prefix}/communities/${community}/normas/`;

async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

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

async function photo(page: Page, name: string): Promise<void> {
  const folder = process.env['TERMS_PUBLIC_SHOT'];
  if (folder === undefined || folder === '') return;
  await settle(page);
  await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true });
}

test.describe('the public rules of a community', () => {
  test('shows Numinia’s line first, then each point, then the versions — no author', async ({
    page,
  }) => {
    const response = await page.goto(termsPage(WITH_TERMS));
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Normas de Numen Games');
    const fixed = page.locator('[data-terms-fixed]');
    await expect(fixed).toContainText('Las normas de Numinia van delante de las de esta comunidad');
    await expect(fixed.getByRole('link')).toHaveAttribute('href', '/es/legal/terms/');
    // Fixed comes first, then the community's own, then the history.
    const order = await page.evaluate(() => {
      const at = (selector: string) => document.querySelector(selector);
      const before = (a: Element | null, b: Element | null) =>
        a !== null &&
        b !== null &&
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [
        before(at('[data-terms-fixed]'), at('[data-terms-own]')),
        before(at('[data-terms-own]'), at('[data-terms-history]')),
      ];
    });
    expect(order).toEqual([true, true]);

    const points = page.locator('[data-terms-point]');
    await expect(points).toHaveCount(3);
    await expect(points.nth(0).locator('h3')).toHaveText('Turno de palabra');
    await expect(points.nth(0)).toContainText('En los encuentros, respeta el turno de palabra.');
    await expect(points.nth(0)).toContainText('Obligatoria');
    await expect(points.nth(0)).toContainText('Norma');
    await expect(points.nth(2).locator('h3')).toHaveText('Avisos');
    await expect(points.nth(2)).toContainText('Opcional');
    await expect(points.nth(2)).toContainText('Datos');
    await expect(points.nth(2)).toContainText('quien lo rechaza entra igual');
    await expect(page.locator('[data-terms-in-force]')).toContainText('En vigor: versión 1.0');
    const versions = page.locator('[data-terms-version]');
    await expect(versions).toHaveCount(1);
    await expect(versions.first()).toContainText('v1.0');
    await expect(versions.first().locator('time')).toHaveAttribute('datetime', /^2026-10-20T09:00/);
    await expect(page.locator('[data-terms-none]')).toHaveCount(0);

    const body = (await page.locator('body').innerText()) + (await page.content());
    expect(body).not.toContain(`0x${'ab'.repeat(20)}`);
    expect(body).not.toContain('publishedBy');
    await photo(page, '01-numen-games-escritorio');
  });

  test('a community with two versions shows both, newest first, with the one in force marked', async ({
    page,
  }) => {
    await page.goto(termsPage(OPENED_BY_HOUSE));
    await expect(page.locator('[data-terms-point]')).toHaveCount(2);
    await expect(page.locator('[data-terms-point]').first().locator('.terms-text')).toHaveText(
      /Tratamos a todo el mundo con respeto\.\s+Sin insultos ni acoso\./,
    );
    await expect(page.locator('[data-terms-in-force]')).toContainText('En vigor: versión 1.1');
    const versions = page.locator('[data-terms-version]');
    await expect(versions).toHaveCount(2);
    await expect(versions.nth(0)).toContainText('v1.1');
    await expect(versions.nth(0)).toContainText('en vigor');
    await expect(versions.nth(1)).toContainText('v1.0');
    await expect(versions.nth(1)).not.toContainText('en vigor');
    await photo(page, '02-vic-dos-versiones-escritorio');
  });

  test('a community with nothing published says Numinia’s rules are the only ones', async ({
    page,
  }) => {
    const response = await page.goto(termsPage(NO_TERMS));
    expect(response?.status()).toBe(200);
    await expect(page.locator('[data-terms-fixed]')).toBeVisible();
    await expect(page.locator('[data-terms-none]')).toHaveText(
      'Esta comunidad no añade normas propias: valen las de Numinia.',
    );
    await expect(page.locator('[data-terms-point]')).toHaveCount(0);
    await expect(page.locator('[data-terms-history]')).toHaveCount(0);
    await photo(page, '03-sin-normas-escritorio');
  });

  test('an unknown community, a prepared one and a bad id are a 404, in every language', async ({
    page,
  }) => {
    for (const prefix of ['', '/es', '/ja', '/ko', '/pt-br']) {
      for (const id of ['not-a-community', PREPARED, 'Numen%20Games']) {
        const response = await page.request.get(termsPage(id, prefix));
        expect(response.status(), `${prefix}/${id}`).toBe(404);
      }
    }
  });

  test('the page of the community leads here, and the other languages have the page', async ({
    page,
  }) => {
    await page.goto(`${origin}/es/communities/${NO_TERMS}/`);
    await expect(page.locator('[data-terms-card] a')).toHaveAttribute(
      'href',
      `/es/communities/${NO_TERMS}/normas/`,
    );
    await page.goto(`${origin}/es/communities/${WITH_TERMS}/`);
    await expect(page.locator('[data-terms-card] a')).toHaveAttribute(
      'href',
      `/es/communities/${WITH_TERMS}/normas/`,
    );
    const cases = [
      ['', 'Rules of Numen Games', 'Numinia Terms of Use'],
      ['/ja', 'Numen Gamesのルール', 'Numinia 利用規約'],
      ['/ko', 'Numen Games의 규칙', 'Numinia 이용 약관'],
      ['/pt-br', 'Regras de Numen Games', 'Termos de Uso da Numinia'],
    ] as const;
    for (const [prefix, heading, link] of cases) {
      await page.goto(termsPage(WITH_TERMS, prefix));
      await expect(page.locator('h1')).toHaveText(heading);
      await expect(page.locator('[data-terms-fixed] a')).toContainText(link);
      await expect(page.locator('[data-terms-fixed] a')).toHaveAttribute(
        'href',
        `${prefix}/legal/terms/`,
      );
      await expect(page.locator('[data-terms-point]')).toHaveCount(3);
    }
  });

  test('the JSON is public, cached, shaped for the AIs and leaks no author', async ({ page }) => {
    const response = await page.request.get(
      `${origin}/api/community-terms?comunidad=${OPENED_BY_HOUSE}`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('s-maxage=300');
    const text = await response.text();
    expect(text).not.toContain('publishedBy');
    expect(text).not.toContain(HOUSE);
    expect(text).not.toContain(communityAccount(OPENED_BY_HOUSE));
    const json = JSON.parse(text) as {
      schema: string;
      page: string;
      current: { capa: string; version: string; puntos: { id: string }[] };
      history: { version: string }[];
    };
    expect(json.schema).toBe('community-terms-public@1');
    expect(json.page).toBe(`/es/communities/${OPENED_BY_HOUSE}/normas/`);
    expect(json.current.capa).toBe('comunidad');
    expect(json.current.version).toBe('1.1');
    expect(json.current.puntos.map((point) => point.id)).toEqual(['respeto', 'informe']);
    expect(json.history.map((entry) => entry.version)).toEqual(['1.0', '1.1']);

    const none = await page.request.get(`${origin}/api/community-terms?comunidad=${NO_TERMS}`);
    expect(await none.json()).toMatchObject({ ok: true, current: null, history: [] });
    for (const [query, status] of [
      [`comunidad=${PREPARED}`, 404],
      ['comunidad=not-a-community', 404],
      ['comunidad=Not%20One', 400],
      ['', 400],
    ] as const) {
      const refused = await page.request.get(`${origin}/api/community-terms?${query}`);
      expect(refused.status(), query).toBe(status);
    }
  });

  test('at 390 px nothing overflows and axe finds nothing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [id, shot] of [
      [WITH_TERMS, '04-numen-games-movil'],
      [OPENED_BY_HOUSE, '05-vic-dos-versiones-movil'],
      [NO_TERMS, '06-sin-normas-movil'],
    ] as const) {
      await page.goto(termsPage(id));
      await expect(page.locator('[data-terms-fixed]')).toBeVisible();
      await settle(page);
      expect(await overflow(page), id).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((violation) => `${id}: ${violation.id}`)).toEqual([]);
      await photo(page, shot);
    }
  });

  test('on the desktop too axe finds nothing, by day and by night', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(termsPage(OPENED_BY_HOUSE));
      await settle(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((violation) => `${scheme}: ${violation.id}`)).toEqual([]);
    }
  });
});
