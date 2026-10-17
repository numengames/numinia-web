/**
 * «Avisos» (cut J, 2026-10-17) in a real browser against the built site:
 * the bell's page is one list of what concerns you — the four kinds — with
 * four chips that narrow it without a reload; «Aceptar» decides a request
 * and the row leaves; «Ahora no» hides it for the visit; the bell shows a
 * dot when there is something newer than the last visit, and the visit
 * makes it go; signed out, the door; a phone of 390 fits; axe is clean.
 *
 * The session and the list are played by the browser (`page.route`): the
 * e2e server runs without auth secrets. One test starts the built server a
 * second time with throwaway secrets (as e2e/community-requests.spec.ts
 * does) to read the real fixture answer of /api/notices.
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const WALLET = '0x42e6000000000000000000000000000000ca26';
const REQUEST = `req_${'a1'.repeat(16)}`;
const NOW = Date.now();
const minutesAgo = (n: number): string => new Date(NOW - n * 60_000).toISOString();
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

/** A list of the four kinds, as /api/notices answers it. */
const LIST = {
  ok: true,
  unseen: 4,
  notices: [
    {
      id: 'world:vic',
      kind: 'world',
      at: minutesAgo(3),
      text: { before: 'Hay ', subject: '5 personas', after: ' en Vic.' },
      when: 'hace 3 min',
      href: '/communities/vic/',
      actions: [{ id: 'enter', href: 'https://vic.numinia.com/' }],
    },
    {
      id: 'decision:req_b2',
      kind: 'community',
      at: daysAgo(1),
      text: { before: '', subject: 'Adigital', after: ' te ha aceptado. Ya eres Titular.' },
      when: 'ayer',
      href: '/communities/adigital/',
    },
    {
      id: `request:${REQUEST}`,
      kind: 'community',
      at: daysAgo(3),
      text: { before: '', subject: 'Lucía Vidal', after: ' quiere entrar en Vic.' },
      when: 'mié',
      href: '/communities/vic/',
      actions: [
        { id: 'accept', request: REQUEST, community: 'vic' },
        { id: 'later', request: REQUEST, community: 'vic' },
      ],
    },
    {
      id: 'encounter:numinia-anniversary-2026',
      kind: 'encounter',
      at: daysAgo(11),
      text: { before: '', subject: 'El Aniversario de Numinia', after: ' empieza en 3 días. Vas.' },
      when: '6 oct',
      href: '/rituals/numinia-anniversary-2026/',
      actions: [{ id: 'calendar', href: '/rituals/numinia-anniversary-2026.ics' }],
    },
  ],
};

async function signedIn(page: Page): Promise<void> {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank: 'oracle' } }),
  );
}

/** Plays /api/notices: the list, with `unseen` counted against `?since=`. */
async function withNotices(
  page: Page,
  body: typeof LIST | { ok: true; unseen: 0; notices: [] } = LIST,
): Promise<string[]> {
  const asked: string[] = [];
  await page.route('**/api/notices**', (route) => {
    const url = new URL(route.request().url());
    asked.push(url.search);
    const since = url.searchParams.get('since');
    const unseen =
      since === null
        ? body.notices.length
        : body.notices.filter((n) => Date.parse(n.at) > Date.parse(since)).length;
    return route.fulfill({ status: 200, json: { ...body, unseen } });
  });
  return asked;
}

const rows = (page: Page) => page.locator('[data-notices-list] [data-notice]');
const chip = (page: Page, id: string) => page.locator(`[data-metric="notifications-chip-${id}"]`);
const visibleRows = (page: Page) => page.locator('[data-notices-list] [data-notice]:not([hidden])');

test('your rail rings the bell for the notices, and nothing lists the updates', async ({
  page,
}) => {
  await page.goto('/es/');
  const bell = page.locator('.rail-tu [data-metric="you-notices"]');
  await expect(bell).toBeVisible();
  await expect(bell).toHaveAttribute('href', '/es/notifications/');
  await expect(bell).toContainText('Avisos');
  await expect(page.locator('[data-metric="footer-updates"]')).toHaveCount(0);
  await expect(page.locator('.rail-ciudad [data-metric="footer-version"]')).toHaveAttribute(
    'href',
    '/es/updates/',
  );
  const doors = await page
    .locator('a[href$="/updates/"]')
    .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('data-metric')))]);
  expect(doors).toEqual(['footer-version']);
  // Signed out, no dot and no read of the notices.
  await expect(page.locator('.rail-tu [data-notices-dot]')).toBeHidden();
});

