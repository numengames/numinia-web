/**
 * «Normas de vuestros espacios» (condiciones/w2) in a real browser against the
 * built site and the fixture desk, as in panel-ajustes.spec.ts: a second built
 * server with throwaway secrets, a session cookie minted with them, the
 * fixture desk answering.
 *
 * What is under test: Numinia's fixed line (with the link to the Terms of Use),
 * the community's own points, the history of versions; an administrator who
 * edits and publishes v1.1 and sees it in the history; the validator's
 * problems next to their field, in Spanish; a data point that cannot be
 * mandatory; a member who only reads — and whose own request is refused by
 * the server; and nobody signed in: nothing. Set NORMAS_SHOT to a path to
 * keep a photo of the section (for comparing with wireframe 7).
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const ORACLE = `0x${'ab'.repeat(20)}`;
/** The fixture desk keeps each wallet's own copy for the life of the server: a wallet per test. */
let counter = 0;
const owner = (): string => `0x${'c'.repeat(30)}${String(++counter).padStart(10, '0')}`;
const MEMBER = '0x00000000000000000000000000000000000000d4';
const NUMEN = 'acc_team_numen_games';
const INSTITUTE = 'acc_team_active_inference';

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
        ADMIN_WALLET_ADDRESSES: ORACLE,
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

async function signIn(context: BrowserContext, wallet: string, rank: 'oracle' | 'nomad') {
  const now = Math.floor(Date.now() / 1000);
  const value = await createSessionToken(
    { sub: wallet, rank, iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION },
    secret,
  );
  await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
}

const panel = (page: Page) => page.locator('[data-org-panel]');
const section = (page: Page) => page.locator('[data-settings-terms]');

async function openSettings(page: Page, org = NUMEN, path = '/es/panel/ajustes/'): Promise<void> {
  await page.goto(`${origin}${path}?org=${org}`);
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
  await expect(section(page)).toHaveAttribute('data-state', 'ready');
}

