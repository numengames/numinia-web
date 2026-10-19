/**
 * Cut O (2026-10-18), till encounters are whole, in a real browser against
 * the built site: an administrator publishes an encounter three days ahead;
 * its page shows «Me apunto»; pressed, the city remembers — it is in
 * /agenda/ with its `.ics`, in «Avisos» as the same notice a file gets; the
 * month grid of /calendar/ hangs it on its day; the live feed carries it
 * while the static one does not; cancelled → gone from the grid and the
 * feed; axe clean; a phone of 390 fits.
 *
 * Like e2e/crear-encuentro.spec.ts it starts the built server a second
 * time, on a free port, with throwaway secrets, and mints the cookies with
 * the same secret. The fixture desks keep their rows in memory for the run,
 * so the tests run in order.
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
const HOUSE = `0x${'99'.repeat(20)}`;
const TITLE = 'Paseo por la Ciudad';

let server: ChildProcess | undefined;
let origin = '';
let secret = '';
let stderr = '';
let published = '';
let day = '';

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

async function signIn(context: BrowserContext, wallet: string, rank = 'nomad'): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const value = await createSessionToken(
    { sub: wallet, rank, iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION } as never,
    secret,
  );
  await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
}

/** Three days ahead: inside the 14 days a notice looks at, and inside the four months the grid builds. */
const inThreeDays = (): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
};

test.describe.configure({ mode: 'serial' });