test('signed out, the page offers the door and comes back here', async ({ page }) => {
  await page.goto('/es/notifications/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toHaveText('Avisos');
  await expect(page.getByText('Lo que te toca, y solo lo que elegiste.')).toBeVisible();
  const door = page.locator('[data-metric="notifications-sign-in"]');
  await expect(door).toBeVisible();
  await expect(door).toHaveAttribute('href', '/es/lap/session/?vuelta=%2Fes%2Fnotifications%2F');
  await expect(page.getByText('Entra para ver tus avisos')).toBeVisible();
  await expect(page.locator('[data-notices]')).toBeHidden();
});

test('signed in, one list of the four kinds, newest first, with the quiet actions; the page asks once', async ({
  page,
}) => {
  await signedIn(page);
  const asked = await withNotices(page);
  await page.goto('/es/notifications/');
  await expect(rows(page)).toHaveCount(4);
  await expect(rows(page).nth(0)).toContainText('Hay 5 personas en Vic.');
  await expect(rows(page).nth(0).locator('b')).toHaveText('5 personas');
  await expect(rows(page).nth(0).locator('time')).toHaveText('hace 3 min');
  const enter = rows(page).nth(0).locator('[data-metric="notifications-enter"]');
  await expect(enter).toHaveText('Entrar');
  await expect(enter).toHaveAttribute('href', 'https://vic.numinia.com/');
  await expect(rows(page).nth(1)).toContainText('Adigital te ha aceptado. Ya eres Titular.');
  await expect(rows(page).nth(1).locator('[data-action]')).toHaveCount(0);
  await expect(rows(page).nth(2)).toContainText('Lucía Vidal quiere entrar en Vic.');
  await expect(rows(page).nth(2).locator('[data-metric="notifications-accept"]')).toHaveText(
    'Aceptar',
  );
  await expect(rows(page).nth(2).locator('[data-metric="notifications-later"]')).toHaveText(
    'Ahora no',
  );
  await expect(rows(page).nth(3)).toContainText(
    'El Aniversario de Numinia empieza en 3 días. Vas.',
  );
  const calendar = rows(page).nth(3).locator('[data-metric="notifications-calendar"]');
  await expect(calendar).toHaveText('A mi calendario');
  await expect(calendar).toHaveAttribute('href', '/es/rituals/numinia-anniversary-2026.ics');
  await expect(page.locator('[data-notices-empty]')).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(asked).toHaveLength(1);
  expect(asked[0]).toContain('locale=es');
  // The visit is «seen»: the newest moment is kept.
  expect(await page.evaluate(() => localStorage.getItem('numinia-notices-seen'))).toBe(
    LIST.notices[0]?.at,
  );
});

test('each chip narrows the list without a reload', async ({ page }) => {
  await signedIn(page);
  await withNotices(page);
  await page.goto('/es/notifications/');
  await expect(rows(page)).toHaveCount(4);
  await expect(chip(page, 'all')).toHaveAttribute('aria-pressed', 'true');
  for (const [id, count, text] of [
    ['encounter', 1, 'El Aniversario de Numinia'],
    ['world', 1, 'Hay 5 personas'],
    ['community', 2, 'Adigital'],
    ['all', 4, 'Hay 5 personas'],
  ] as const) {
    await chip(page, id).click();
    await expect(chip(page, id)).toHaveAttribute('aria-pressed', 'true');
    await expect(visibleRows(page)).toHaveCount(count);
    await expect(visibleRows(page).first()).toContainText(text);
  }
  await expect(chip(page, 'world')).toHaveAttribute('aria-pressed', 'false');
  expect(new URL(page.url()).pathname).toBe('/es/notifications/');
});

test('«Aceptar» decides the request and the row leaves; «Ahora no» hides it for the visit', async ({
  page,
}) => {
  await signedIn(page);
  await withNotices(page);
  const decided: unknown[] = [];
  await page.route('**/api/admin/community-request/decide', async (route) => {
    decided.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        request: {
          id: REQUEST,
          communityId: 'vic',
          wallet: '0x00000000000000000000000000000000000000a1',
          kind: 'join',
          note: null,
          state: 'accepted',
          createdAt: daysAgo(3),
          decidedAt: new Date(NOW).toISOString(),
          decidedBy: WALLET.toLowerCase(),
        },
      },
    });
  });
  await page.goto('/es/notifications/');
  await rows(page).nth(2).locator('[data-metric="notifications-accept"]').click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator('[data-notices-status]')).toHaveText('Aceptada.');
  expect(decided).toEqual([{ request: REQUEST, accept: true, community: 'vic' }]);

  await page.reload();
  await expect(rows(page)).toHaveCount(4);
  await rows(page).nth(2).locator('[data-metric="notifications-later"]').click();
  await expect(rows(page)).toHaveCount(3);
  // «Ahora no» decided nothing.
  expect(decided).toHaveLength(1);
  await expect(page.locator('[data-notices-list]')).not.toContainText('Lucía Vidal');
});

