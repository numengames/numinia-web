/**
 * «MCP remoto», story W4: the «Conecta tu IA» consent, /conectar-ia/, in a
 * real browser against the built site. Like e2e/agenda.spec.ts it starts the
 * built server a second time (the page is rendered on demand) on a free port
 * with throwaway secrets; the fixture desk is the till, per process, and its
 * `self` member is whoever signs in — admin of «Numen Games».
 *
 * In the five locales: the app's name, the machine it goes back to and the
 * localhost warning; signed out, the door that comes back here; a link that
 * is missing something shows no form; the POST refuses without this site's
 * Origin (403); signed in, the community, the role, the «no oirá» line,
 * «Permitir» connects and «Cancelar» connects nothing; axe.
 *
 * With SHOTS_DIR set, the states are also saved as screenshots there.
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { CONECTAR_IA_UI } from '../src/i18n/conectar-ia';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const ANA = `0x${'ab'.repeat(20)}`;
const REQ = 'req_e2e_0123456789';
const LOCALES = [
  { locale: 'es', prefix: '/es' },
  { locale: 'en', prefix: '' },
  { locale: 'ja', prefix: '/ja' },
  { locale: 'ko', prefix: '/ko' },
  { locale: 'pt-br', prefix: '/pt-br' },
] as const;

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
  // `localhost`, not 127.0.0.1: without `security.allowedDomains` Astro's node server builds
  // every request's URL as http://localhost:PORT, and the POST compares the Origin with it.
  origin = `http://localhost:${port}`;
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

const query = (host: string, app = 'Claude') =>
  `?${new URLSearchParams({ app, host, req: REQ }).toString()}`;
const consent = (prefix: string, host = 'localhost', app = 'Claude') =>
  `${origin}${prefix}/conectar-ia/${query(host, app)}`;

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env['SHOTS_DIR'];
  if (dir) await page.screenshot({ path: `${dir}/conectar-ia-${name}.png`, fullPage: true });
}

test.describe('the consent, signed out', () => {
  for (const { locale, prefix } of LOCALES) {
    test(`${locale}: shows the app, the machine in large type and the localhost warning, and the door back`, async ({
      page,
    }) => {
      const t = CONECTAR_IA_UI[locale];
      const response = await page.goto(consent(prefix));
      expect(response?.status()).toBe(200);
      expect(response?.headers()['cache-control']).toContain('no-store');
      await expect(page.locator('h1')).toHaveText(t.title);
      await expect(page.locator('[data-consent-app]')).toHaveText('Claude');
      const host = page.locator('[data-consent-host]');
      await expect(host).toHaveText('localhost');
      const size = await host.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeGreaterThanOrEqual(28);
      await expect(page.locator('[data-consent-loopback]')).toHaveText(t.loopback);
      const door = page.locator('[data-metric="connect-ai-sign-in"]');
      await expect(door).toHaveText(t.signIn);
      await expect(door).toHaveAttribute(
        'href',
        `${prefix}/lap/session/?vuelta=${encodeURIComponent(`${prefix}/conectar-ia/${query('localhost')}`)}`,
      );
      await expect(page.locator('[data-consent-form]')).toHaveCount(0);
      await expect(page.locator('[data-metric="connect-ai-allow"]')).toHaveCount(0);
      await expect(page.locator('[data-metric="connect-ai-cancel"]')).toHaveText(t.cancel);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await shot(page, `${locale}-fuera`);
    });
  }

  test('a host that is not this computer gets no warning', async ({ page }) => {
    await page.goto(consent('/es', 'claude.ai'));
    await expect(page.locator('[data-consent-host]')).toHaveText('claude.ai');
    await expect(page.locator('[data-consent-loopback]')).toHaveCount(0);
  });

  test('a link missing something shows no form at all', async ({ page }) => {
    for (const bad of [
      `${origin}/es/conectar-ia/`,
      `${origin}/es/conectar-ia/?app=Claude&host=claude.ai`,
      `${origin}/es/conectar-ia/?app=Claude&host=https%3A%2F%2Fevil&req=${REQ}`,
    ]) {
      await page.goto(bad);
      await expect(page.locator('[data-consent="bad"]')).toContainText(CONECTAR_IA_UI.es.badTitle);
      await expect(page.locator('[data-consent-host]')).toHaveCount(0);
      await expect(page.locator('[data-metric^="connect-ai-"]')).toHaveCount(0);
    }
  });
});

test.describe('the POST', () => {
  const sent = {
    req: REQ,
    app: 'Claude',
    host: 'localhost',
    accountId: 'acc_team_numen_games',
    ai: { kind: 'new', name: 'Claude de Ana' },
    roleId: null,
  };

  test('refuses without this site’s Origin (CSRF): 403, nothing made', async ({
    context,
    page,
  }) => {
    await signIn(context, ANA);
    const bare = await page.request.post(`${origin}/api/conectar-ia`, { data: sent });
    expect(bare.status()).toBe(403);
    expect(await bare.json()).toEqual({ ok: false, refusal: 'forbidden' });
    const foreign = await page.request.post(`${origin}/api/conectar-ia`, {
      data: sent,
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.status()).toBe(403);
  });

  test('signed out it answers 401, and a form body 415', async ({ page }) => {
    const out = await page.request.post(`${origin}/api/conectar-ia`, {
      data: sent,
      headers: { origin },
    });
    expect(out.status()).toBe(401);
    const form = await page.request.post(`${origin}/api/conectar-ia`, {
      form: { req: REQ },
      headers: { origin },
    });
    expect([401, 415]).toContain(form.status());
  });
});

test.describe('the consent, signed in', () => {
  test('es: the community, the role, «no oirá», and «Permitir» connects', async ({
    context,
    page,
  }) => {
    const t = CONECTAR_IA_UI.es;
    await signIn(context, ANA);
    await page.goto(consent('/es'));
    await expect(page.locator('[data-consent="ok"]')).toBeVisible();
    await expect(page.locator('[data-consent-form]')).toContainText('Numen Games');
    await expect(page.locator('[data-consent-hear]')).toContainText(t.hearHint);
    await expect(page.locator('[data-metric="connect-ai-hear"]')).not.toBeChecked();
    await expect(page.locator('[data-metric="connect-ai-new"]').first()).toBeChecked();
    const name = page.locator('[data-metric="connect-ai-name"]:visible');
    await expect(name).toHaveValue('Claude');
    await name.fill('Claude de Ana');
    const role = page.locator('[data-metric="connect-ai-role"]:visible');
    await expect(role.locator('option').first()).toHaveText(t.roleNone);
    await shot(page, 'es-dentro');
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);

    await page.locator('[data-metric="connect-ai-allow"]').click();
    const done = page.locator('[data-consent-done]');
    await expect(done).toBeVisible();
    await expect(done).toHaveText(
      t.done.replace('{name}', 'Claude de Ana').replace('{app}', 'Claude'),
    );
    await expect(page.locator('[data-consent-body]')).toBeHidden();
    await shot(page, 'es-hecho');

    // Asking again offers to reconnect it; a new one with the same name is refused in words.
    await page.goto(consent('/es'));
    await expect(page.locator('[data-metric="connect-ai-again"]').first()).toBeVisible();
    await page.locator('[data-metric="connect-ai-name"]:visible').fill('Claude de Ana');
    await page.locator('[data-metric="connect-ai-allow"]').click();
    await expect(page.locator('[data-consent-problem]')).toHaveText(t.refusals.taken);
  });

  test('«Cancelar» connects nothing', async ({ context, page }) => {
    await signIn(context, ANA);
    await page.goto(consent('/es', 'claude.ai'));
    await page.locator('[data-metric="connect-ai-cancel"]').click();
    await expect(page.locator('[data-consent-cancelled]')).toHaveText(CONECTAR_IA_UI.es.cancelled);
    await expect(page.locator('[data-consent-body]')).toBeHidden();
  });
});
