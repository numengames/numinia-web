/**
 * «Hazla tuya» for real (cut G, 2026-10-17) in a real browser against the
 * built site: a signed-in person claims a community from its page through
 * the small dialog and the strip says it was asked; the house sees the claim
 * in the Census and in that organization's Members, accepts it, and the
 * person is listed as a member and titular; a second person then asks to
 * enter and the titular accepts; a member sees no strip; signed out, the
 * button leads to sign in as before; a phone fits; axe is clean.
 *
 * Like e2e/census-list.spec.ts it starts the built server a second time, on
 * a free port, with throwaway secrets, and mints the cookies with the same
 * secret. The fixture desk keeps its requests in memory for the run, so the
 * tests of one flow run in order, each on its own community.
 */

import AxeBuilder from '@axe-core/playwright';
import { createHash, randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const HOUSE = `0x${'99'.repeat(20)}`;
const PABLO = `0x${'ab'.repeat(20)}`;
const LUCIA = '0x00000000000000000000000000000000000000a1';
const MARIA = `0x${'cd'.repeat(20)}`;

/** The till account of a community: derived from its id, as the till and the store derive it. */
const communityAccount = (community: string): string =>
  `acc_t_${createHash('sha256').update(`numinia-till community ${community}`).digest('hex').slice(0, 32)}`;

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

const communityPage = (community: string, prefix = '/es') =>
  `${origin}${prefix}/communities/${community}/`;
const census = (prefix = '/es') => `${origin}${prefix}/lap/admin/census/`;
const members = (community: string, prefix = '/es') =>
  `${origin}${prefix}/panel/miembros/?org=${communityAccount(community)}`;

/** Opens the dialog from the strip, writes the note, sends. */
async function ask(page: Page, kind: 'claim' | 'join', note: string): Promise<void> {
  const strip = page.locator('[data-claim-strip]');
  await strip.locator(`[data-claim-ask="${kind}"]`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText(
    kind === 'claim' ? 'Hazla tuya' : 'Pedir entrar',
  );
  await dialog.getByLabel('Cuéntanos quién eres').fill(note);
  await dialog.locator('[data-metric="community-request-send"]').click();
  await expect(dialog).toBeHidden();
}

test.describe.configure({ mode: 'serial' });

test.describe('a claim, from the strip to the Titular', () => {
  test('signed in, «Es mi comunidad» opens the dialog and records the claim; the strip says so', async ({
    page,
    context,
  }) => {
    await signIn(context, PABLO, 'nomad');
    await page.goto(communityPage('merge'));
    const strip = page.locator('[data-claim-strip]');
    await expect(strip.locator('[data-claim-ask="claim"]')).toBeVisible();
    await expect(strip.locator('[data-claim-signin]')).toBeHidden();
    await expect(strip).toContainText('¿Es tu comunidad?');
    await ask(page, 'claim', 'Soy Pablo, llevo Merge desde 2019');
    await expect(strip.locator('[data-claim-face="sent"]')).toHaveText(
      'Pedido. Te avisaremos cuando la casa lo confirme.',
    );
    await expect(strip.locator('[data-claim-ask="claim"]')).toBeHidden();
    // Asked again, the strip still says so (one open claim per person and community).
    await page.reload();
    await expect(strip.locator('[data-claim-face="sent"]')).toBeVisible();
  });

  test('the house sees the claim in the Census, with the community’s name, and accepts it there: the person is a member and the Titular', async ({
    page,
    context,
  }) => {
    await signIn(context, HOUSE, 'oracle');
    await page.goto(census());
    const list = page.locator('[data-requests="all"]');
    await expect(list).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Peticiones' })).toBeVisible();
    const row = list.locator('tr[data-request][data-request-kind="claim"]').first();
    await expect(row).toContainText('Merge');
    await expect(row).toContainText('Quiere llevarla');
    await expect(row).toContainText('Soy Pablo, llevo Merge desde 2019');
    await expect(row).toContainText('0xabab…abab');
    // The organization of Merge is not open yet: the house decides from here.
    await row.getByRole('button', { name: /Aceptar la petición de/ }).click();
    await expect(page.locator('[data-requests-notices]')).toContainText('Aceptada: ya es titular.');
    await expect(list.locator('tr[data-request]')).toHaveCount(0);
    await expect(list).toContainText('No hay peticiones abiertas.');

    await page.goto(members('merge'));
    const person = page.locator(`tr[data-person="${PABLO}"]`);
    await expect(person).toBeVisible();
    await expect(person).toContainText('Titular');
    await expect(page.locator('[data-requests="merge"]')).toHaveCount(0);
  });

  test('a member sees no strip; the log says what happened', async ({ page, context }) => {
    await signIn(context, PABLO, 'nomad');
    await page.goto(communityPage('merge'));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-claim-strip]')).toBeHidden();
    await page.goto(members('merge'));
    await page.locator('[data-metric="panel-log-toggle"]').click();
    await expect(page.locator('[data-panel-log]')).toContainText('Petición aceptada');
  });
});

test.describe('a join, once somebody runs the community', () => {
  test('the strip offers «Quiero entrar», and the ask is recorded', async ({ page, context }) => {
    await signIn(context, MARIA, 'nomad');
    await page.goto(communityPage('merge'));
    const strip = page.locator('[data-claim-strip]');
    await expect(strip.locator('[data-claim-ask="join"]')).toBeVisible();
    await expect(strip.locator('[data-claim-ask="claim"]')).toBeHidden();
    await expect(strip).toContainText('¿Quieres entrar?');
    await ask(page, 'join', '');
    await expect(strip.locator('[data-claim-face="sent"]')).toHaveText(
      'Pedido. Alguien de la comunidad lo verá.',
    );
  });

  test('the Titular accepts it from Members and the person is listed', async ({
    page,
    context,
  }) => {
    await signIn(context, PABLO, 'nomad');
    await page.goto(members('merge'));
    const section = page.locator(`[data-requests="merge"]`);
    const row = section.locator('tr[data-request][data-request-kind="join"]');
    await expect(row).toContainText('Quiere entrar');
    await section.getByRole('button', { name: /Aceptar la petición de/ }).click();
    await expect(page.locator('[data-requests-notices]')).toContainText('Aceptada: ya es miembro.');
    await expect(page.locator(`tr[data-person="${MARIA}"]`)).toBeVisible();
  });

  test('declining only writes it down', async ({ page, context }) => {
    await signIn(context, LUCIA, 'nomad');
    await page.goto(communityPage('merge'));
    await ask(page, 'join', 'Hola');
    await signIn(context, PABLO, 'nomad');
    await page.goto(members('merge'));
    const section = page.locator(`[data-requests="merge"]`);
    await section.getByRole('button', { name: /Rechazar la petición de Lucía Vidal/ }).click();
    await expect(page.locator('[data-requests-notices]')).toContainText('Rechazada.');
    await expect(page.locator(`tr[data-person="${LUCIA}"]`)).toHaveCount(0);
    await expect(section).toBeHidden();
  });
});

test.describe('signed out, and the note', () => {
  test('signed out the button leads to sign in and back, as before', async ({ page }) => {
    await page.goto(communityPage('reset'));
    const strip = page.locator('[data-claim-strip]');
    await page.waitForLoadState('networkidle');
    const signInLink = strip.locator('[data-claim-signin]');
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute(
      'href',
      /\/lap\/session\/\?vuelta=.*communities.*reset/,
    );
    await expect(strip.locator('[data-claim-ask="claim"]')).toBeHidden();
    const direct = await page.request.post(`${origin}/api/community-request`, {
      data: { community: 'reset', kind: 'claim' },
    });
    expect(direct.status()).toBe(401);
  });

  test('a note longer than 280 characters does not go; cancel closes', async ({
    page,
    context,
  }) => {
    await signIn(context, MARIA, 'nomad');
    await page.goto(communityPage('reset'));
    const strip = page.locator('[data-claim-strip]');
    await strip.locator('[data-claim-ask="claim"]').click();
    const dialog = page.getByRole('dialog');
    const note = dialog.getByLabel('Cuéntanos quién eres');
    await expect(note).toHaveAttribute('maxlength', '280');
    await note.evaluate((input: HTMLInputElement) => {
      input.removeAttribute('maxlength');
      input.value = 'a'.repeat(281);
    });
    await dialog.locator('[data-metric="community-request-send"]').click();
    await expect(dialog.getByRole('alert')).toContainText('280');
    await dialog.locator('[data-metric="community-request-cancel"]').click();
    await expect(dialog).toBeHidden();
    await expect(strip.locator('[data-claim-ask="claim"]')).toBeVisible();
  });
});

test.describe('fit and finish', () => {
  test('the strip and the dialog fit a phone of 390 and are clean for axe', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(context, MARIA, 'nomad');
    await page.goto(communityPage('reset'));
    const strip = page.locator('[data-claim-strip]');
    await expect(strip.locator('[data-claim-ask="claim"]')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    let axe = await new AxeBuilder({ page }).include('[data-claim-strip]').analyze();
    expect(axe.violations).toEqual([]);
    await strip.locator('[data-claim-ask="claim"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    axe = await new AxeBuilder({ page }).include('[data-claim-dialog]').analyze();
    expect(axe.violations).toEqual([]);
  });

  test('the Census list is clean for axe, in English too', async ({ page, context }) => {
    await signIn(context, LUCIA, 'nomad');
    await page.goto(communityPage('reset'));
    await ask(page, 'claim', 'Reset es mío');
    await signIn(context, HOUSE, 'oracle');
    for (const prefix of ['/es', '']) {
      await page.goto(census(prefix));
      await expect(page.locator('[data-requests="all"] tr[data-request]').first()).toBeVisible();
      const axe = await new AxeBuilder({ page }).include('[data-requests]').analyze();
      expect(axe.violations).toEqual([]);
    }
    await expect(page.locator('[data-requests="all"]').getByRole('heading')).toHaveText('Requests');
  });
});
