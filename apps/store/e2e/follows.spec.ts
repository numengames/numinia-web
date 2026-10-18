/**
 * «Seguir» for real (cut «Seguir») in a real browser against the built
 * site: a signed-in person presses «Seguir» on a community's page and the
 * city remembers it — «Sigues» that survives a reload, a toast, «N personas
 * la siguen» under the name, the community in /belong/ with a «Dejar de
 * seguir» that takes it away, the rail's «Tus comunidades» figure; the list
 * this browser used to keep (`numinia-follows`) is carried over once and
 * cleared. Signed out, the button is the door. Like e2e/agenda.spec.ts it
 * starts the built server a second time, on a free port, with throwaway
 * secrets; the fixture desk is the data, per process, so each test uses its
 * own wallet.
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
const LUIS = `0x${'ef'.repeat(20)}`;
const ANA = `0x${'12'.repeat(20)}`;
const EVA = `0x${'34'.repeat(20)}`;
/** Communities of the register. */
const TRGCON = 'trgcon';
const MERGE = 'merge';
const KEY = 'numinia-follows';

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

const communityPage = (id: string, prefix = '/es') => `${origin}${prefix}/communities/${id}/`;
const belongPage = (prefix = '/es') => `${origin}${prefix}/belong/`;
const follow = '[data-metric="community-follow"]';
const railCount = '.rail-tu [data-metric="you-your-communities"] [data-you-count]';