test('nothing to show says «Estás al día»; a list that cannot be read offers to retry', async ({
  page,
}) => {
  await signedIn(page);
  await withNotices(page, { ok: true, unseen: 0, notices: [] });
  await page.goto('/es/notifications/');
  const empty = page.locator('[data-notices-empty]');
  await expect(empty).toBeVisible();
  await expect(empty).toContainText('Estás al día');
  await expect(empty).toContainText(
    'Lo que te toque — un encuentro al que vas, gente en una sede tuya, una petición que decidir — aparecerá aquí.',
  );
  await expect(rows(page)).toHaveCount(0);

  await page.unroute('**/api/notices**');
  await page.route('**/api/notices**', (route) => route.fulfill({ status: 503, json: {} }));
  await page.reload();
  await expect(page.locator('[data-notices-failed]')).toBeVisible();
  await expect(empty).toBeHidden();
  await page.unroute('**/api/notices**');
  await withNotices(page);
  await page.locator('[data-metric="notifications-retry"]').click();
  await expect(rows(page)).toHaveCount(4);
});

test('the bell shows a dot when there is something new, and a visit makes it go', async ({
  page,
}) => {
  await signedIn(page);
  const asked = await withNotices(page);
  await page.goto('/es/');
  const dot = page.locator('.rail-tu [data-notices-dot]');
  await expect(dot).toBeVisible();
  await expect(dot.locator('[role="img"]')).toHaveAttribute('aria-label', 'Hay algo nuevo');
  await expect(page.locator('.rail-tu [data-metric="you-notices"]')).not.toContainText(/\d/);
  await expect.poll(() => asked.length).toBe(1);
  expect(asked[0]).not.toContain('since=');

  await page.locator('.rail-tu [data-metric="you-notices"]').click();
  await expect(page).toHaveURL(/\/es\/notifications\/$/);
  await expect(rows(page)).toHaveCount(4);
  await expect(page.locator('.rail-tu [data-notices-dot]')).toBeHidden();
  // Only the page asked here; the rail did not ask twice.
  expect(asked).toHaveLength(2);

  await page.goto('/es/');
  await expect.poll(() => asked.length).toBe(3);
  expect(asked[2]).toContain('since=');
  await expect(page.locator('.rail-tu [data-notices-dot]')).toBeHidden();
});

