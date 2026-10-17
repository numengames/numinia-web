/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17) in a real browser
 * against the built site: the form for someone who runs a community (the
 * fixture's wallet administers Numen Games), publish → the encounter's page
 * with its toast; the encounter appears on /calendar/ and on «Ahora» (the
 * live slot); cancel → the page says so and the lists lose it; signed out →
 * the door; «Crear» offers it; a phone of 390 fits; axe is clean.
 *
 * Like e2e/agenda.spec.ts it starts the built server a second time, on a
 * free port, with throwaway secrets, and mints the cookies with the same
 * secret. The fixture desk keeps its encounters in memory for the run, so
 * the tests run in order.
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

let server: ChildProcess | undefined;
let origin = '';
let secret = '';
let stderr = '';
let published = '';

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

const formPage = (prefix = '/es') => `${origin}${prefix}/crear/encuentro/`;
const nextMonth = (): string => {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1, 15);
  return date.toISOString().slice(0, 10);
};

test.describe.configure({ mode: 'serial' });

test('signed out, the form is the door', async ({ page }) => {
  await page.goto(formPage());
  const door = page.locator('[data-create-encounter="out"]');
  await expect(door).toBeVisible();
  const href = await door.locator('[data-metric="create-encounter-sign-in"]').getAttribute('href');
  expect(href).toContain('/es/lap/session/?vuelta=%2Fes%2Fcrear%2Fencuentro%2F');
});

test('«Crear» in the rail offers «Un encuentro» after the community', async ({ page }) => {
  await page.goto(`${origin}/es/`);
  const item = page.locator('[data-metric="you-create-encounter"]');
  await expect(item).toHaveAttribute('href', '/es/crear/encuentro/');
  await expect(item).toContainText('Un encuentro');
  await expect(item).toContainText('Para una comunidad que llevas');
});

test('an administrator fills the form, publishes, and lands on the page with the toast', async ({
  page,
  context,
}) => {
  await signIn(context, PABLO);
  await page.goto(formPage());
  const form = page.locator('[data-create-encounter="form"]');
  await expect(form).toBeVisible();
  // The fixture's wallet runs Numen Games alone: preselected.
  await expect(form.locator('input[name="community"]')).toHaveValue('numen-games');
  await expect(form.locator('#enc-comunidad')).toHaveText('Numen Games');
  // Publishing with nothing says which field.
  await form.locator('[data-metric="create-encounter-publish"]').click();
  await expect(form.locator('[data-problem="title"]')).toBeVisible();
  await form.locator('#enc-titulo').fill('Taller de Hyperfy');
  await form.locator('#enc-dia').fill(nextMonth());
  await form.locator('#enc-sitio').fill('La Nave, Madrid');
  await form.locator('#enc-nota').fill('Trae portátil.');
  await form.locator('[data-metric="create-encounter-publish"]').click();
  await page.waitForURL(/\/es\/rituals\/rit_[0-9a-f]{16}\/(\?publicado=1)?$/);
  published = /rit_[0-9a-f]{16}/.exec(page.url())?.[0] ?? '';
  expect(published).toMatch(/^rit_[0-9a-f]{16}$/);
  await expect(page.locator('h1')).toHaveText('Taller de Hyperfy');
  await expect(page.locator('[data-ritual-toast]')).toHaveText(
    'Publicado. Ya está en el calendario de la ciudad.',
  );
  await expect(page.locator('[data-ritual-cancel]')).toBeVisible();
  await expect(page.locator('[data-ritual-cancelled]')).toHaveCount(0);
});

test('the encounter appears in the calendar list and on «Ahora» through the live slot', async ({
  page,
}) => {
  await page.goto(`${origin}/es/calendar/`);
  const row = page.locator(`[data-rituals-live-row="${published}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText('Taller de Hyperfy');
  await expect(row).toContainText('Numen Games · La Nave, Madrid');
  await expect(row.locator('a')).toHaveAttribute('href', `/es/rituals/${published}/`);
  await page.goto(`${origin}/es/`);
  await expect(page.locator(`[data-rituals-live-row="${published}"]`)).toBeVisible();
  await page.goto(`${origin}/es/communities/numen-games/`);
  await expect(page.locator(`[data-rituals-live-row="${published}"]`)).toBeVisible();
  const ics = await page.request.get(`${origin}/rituals/${published}.ics`);
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain('Taller de Hyperfy');
});

test('its creator cancels it through the dialog; the page says so and the lists lose it', async ({
  page,
  context,
}) => {
  await signIn(context, PABLO);
  await page.goto(`${origin}/es/rituals/${published}/`);
  await page.locator('[data-ritual-cancel]').click();
  const dialog = page.locator('[data-ritual-cancel-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText('¿Cancelar este encuentro?');
  await dialog.locator('[data-ritual-cancel-keep]').click();
  await expect(dialog).toBeHidden();
  await page.locator('[data-ritual-cancel]').click();
  await dialog.locator('[data-ritual-cancel-confirm]').click();
  await expect(page.locator('[data-ritual-cancelled]')).toHaveText('Cancelado');
  await expect(page.locator('[data-ritual-cancelled-lead]')).toBeVisible();
  await expect(page.locator('[data-ritual-cancel]')).toHaveCount(0);
  await page.goto(`${origin}/es/calendar/`);
  await expect(page.locator('[data-rituals-live]')).toBeHidden();
  await expect(page.locator(`[data-rituals-live-row="${published}"]`)).toHaveCount(0);
});

test('the form fits a phone of 390 and is clean for axe, as is the published page', async ({
  page,
  context,
}) => {
  await signIn(context, PABLO);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(formPage());
  const form = page.locator('[data-create-encounter="form"]');
  await expect(form).toBeVisible();
  const width = await form.evaluate((element) => element.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(390);
  const axe = await new AxeBuilder({ page }).include('main').analyze();
  expect(axe.violations).toEqual([]);
  await page.goto(`${origin}/es/rituals/${published}/`);
  const again = await new AxeBuilder({ page }).include('main').analyze();
  expect(again.violations).toEqual([]);
});