test.describe('signed out', () => {
  test('«Seguir» is the door back to the community, and the API refuses', async ({ page }) => {
    await page.goto(communityPage(TRGCON));
    const button = page.locator(follow);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toContainText('Seguir');
    await expect(page.locator(`[data-follow-count="${TRGCON}"]`)).toBeHidden();
    await button.click();
    await expect(page).toHaveURL(
      `${origin}/es/lap/session/?vuelta=${encodeURIComponent(`/es/communities/${TRGCON}/`)}`,
    );
    const got = await page.request.get(`${origin}/api/follow?ids=${TRGCON}`);
    expect(got.status()).toBe(401);
    const sent = await page.request.post(`${origin}/api/follow`, {
      data: { communityId: TRGCON, on: true },
    });
    expect(sent.status()).toBe(401);
  });
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
  });

  test('presses «Seguir», the city remembers, /belong/ lists it; «Dejar de seguir» forgets', async ({
    page,
    context,
  }) => {
    await signIn(context, PABLO);
    await page.goto(communityPage(TRGCON));
    const button = page.locator(follow);
    await expect(page.locator('html')).toHaveAttribute('data-session', 'in');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toContainText('Seguir');
    // The fixture desk makes every wallet a member of one organization: the
    // rail already says «1»; a follow makes it «2», counted once each.
    await expect(page.locator(railCount)).toHaveText('1');

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toContainText('Sigues');
    await expect(page.locator('.aviso[role="status"]')).toHaveText(/Sigues esta comunidad/);
    await expect(page.locator(`[data-follow-count="${TRGCON}"]`)).toHaveText('1 persona la sigue');

    // Reloaded, the page asks and paints the same; the rail counts it.
    await page.reload();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toContainText('Sigues');
    await expect(page.locator(`[data-follow-count="${TRGCON}"]`)).toHaveText('1 persona la sigue');
    await expect(page.locator(railCount)).toHaveText('2');
    // The button swaps primary → ghost in the same tick it says «Sigues»; scan only once the
    // ghost paint has landed, not mid-swap (axe read the old teal fill: contrast 3.82).
    await expect(button).toHaveClass(/btn-fantasma/);
    await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);

    await page.goto(belongPage());
    const card = page.locator('[data-belong-follow] .tuya');
    await expect(card).toHaveCount(1);
    await expect(card.locator('h3 a')).toHaveAttribute('href', `/es/communities/${TRGCON}/`);
    await expect(card.locator('[data-see-ritual]')).toHaveAttribute('href', '/es/rituals/trg26/');
    await expect(page.locator('[data-belong-follow-empty]')).toBeHidden();
    await expect(page.locator(railCount)).toHaveText('2');
    const belongScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(belongScan.violations).toEqual([]);

    await card.locator('[data-metric="belong-unfollow"]').click();
    await expect(page.locator('.aviso[role="status"]')).toHaveText(/Ya no sigues/);
    await expect(card).toHaveCount(0);
    await expect(page.locator('[data-belong-follow-empty]')).toBeVisible();
    await expect(page.locator('[data-belong-follow]')).toBeHidden();
    await expect(page.locator(railCount)).toHaveText('1');

    await page.goto(communityPage(TRGCON));
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator(`[data-follow-count="${TRGCON}"]`)).toBeHidden();
  });

  test('pressing «Sigues» again says «ya no sigues»; counts are public and plural, who follows is not', async ({
    page,
    context,
  }) => {
    await signIn(context, MARIA);
    const sent = await page.request.post(`${origin}/api/follow`, {
      data: { communityId: MERGE, on: true },
    });
    expect(sent.status()).toBe(200);
    await context.clearCookies();
    await signIn(context, LUIS);
    await page.goto(communityPage(MERGE));
    const button = page.locator(follow);
    await expect(page.locator(`[data-follow-count="${MERGE}"]`)).toHaveText('1 persona la sigue');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`[data-follow-count="${MERGE}"]`)).toHaveText('2 personas la siguen');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toContainText('Seguir');
    await expect(page.locator('.aviso[role="status"]')).toHaveText(/Ya no sigues/);
    await expect(page.locator(`[data-follow-count="${MERGE}"]`)).toHaveText('1 persona la sigue');

    const mine = await page.request.get(`${origin}/api/follow?ids=${MERGE}`);
    expect(await mine.json()).toEqual({ mine: [], counts: { [MERGE]: 1 } });
    const unknown = await page.request.get(`${origin}/api/follow?ids=nope`);
    expect(unknown.status()).toBe(400);
    const missing = await page.request.post(`${origin}/api/follow`, {
      data: { communityId: 'nope', on: true },
    });
    expect(missing.status()).toBe(404);
  });

  test('the list this browser kept is carried over once and cleared', async ({ page, context }) => {
    await signIn(context, ANA);
    await page.goto(belongPage());
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify(['trgcon'])), KEY);
    await page.reload();
    const card = page.locator('[data-belong-follow] .tuya');
    await expect(card).toHaveCount(1);
    await expect(card.locator('h3 a')).toHaveAttribute('href', `/es/communities/${TRGCON}/`);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
    await expect(page.locator(railCount)).toHaveText('2');
    const mine = await page.request.get(`${origin}/api/follow`);
    expect(await mine.json()).toEqual({ mine: [TRGCON], counts: {} });
  });

  test('on a phone, «Seguir» and the count read the same', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // A wallet of its own: the fixture desk is per server process, and the
    // tests above left theirs following.
    await signIn(context, EVA);
    await page.goto(communityPage(TRGCON));
    const button = page.locator(follow);
    await expect(page.locator('html')).toHaveAttribute('data-session', 'in');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeEnabled();
    await expect(page.locator(`[data-follow-count="${TRGCON}"]`)).toBeVisible();
    // The click leaves the synthetic mouse resting on the button, which keeps
    // its :hover state (and the hover-only text colour) painted for the axe
    // scan; a phone has no mouse, so move it away before measuring contrast.
    await page.mouse.move(0, 0);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('speaks every language', async ({ page, context }) => {
    await signIn(context, LUIS);
    for (const [prefix, word] of [
      ['', 'Follow'],
      ['/ja', 'フォロー'],
      ['/ko', '팔로우'],
      ['/pt-br', 'Seguir'],
    ] as const) {
      await page.goto(communityPage(TRGCON, prefix));
      await expect(page.locator(follow)).toContainText(word);
      await page.goto(belongPage(prefix));
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});
