/**
 * «Me apunto» for real and «Tu agenda» (cut F) in a real browser against the
 * built site: a signed-in person presses «Me apunto» on an encounter's page
 * and the city remembers it — «Voy», a toast, «N personas van» under the
 * title, the encounter in /agenda/; pressing again says «ya no voy» and the
 * agenda empties. Signed out, the button is the door and /agenda/ explains.
 * Like e2e/mundos.spec.ts it starts the built server a second time (the
 * agenda is rendered on demand), on a free port, with throwaway secrets; the
 * fixture desk is the data, per process, so each test uses its own wallet.
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
/** The furthest encounter in the register: the clock of the day must not decide this spec (TRG26 ended on 2026-10-24). */
const TRG = 'merge-buenos-aires-2027';
const MERGE = 'merge-madrid-2026';
/** One already held: its page offers the calendar, never «Me apunto». */
const HELD = 'commit-conf-2026';

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

const ritualPage = (id: string, prefix = '/es') => `${origin}${prefix}/rituals/${id}/`;
const agendaPage = (prefix = '/es') => `${origin}${prefix}/agenda/`;

test.describe('signed out', () => {
  test('«Me apunto» is the door back to the encounter, and /agenda/ explains', async ({ page }) => {
    await page.goto(ritualPage(TRG));
    const door = page.locator('[data-metric="ritual-rsvp-sign-in"]');
    await expect(door).toBeVisible();
    await expect(door).toHaveText(/Me apunto/);
    await expect(door).toHaveAttribute(
      'href',
      `/es/lap/session/?vuelta=${encodeURIComponent(`/es/rituals/${TRG}/`)}`,
    );
    await expect(page.locator('button[data-rsvp]')).toBeHidden();
    await expect(page.locator('[data-metric="ritual-add-calendar"]')).toHaveText(
      /Añadir a mi calendario/,
    );
    await expect(page.locator('[data-rsvp-count]')).toBeHidden();

    await page.goto(agendaPage());
    await expect(page.locator('[data-agenda="out"]')).toBeVisible();
    const signIn = page.locator('[data-metric="agenda-sign-in"]');
    await expect(signIn).toHaveAttribute(
      'href',
      `/es/lap/session/?vuelta=${encodeURIComponent('/es/agenda/')}`,
    );
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('the API refuses without a session', async ({ page }) => {
    const got = await page.request.get(`${origin}/api/rsvp?ids=${TRG}`);
    expect(got.status()).toBe(401);
    const sent = await page.request.post(`${origin}/api/rsvp`, {
      data: { ritualId: TRG, on: true },
    });
    expect(sent.status()).toBe(401);
  });
});

test.describe('signed in', () => {
  test('presses «Me apunto», the city remembers, the agenda lists it; «ya no voy» forgets', async ({
    page,
    context,
  }) => {
    await signIn(context, PABLO);
    await page.goto(ritualPage(TRG));
    const button = page.locator('button[data-rsvp]');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveText(/Me apunto/);
    await expect(page.locator('[data-metric="ritual-rsvp-sign-in"]')).toBeHidden();
    await expect(page.locator('[data-metric="ritual-your-agenda"]')).toBeVisible();

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveText(/Voy/);
    await expect(page.locator('.aviso[role="status"]')).toHaveText(/Apuntado/);
    await expect(page.locator(`[data-rsvp-count="${TRG}"]`)).toHaveText('1 persona va');

    // Reloaded, the page asks and paints the same.
    await page.reload();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`[data-rsvp-count="${TRG}"]`)).toHaveText('1 persona va');

    await page.goto(agendaPage());
    await expect(page.locator('[data-agenda="upcoming"] [data-metric="ritual-card"]')).toHaveCount(
      1,
    );
    await expect(page.locator('[data-agenda="upcoming"]')).toContainText('MERGE Buenos Aires');
    await expect(page.locator('[data-agenda="past"]')).toHaveCount(0);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);

    await page.goto(ritualPage(TRG));
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.aviso[role="status"]')).toHaveText(/Ya no vas/);
    await expect(page.locator(`[data-rsvp-count="${TRG}"]`)).toBeHidden();

    await page.goto(agendaPage());
    await expect(page.locator('[data-agenda="empty"]')).toBeVisible();
    await expect(page.locator('[data-metric="agenda-encounters"]')).toHaveAttribute(
      'href',
      '/es/calendar/',
    );
  });

  test('counts are public and plural, who is going is not', async ({ page, context }) => {
    await signIn(context, MARIA);
    for (const id of [MERGE]) {
      const sent = await page.request.post(`${origin}/api/rsvp`, {
        data: { ritualId: id, on: true },
      });
      expect(sent.status()).toBe(200);
    }
    await context.clearCookies();
    await signIn(context, LUIS);
    await page.goto(ritualPage(MERGE));
    const button = page.locator('button[data-rsvp]');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator(`[data-rsvp-count="${MERGE}"]`)).toHaveText('1 persona va');
    await button.click();
    await expect(page.locator(`[data-rsvp-count="${MERGE}"]`)).toHaveText('2 personas van');

    const mine = await page.request.get(`${origin}/api/rsvp?ids=${MERGE}`);
    expect(await mine.json()).toEqual({ mine: [MERGE], counts: { [MERGE]: 2 } });
    const unknown = await page.request.get(`${origin}/api/rsvp?ids=nope`);
    expect(unknown.status()).toBe(400);
    const missing = await page.request.post(`${origin}/api/rsvp`, {
      data: { ritualId: 'nope', on: true },
    });
    expect(missing.status()).toBe(404);
  });

  test('a held encounter offers the calendar only; the front page offers «Me apunto»', async ({
    page,
    context,
  }) => {
    await signIn(context, LUIS);
    await page.goto(ritualPage(HELD));
    await expect(page.locator('button[data-rsvp]')).toHaveCount(0);
    await expect(page.locator('[data-metric="ritual-add-calendar"]')).toBeVisible();

    await page.goto(`${origin}/es/`);
    // The featured frame has one slide per encounter; the first is the one shown.
    const featured = page.locator('[data-metric="home-featured-rsvp"]').first();
    await expect(featured).toBeVisible();
    await expect(featured).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-metric="home-featured-calendar"]').first()).toHaveText(
      /Añadir a mi calendario/,
    );
  });

  test('speaks every language', async ({ page, context }) => {
    await signIn(context, LUIS);
    for (const [prefix, word] of [
      ['', 'Count me in'],
      ['/ja', '参加する'],
      ['/ko', '참여할게요'],
      ['/pt-br', 'Eu vou'],
    ] as const) {
      await page.goto(ritualPage(TRG, prefix));
      await expect(page.locator('button[data-rsvp]')).toHaveText(new RegExp(word));
      await page.goto(agendaPage(prefix));
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});
