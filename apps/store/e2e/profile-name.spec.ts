/**
 * «Tu nombre en la ciudad» (cut «Tu nombre y tu cara», 2026-10-16) in a real
 * browser against the built site: signed out there is no section and nothing
 * is asked; signed in, the local citizen name only fills the input — nothing
 * is sent until «Guardar» —, a name and a Bazar avatar are published,
 * changed and removed for real; the till not there yet is said; the section
 * fits a phone and is clean for axe; and on a community page a member sees
 * the names and faces people published, a visitor only how many.
 *
 * Like e2e/house.spec.ts it tests the real plumbing — the session cookie,
 * /api/profile, the fixture desk (`DATA_SOURCE` is frozen into the build as
 * `fixture`) — so it starts the built server a second time, on a free port,
 * with throwaway secrets, and mints the cookies with the same secret. The
 * fixture desk keeps profiles per server process: each test signs in with a
 * wallet of its own.
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { SHEET_RECORD_KEY, citizenToMarkdown, emptyCitizen } from '../src/lib/citizen-profile';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const ARLA = 'avatar-arla-mncdhz3l';
const LYRA = 'ndg-019d3e6c-129a-701e-95fc-ce1754d5c917';
const faceOf = (id: string): string => `/thumbs/1x/${id}.webp`;
/** A wallet of its own for each test: the fixture desk remembers what each publishes. */
const walletFor = (n: number): string => `0x${n.toString(16).padStart(2, '0').repeat(20)}`;

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
  // Throwaway secrets, made here and never written down.
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

/** A session the server itself signed, as at sign-in: any rank may publish a name. */
async function signIn(context: BrowserContext, wallet: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const value = await createSessionToken(
    { sub: wallet, rank: 'nomad', iat: now, exp: now + 3_600, terms: LEGAL_CORPUS_VERSION },
    secret,
  );
  await context.addCookies([{ name: 'numinia_session', value, url: origin }]);
}

/** What the till keeps for the session's wallet, asked as the browser would. */
async function profileOf(page: Page): Promise<unknown> {
  return (await page.request.get(`${origin}/api/profile`)).json();
}

/** Every request the page itself sends to /api/profile, by method. */
function asked(page: Page): string[] {
  const methods: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/profile') methods.push(request.method());
  });
  return methods;
}

test('signed out there is no section, and nothing is asked', async ({ page }) => {
  const methods = asked(page);
  await page.goto(`${origin}/es/lap/settings/`);
  await expect(page.locator('html')).toHaveAttribute('data-session', 'out');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#nombre')).toBeHidden();
  expect(methods).toEqual([]);
  expect((await page.request.get(`${origin}/api/profile`)).status()).toBe(401);
});

test('the local citizen name only fills the input: nothing is sent until «Guardar»', async ({
  page,
  context,
}) => {
  await signIn(context, walletFor(2));
  const record = citizenToMarkdown({ ...emptyCitizen(), name: 'Rima Local' });
  await context.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: SHEET_RECORD_KEY,
    value: record,
  });
  const methods = asked(page);
  await page.goto(`${origin}/es/lap/settings/`);
  const section = page.locator('#nombre');
  await expect(section.getByRole('heading', { name: 'Tu nombre en la ciudad' })).toBeVisible();
  await expect(section.locator('[data-profile-who]')).toHaveText(
    'Lo ven las personas de tus organizaciones y, mientras dura la alfa, el equipo de Numen Games cuando entra a ayudar. Nadie más.',
  );
  const input = section.getByLabel('Tu nombre');
  await expect(input).toHaveValue('Rima Local');
  await expect(section.getByRole('radio', { name: 'Sin avatar' })).toBeChecked();
  await expect(section.getByRole('button', { name: 'Dejar de mostrarlo' })).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(methods).toEqual(['GET']);
  expect(await profileOf(page)).toEqual({ ok: true, profile: null });
  // A name that cannot be shown is said in plain words, and not sent either.
  await input.fill('   ');
  await section.getByRole('button', { name: 'Guardar' }).click();
  await expect(section.locator('[data-profile-problem]')).toContainText('de 1 a 60 caracteres');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(methods).toEqual(['GET']);
  expect(await profileOf(page)).toEqual({ ok: true, profile: null });
});