test.describe('Normas de vuestros espacios', () => {
  test('shows Numinia’s fixed line first, the community’s points and the history', async ({
    page,
    context,
  }) => {
    await signIn(context, owner(), 'nomad');
    await openSettings(page);
    await expect(section(page).locator('h2')).toHaveText('Normas de vuestros espacios');
    const fixed = section(page).locator('[data-terms-fixed]');
    await expect(fixed).toContainText('Las normas de Numinia van siempre delante de las vuestras');
    await expect(fixed).toContainText('no se pueden quitar');
    await expect(fixed.getByRole('link')).toHaveAttribute('href', '/es/legal/terms/');
    await expect(fixed.getByRole('textbox')).toHaveCount(0);
    await expect(fixed.getByRole('button')).toHaveCount(0);
    // Fixed comes first, then the community's own.
    const order = await section(page).evaluate((node) => {
      const fixedAt = node.querySelector('[data-terms-fixed]');
      const ownAt = node.querySelector('[data-terms-editor]');
      return fixedAt !== null && ownAt !== null
        ? Boolean(fixedAt.compareDocumentPosition(ownAt) & Node.DOCUMENT_POSITION_FOLLOWING)
        : false;
    });
    expect(order).toBe(true);
    await expect(section(page).locator('[data-terms-draft-point]')).toHaveCount(3);
    await expect(section(page).locator('[data-terms-version]')).toHaveText(/v1\.0/);
    await expect(section(page).locator('#normas-version')).toHaveValue('1.1');
    await expect(section(page).getByRole('button', { name: 'Publicar versión 1.1' })).toBeVisible();
    const shot = process.env['NORMAS_SHOT'];
    if (shot !== undefined && shot !== '') {
      await section(page).scrollIntoViewIfNeeded();
      await section(page).screenshot({ path: shot });
      await page.screenshot({ path: shot.replace(/\.png$/, '-pagina.png'), fullPage: true });
    }
  });

  test('an administrator edits, publishes v1.1 and sees it in the history', async ({
    page,
    context,
  }) => {
    await signIn(context, owner(), 'nomad');
    await openSettings(page);
    await section(page).getByRole('button', { name: '+ Añadir una norma' }).click();
    const added = section(page).locator('[data-terms-draft-point="3"]');
    await added.getByLabel('Título').fill('Respeto');
    await added.getByLabel('Texto').fill('Tratamos a todo el mundo con respeto.');
    await added.getByRole('button', { name: 'Obligatoria', exact: true }).click();
    await section(page).getByRole('button', { name: 'Publicar versión 1.1' }).click();
    await expect(section(page).locator('[data-terms-status]')).toHaveAttribute(
      'data-terms-status',
      'saved',
    );
    await expect(section(page).locator('[data-terms-status]')).toContainText(
      'Publicada la versión 1.1.',
    );
    await expect(section(page).locator('[data-terms-version]')).toHaveCount(2);
    await expect(section(page).locator('[data-terms-version]').first()).toContainText('v1.1');
    await expect(section(page).locator('[data-terms-version]').first()).toContainText('4 puntos');
    // It persists: another visit has v1.1 in force and proposes the next number.
    await openSettings(page);
    await expect(section(page).locator('[data-terms-version]')).toHaveCount(2);
    await expect(section(page).locator('#normas-version')).toHaveValue('1.2');
  });

  test('a data point can never be mandatory: the control is off and says why', async ({
    page,
    context,
  }) => {
    await signIn(context, owner(), 'nomad');
    await openSettings(page);
    const data = section(page).locator('[data-terms-draft-point="2"]');
    await expect(data.locator('[data-terms-data-note]')).toHaveText(
      'Los datos nunca pueden ser obligatorios: quien los rechaza entra igual.',
    );
    await expect(data.getByRole('button', { name: 'Obligatoria', exact: true })).toBeDisabled();
    await expect(data.getByRole('button', { name: 'Opcional', exact: true })).toBeDisabled();
    const norm = section(page).locator('[data-terms-draft-point="0"]');
    await expect(norm.locator('[data-terms-data-note]')).toHaveCount(0);
    await norm.getByRole('button', { name: 'Datos', exact: true }).click();
    await expect(norm.locator('[data-terms-data-note]')).toBeVisible();
    await expect(norm.getByRole('button', { name: 'Obligatoria', exact: true })).toBeDisabled();
  });

  test('the validator’s problems show next to their field, in Spanish; nothing is published', async ({
    page,
    context,
  }) => {
    await signIn(context, owner(), 'nomad');
    await openSettings(page);
    const first = section(page).locator('[data-terms-draft-point="0"]');
    await first.getByLabel('Título').fill('');
    await section(page).locator('#normas-version').fill('1.0');
    await section(page).getByRole('button', { name: 'Publicar versión 1.0' }).click();
    await expect(section(page).locator('[data-terms-status]')).toHaveAttribute(
      'data-terms-status',
      'failed',
    );
    await expect(first.locator('[data-terms-problem]')).not.toHaveCount(0);
    await expect(first.getByLabel('Título')).toHaveAttribute('aria-invalid', 'true');
    await expect(first.locator('[data-terms-problem]').first()).toContainText(/[a-záéíóú]/i);
    await expect(section(page).locator('[data-terms-version]')).toHaveCount(1);
    // Taking the title back and a used version number: the version's own problem sits by its field.
    await first.getByLabel('Título').fill('Turno de palabra');
    await section(page).getByRole('button', { name: 'Publicar versión 1.0' }).click();
    await expect(section(page).locator('#normas-version-p')).toContainText('ya está publicada');
    await expect(section(page).locator('[data-terms-version]')).toHaveCount(1);
  });

  test('a plain member reads: no editor, no button, and the server refuses their own request', async ({
    page,
    context,
  }) => {
    await signIn(context, MEMBER, 'nomad');
    await openSettings(page, INSTITUTE);
    await expect(section(page).locator('[data-terms-fixed]')).toBeVisible();
    await expect(section(page).locator('[data-terms-readonly]')).toContainText('Tú puedes leerlas');
    await expect(section(page).locator('[data-terms-editor]')).toHaveCount(0);
    await expect(section(page).getByRole('button', { name: /Publicar/ })).toHaveCount(0);
    await expect(section(page).getByRole('textbox')).toHaveCount(0);
    const refused = await page.request.post(`${origin}/api/saldo/terms`, {
      data: {
        accountId: INSTITUTE,
        version: '1.0',
        puntos: [{ id: 'x', titulo: 'X', texto: 'X', obligatorio: false, tipo: 'norma' }],
      },
    });
    expect(refused.status()).toBe(403);
    const read = await page.request.get(`${origin}/api/saldo/terms?cuenta=${INSTITUTE}`);
    const after = (await read.json()) as { terms: { history: unknown[]; mayEdit: boolean } };
    expect(after.terms.history).toHaveLength(1);
    expect(after.terms.mayEdit).toBe(false);
  });

  test('a plain member sees the published points of the version in force', async ({
    page,
    context,
  }) => {
    await signIn(context, MEMBER, 'nomad');
    await openSettings(page, INSTITUTE);
    await expect(section(page).locator('[data-terms-editor]')).toHaveCount(0);
    await expect(section(page).locator('[data-terms-point]')).toHaveCount(2);
    await expect(section(page).locator('[data-terms-point="fuentes"]')).toContainText(
      'Obligatoria',
    );
    await expect(section(page).locator('[data-terms-point="informe"]')).toContainText('Datos');
    await expect(section(page).locator('[data-terms-version]')).toHaveCount(1);
  });

  test('signed out there is nothing: the screen asks to sign in and the API answers 401', async ({
    page,
  }) => {
    await page.goto(`${origin}/es/panel/ajustes/?org=${NUMEN}`);
    await expect(section(page)).toHaveCount(0);
    expect((await page.request.get(`${origin}/api/saldo/terms?cuenta=${NUMEN}`)).status()).toBe(
      401,
    );
    expect(
      (
        await page.request.post(`${origin}/api/saldo/terms`, { data: { accountId: NUMEN } })
      ).status(),
    ).toBe(401);
  });

  test('fits a 390-pixel phone and passes axe', async ({ page, context }) => {
    await signIn(context, owner(), 'nomad');
    await page.setViewportSize({ width: 390, height: 800 });
    await openSettings(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