test('on a phone the «Tú» tab and the sheet carry the dot too; the page fits 390 and is clean for axe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signedIn(page);
  await withNotices(page);
  await page.goto('/es/');
  await expect(page.locator('[data-metric="tab-you"] [data-notices-dot]')).toBeVisible();
  await page.locator('[data-metric="tab-you"]').click();
  const item = page.locator('#hoja-tu [data-metric="sheet-notices"]');
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute('href', '/es/notifications/');
  await expect(item.locator('[data-notices-dot]')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/es/notifications/');
  await expect(rows(page)).toHaveCount(4);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('in English the page speaks English and axe stays clean on the desktop', async ({ page }) => {
  await signedIn(page);
  await withNotices(page);
  await page.goto('/notifications/');
  await expect(page.locator('h1')).toHaveText('Notices');
  await expect(chip(page, 'world')).toHaveText('Homes');
  await expect(rows(page).nth(2).locator('[data-metric="notifications-accept"]')).toHaveText(
    'Accept',
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('every version card links to its merge on GitHub; the legacy line has none', async ({
  page,
}) => {
  await page.goto('/es/updates/');
  const card = page.locator('[data-updates] > li[data-version="v0.88.0"]');
  const merge = card.locator('[data-metric="updates-merge"]');
  await expect(merge).toHaveText('Ver en GitHub');
  await expect(merge).toHaveAttribute('href', 'https://github.com/numengames/numinia-web/pull/120');
  await expect(merge).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(merge).toHaveAttribute('target', '_blank');
  const search = page.locator(
    '[data-updates] > li[data-version="v0.50.0"] [data-metric="updates-merge"]',
  );
  const href = (await search.getAttribute('href')) ?? '';
  expect(new URL(href).origin + new URL(href).pathname).toBe(
    'https://github.com/numengames/numinia-web/pulls',
  );
  expect(new URL(href).searchParams.get('q')).toBe('is:pr is:merged in:title "v0.50.0"');
  await expect(
    page.locator('[data-updates] > li[data-version="v0.15.0"] [data-metric="updates-merge"]'),
  ).toHaveCount(0);
});

// ---- The real route, on a second server with throwaway secrets ----------------

test.describe('GET /api/notices on the fixture', () => {
  let server: ChildProcess | undefined;
  let origin = '';
  let secret = '';
  let stderr = '';

  const freePort = (): Promise<number> =>
    new Promise((resolve, reject) => {
      const probe = createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        probe.close(() =>
          resolve(typeof address === 'object' && address !== null ? address.port : 0),
        );
      });
    });

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
    const until = Date.now() + 30_000;
    while (Date.now() < until) {
      const answered = await fetch(`${origin}/api/auth/session`).then(
        (response) => response.text().then(() => true),
        () => false,
      );
      if (answered) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`the second server never answered at ${origin}: ${stderr}`);
  });

  test.afterAll(async () => {
    const stopping = server;
    if (stopping === undefined) return;
    const gone = new Promise((resolve) => stopping.once('exit', resolve));
    stopping.kill();
    await gone;
  });

  async function signIn(context: BrowserContext): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const value = await createSessionToken(
      {
        sub: WALLET,
        rank: 'nomad',
        iat: now,
        exp: now + 3_600,
        terms: LEGAL_CORPUS_VERSION,
      } as never,
      secret,
    );
    await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
  }

  test('401 signed out; signed in, one of every kind, private and never stored, in the locale asked', async ({
    page,
    context,
  }) => {
    const out = await page.request.get(`${origin}/api/notices`);
    expect(out.status()).toBe(401);
    await signIn(context);
    const response = await page.request.get(`${origin}/api/notices?locale=es`);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('private, no-store');
    const body = (await response.json()) as typeof LIST;
    expect(body.ok).toBe(true);
    expect(body.unseen).toBe(4);
    expect(body.notices.map((n) => n.kind).sort()).toEqual([
      'community',
      'community',
      'encounter',
      'world',
    ]);
    expect(body.notices.find((n) => n.kind === 'encounter')?.text.after).toBe(
      ' empieza en 3 días. Vas.',
    );
    expect(body.notices.find((n) => n.kind === 'world')?.text.subject).toBe('5 personas');
    const since = body.notices[0]?.at ?? '';
    const seen = (await (
      await page.request.get(`${origin}/api/notices?since=${encodeURIComponent(since)}`)
    ).json()) as typeof LIST;
    expect(seen.unseen).toBe(0);
    const english = (await (
      await page.request.get(`${origin}/api/notices?locale=en`)
    ).json()) as typeof LIST;
    expect(english.notices.find((n) => n.kind === 'encounter')?.text.after).toBe(
      ' starts in 3 days. You are going.',
    );

    // The page itself, on this server, paints the real fixture list.
    await page.goto(`${origin}/es/notifications/`);
    await expect(rows(page)).toHaveCount(4);
    await expect(rows(page).first()).toContainText('Hay 5 personas en');
  });
});