test('publish, change the avatar, stop showing it: the till keeps exactly what was saved', async ({
  page,
  context,
}) => {
  await signIn(context, walletFor(3));
  await page.goto(`${origin}/es/lap/settings/#nombre`);
  const section = page.locator('#nombre');
  const status = section.locator('[data-profile-status]');
  await section.getByLabel('Tu nombre').fill('  Rima  ');
  await section.getByRole('radio', { name: 'Avatar Arla' }).check();
  await section.getByRole('button', { name: 'Guardar' }).click();
  await expect(status).toHaveText('Guardado. Ya lo ven las personas de tus organizaciones.');
  expect(await profileOf(page)).toEqual({
    ok: true,
    profile: { name: 'Rima', avatar: ARLA, face: faceOf(ARLA) },
  });

  await page.reload();
  await expect(section.getByLabel('Tu nombre')).toHaveValue('Rima');
  await expect(section.getByRole('radio', { name: 'Avatar Arla' })).toBeChecked();
  await section.getByRole('radio', { name: 'Avatar Lyra' }).check();
  await section.getByRole('button', { name: 'Guardar' }).click();
  await expect(status).toHaveText('Guardado. Ya lo ven las personas de tus organizaciones.');
  expect(await profileOf(page)).toEqual({
    ok: true,
    profile: { name: 'Rima', avatar: LYRA, face: faceOf(LYRA) },
  });

  const remove = section.getByRole('button', { name: 'Dejar de mostrarlo' });
  await remove.click();
  // Asked first; «Cancelar» leaves everything as it was.
  await section.getByRole('button', { name: 'Cancelar' }).click();
  expect((await profileOf(page)) as object).toMatchObject({ profile: { name: 'Rima' } });
  await remove.click();
  await section.getByRole('button', { name: 'Sí, dejar de mostrarlo' }).click();
  await expect(status).toHaveText('Hecho: tu nombre ya no se muestra a nadie y no queda guardado.');
  expect(await profileOf(page)).toEqual({ ok: true, profile: null });
  await expect(remove).toBeHidden();
  await expect(section.getByRole('radio', { name: 'Sin avatar' })).toBeChecked();
});

test('a till that is not there yet is said, and nothing can be sent', async ({ page, context }) => {
  await signIn(context, walletFor(4));
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 503, json: { error: 'not-bound' } }),
  );
  await page.goto(`${origin}/es/lap/settings/`);
  const section = page.locator('#nombre');
  await expect(section.locator('[data-profile-unavailable]')).toHaveText(
    'Todavía no está disponible: pronto podrás elegir aquí tu nombre y tu avatar.',
  );
  await expect(section.locator('[data-profile-form]')).toBeHidden();
});

test('on a phone the section fits, and it is clean for axe', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(context, walletFor(5));
  await page.goto(`${origin}/es/lap/settings/#nombre`);
  const section = page.locator('#nombre');
  await expect(section.getByLabel('Tu nombre')).toBeEditable();
  const widest = await section.evaluate((root) =>
    Math.max(
      ...[root, ...root.querySelectorAll('*')]
        .map((node) => node.getBoundingClientRect())
        .filter((box) => box.width > 0 && box.height > 0)
        .map((box) => box.right),
    ),
  );
  expect(widest).toBeLessThanOrEqual(390);
  const axe = await new AxeBuilder({ page }).include('#nombre').analyze();
  expect(axe.violations).toEqual([]);
});

test('in English the section speaks English', async ({ page, context }) => {
  await signIn(context, walletFor(6));
  await page.goto(`${origin}/lap/settings/`);
  const section = page.locator('#nombre');
  await expect(section.getByRole('heading', { name: 'Your name in the city' })).toBeVisible();
  await expect(section.locator('[data-profile-who]')).toContainText('Nobody else.');
  await expect(section.getByRole('radio', { name: 'No avatar' })).toBeChecked();
  await expect(section.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('on a community page a member sees the names and faces people published; a visitor only how many', async ({
  page,
  context,
}) => {
  await page.goto(`${origin}/es/communities/numen-games/`);
  const slot = page.locator('[data-people="numen-games"]');
  await expect(slot.locator('[data-people-count]')).toHaveText('3 miembros');
  await expect(slot.locator('.gente-persona')).toHaveCount(0);
  await expect(slot).not.toContainText('Lucía Vidal');

  await signIn(context, walletFor(7));
  await page.reload();
  await expect(slot.locator('.gente-persona')).toHaveCount(3);
  const lucia = slot.locator('.gente-persona', { hasText: 'Lucía Vidal' });
  await expect(lucia.locator('.gente-nombre')).toHaveText('Lucía Vidal');
  await expect(lucia).toContainText('0x0000…00a1');
  const face = lucia.locator('img.gente-cara');
  await expect(face).toHaveAttribute('src', faceOf(ARLA));
  await expect(face).toHaveAttribute('alt', '');
  await expect(face).toHaveAttribute('loading', 'lazy');
  const marco = slot.locator('.gente-persona', { hasText: 'Marco Ibáñez' });
  await expect(marco).toContainText('0x0000…00b2');
  await expect(marco.locator('img')).toHaveCount(0);
  // Whoever published nothing is their short wallet, as before.
  const you = slot.locator('.gente-persona', { hasText: '(tú)' });
  await expect(you.locator('.gente-nombre')).toHaveCount(0);
  const axe = await new AxeBuilder({ page }).include('[data-people]').analyze();
  expect(axe.violations).toEqual([]);
});