test('an administrator publishes an encounter; its page offers «Me apunto» and takes it', async ({
  page,
  context,
}) => {
  await signIn(context, PABLO);
  await page.goto(`${origin}/es/crear/encuentro/`);
  const form = page.locator('[data-create-encounter="form"]');
  await expect(form).toBeVisible();
  day = inThreeDays();
  await form.locator('#enc-titulo').fill(TITLE);
  await form.locator('#enc-dia').fill(day);
  await form.locator('#enc-sitio').fill('Plaza Mayor, Madrid');
  await form.locator('[data-metric="create-encounter-publish"]').click();
  await page.waitForURL(/\/es\/rituals\/rit_[0-9a-f]{16}\/(\?publicado=1)?$/);
  published = /rit_[0-9a-f]{16}/.exec(page.url())?.[0] ?? '';
  expect(published).toMatch(/^rit_[0-9a-f]{16}$/);

  // The same button, markup and metric id the files get.
  const button = page.locator('button[data-rsvp]');
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('data-rsvp', published);
  await expect(button).toHaveAttribute('data-metric', 'ritual-rsvp');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).toHaveText(/Me apunto/);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toHaveText(/Voy/);
  await expect(page.locator('.aviso[role="status"]:not([data-ritual-toast])')).toHaveText(
    /Apuntado/,
  );
  await expect(page.locator(`[data-rsvp-count="${published}"]`)).toHaveText('1 persona va');

  // Reloaded, the page asks and paints the same.
  await page.reload();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`[data-rsvp-count="${published}"]`)).toHaveText('1 persona va');
  // The pressed style fades the primary background out: scan once it is gone,
  // or axe can read the dark text over the teal still fading (a race, not a fault).
  await expect
    .poll(() => button.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgba(0, 0, 0, 0)');

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('the API refuses a till id nobody published, and answers the count of a real one', async ({
  page,
  context,
}) => {
  await signIn(context, PABLO);
  const nobody = await page.request.post(`${origin}/api/rsvp`, {
    data: { ritualId: 'rit_0000000000000000', on: true },
  });
  expect(nobody.status()).toBe(404);
  const counted = await page.request.get(`${origin}/api/rsvp?ids=trg26,${published}`);
  expect(counted.status()).toBe(200);
  expect(await counted.json()).toEqual({ mine: [published], counts: { trg26: 0, [published]: 1 } });
});

test('it is in /agenda/ with its calendar file, and in «Avisos» as the same notice', async ({
  page,
  context,
}) => {
  await signIn(context, PABLO);
  await page.goto(`${origin}/es/agenda/`);
  const card = page.locator('[data-agenda="upcoming"] [data-metric="ritual-card"]');
  await expect(card).toHaveCount(1);
  await expect(page.locator('[data-agenda="upcoming"]')).toContainText(TITLE);
  const icsLink = page.locator(`[data-agenda="upcoming"] [data-metric="agenda-ics"]`);
  await expect(icsLink).toHaveAttribute('href', `/rituals/${published}.ics`);
  const ics = await page.request.get(`${origin}/rituals/${published}.ics`);
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain(`SUMMARY:${TITLE}`);

  await page.goto(`${origin}/es/notifications/`);
  const row = page.locator(
    `[data-notices-list] [data-notice][data-notice-id="encounter:${published}"]`,
  );
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(TITLE);
  await expect(row).toContainText('empieza en 3 días. Vas.');
  await expect(row.locator('[data-metric="notifications-calendar"]')).toHaveAttribute(
    'href',
    `/rituals/${published}.ics`,
  );
});

test('the month grid of /calendar/ hangs it on its day; the live feed carries it, the static one not', async ({
  page,
}) => {
  await page.goto(`${origin}/es/calendar/`);
  await page.locator('[data-enc-view="month"]').click();
  const cell = page.locator(`td[data-day="${day}"]`);
  await expect(cell).toHaveCount(1);
  const ev = cell.locator(`a[data-enc-live="${published}"]`);
  await expect(ev).toBeVisible();
  await expect(ev).toHaveText(TITLE);
  await expect(ev).toHaveAttribute('href', `/es/rituals/${published}/`);
  await expect(ev).toHaveAttribute('data-metric', 'calendar-ritual');
  await expect(ev).toHaveClass(/in-person/);
  // Only once however many slots or events paint.
  await expect(page.locator(`a[data-enc-live="${published}"]`)).toHaveCount(1);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(scan.violations).toEqual([]);

  await expect(page.locator('[data-metric="calendar-subscribe-live"]')).toHaveAttribute(
    'href',
    '/calendar-live.ics',
  );
  const live = await page.request.get(`${origin}/calendar-live.ics`);
  expect(live.status()).toBe(200);
  expect(live.headers()['content-type']).toContain('text/calendar');
  const feed = await live.text();
  expect(feed).toContain(`SUMMARY:${TITLE}`);
  expect(feed).toContain('SUMMARY:TRG26');
  const built = await page.request.get(`${origin}/calendar.ics`);
  expect(await built.text()).not.toContain(`SUMMARY:${TITLE}`);
});

test('a phone of 390 shows the grid with it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/es/calendar/`);
  await page.locator('[data-enc-view="month"]').click();
  const ev = page.locator(`td[data-day="${day}"] a[data-enc-live="${published}"]`);
  await expect(ev).toBeVisible();
  const width = await page
    .locator('[data-enc-grid]')
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(390);
});

test('cancelled, it leaves the grid and the live feed, and «Me apunto» goes from its page', async ({
  page,
  context,
}) => {
  await signIn(context, PABLO);
  await page.goto(`${origin}/es/rituals/${published}/`);
  await page.locator('[data-ritual-cancel]').click();
  await page.locator('[data-ritual-cancel-dialog] [data-ritual-cancel-confirm]').click();
  await expect(page.locator('[data-ritual-cancelled]')).toHaveText('Cancelado');
  await expect(page.locator('button[data-rsvp]')).toHaveCount(0);

  // The live slot fetches once the page is in; once it has, no cell carries the cancelled one.
  const fetched = page.waitForResponse((response) => response.url().includes('/api/rituals'));
  await page.goto(`${origin}/es/calendar/`);
  await fetched;
  await page.locator('[data-enc-view="month"]').click();
  await expect(page.locator(`a[data-enc-live="${published}"]`)).toHaveCount(0);
  const live = await page.request.get(`${origin}/calendar-live.ics`, {
    headers: { 'cache-control': 'no-cache' },
  });
  expect(await live.text()).not.toContain(`SUMMARY:${TITLE}`);
  // A new «voy» on it is refused as on one that is not there.
  const again = await page.request.post(`${origin}/api/rsvp`, {
    data: { ritualId: published, on: true },
  });
  expect(again.status()).toBe(404);
});
