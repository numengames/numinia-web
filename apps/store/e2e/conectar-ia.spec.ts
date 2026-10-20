/**
 * «MCP remoto», story W4: the «Conecta tu IA» consent, /conectar-ia/, in a
 * real browser against the built site. Like e2e/agenda.spec.ts it starts the
 * built server a second time (the page is rendered on demand) on a free port
 * with throwaway secrets; the fixture desk is the till, per process, and its
 * `self` member is whoever signs in — admin of «Numen Games».
 *
 * C5, the consent as a non-technical person meets it. In the five locales: the
 * three-step progress, the app's name, the machine it goes back to (large, and
 * at 390 px never broken inside a name: it breaks after a dot or scrolls) and
 * the localhost warning; signed out, what this is and the door that comes back
 * here; a link that is missing something shows no form; the POST refuses
 * without this site's Origin (403); signed in, the two lists (what it can and
 * cannot do), the community, the role, the unchecked «hear» box, «Permitir»
 * connects and shows «Listo» (step 3), «No permitir» connects nothing; with no
 * community, why and what to do; axe on each state.
 *
 * With SHOTS_DIR set, every state is also saved as screenshots there, at 1440
 * and at 390 px wide.
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
/** Leaves the one community the seed puts every wallet in, so none is left to add an AI to. */
const LONE = `0x${'cd'.repeat(20)}`;
const LONG_HOST = 'machine-1031.agents.nousresearch.com';
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

async function axeClean(page: Page): Promise<void> {
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(scan.violations).toEqual([]);
}

/** What a reader sees of the machine's name: whole pieces, on lines of their own, nothing cut inside. */
async function hostShape(page: Page) {
  return page.locator('[data-consent-host]').evaluate((host) => {
    const labels = Array.from(host.querySelectorAll<HTMLElement>('.et'));
    const box = host.getBoundingClientRect();
    return {
      text: host.textContent,
      labels: labels.length,
      brokenInside: labels.filter((label) => label.getClientRects().length !== 1).length,
      outside: labels.filter((label) => label.getBoundingClientRect().right > box.right + 1).length,
      lines: new Set(labels.map((label) => Math.round(label.getBoundingClientRect().top))).size,
      scrolls: host.scrollWidth > host.clientWidth,
      pageScrolls: document.documentElement.scrollWidth > window.innerWidth,
      // The box the name sits in must stay inside the card that holds it.
      outOfCard:
        (host.closest('.maquina')?.getBoundingClientRect().right ?? 0) >
        (host.closest('[data-consent]')?.getBoundingClientRect().right ?? 0) + 1,
      fontSize: parseFloat(getComputedStyle(host).fontSize),
    };
  });
}

/** The progress on top: which of the three is the current one, which are ticked. */
async function stepsState(page: Page): Promise<string[]> {
  return page
    .locator('[data-consent-steps] li')
    .evaluateAll((items) => items.map((item) => item.className || 'pending'));
}

async function leaveTheCommunity(page: Page, context: BrowserContext): Promise<void> {
  await signIn(context, LONE);
  const left = await page.request.post(`${origin}/api/saldo`, {
    data: { action: 'remove-member', accountId: 'acc_team_numen_games', wallet: LONE },
    headers: { origin },
  });
  expect(left.status()).toBe(200);
}

test.describe('the consent, signed out', () => {
  for (const { locale, prefix } of LOCALES) {
    test(`${locale}: three steps, the app, the machine in large type, the localhost warning, what this is and the door back`, async ({
      page,
    }) => {
      const t = CONECTAR_IA_UI[locale];
      const response = await page.goto(consent(prefix));
      expect(response?.status()).toBe(200);
      expect(response?.headers()['cache-control']).toContain('no-store');
      await expect(page.locator('h1')).toHaveText(t.title);
      await expect(page.locator('[data-consent-steps] .rotulo')).toHaveText(t.steps);
      expect(await stepsState(page)).toEqual(['hecho', 'ahora', 'pending']);
      await expect(page.locator('[data-consent-steps] li.ahora')).toHaveAttribute(
        'aria-current',
        'step',
      );
      await expect(page.locator('[data-consent-app]')).toHaveText('Claude');
      const host = page.locator('[data-consent-host]');
      await expect(host).toHaveText('localhost');
      expect((await hostShape(page)).fontSize).toBeGreaterThanOrEqual(22);
      await expect(page.locator('[data-consent-loopback]')).toHaveText(t.loopback);
      await expect(page.locator('[data-consent-body] h2')).toHaveText(t.signedOutTitle);
      await expect(page.locator('[data-consent-body]')).toContainText(t.signedOutLead);
      const door = page.locator('[data-metric="connect-ai-sign-in"]');
      await expect(door).toHaveText(t.signIn);
      await expect(door).toHaveAttribute(
        'href',
        `${prefix}/lap/session/?vuelta=${encodeURIComponent(`${prefix}/conectar-ia/${query('localhost')}`)}`,
      );
      await expect(page.locator('[data-consent-form]')).toHaveCount(0);
      await expect(page.locator('[data-metric="connect-ai-allow"]')).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    });
  }

  test('es: no accessibility violations', async ({ page }) => {
    await page.goto(consent('/es', LONG_HOST));
    await axeClean(page);
  });

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
      await expect(page.locator('[data-consent-steps]')).toHaveCount(0);
      await expect(page.locator('[data-metric^="connect-ai-"]')).toHaveCount(0);
    }
  });
});

test.describe('the machine it goes back to', () => {
  test('at 390 px a long host breaks after a dot, never inside a name (it wrapped «nousresearch.co / m» live)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(consent('/es', LONG_HOST));
    await expect(page.locator('[data-consent-host]')).toHaveText(LONG_HOST);
    const shape = await hostShape(page);
    expect(shape.labels).toBe(LONG_HOST.split(/(?<=\.)/).length);
    expect(shape.brokenInside).toBe(0);
    expect(shape.outside).toBe(0);
    expect(shape.outOfCard).toBe(false);
    expect(shape.scrolls).toBe(false);
    expect(shape.pageScrolls).toBe(false);
    // Too wide for one line at this size: it goes on to a second, between pieces.
    expect(shape.lines).toBeGreaterThan(1);
    expect(shape.fontSize).toBeGreaterThanOrEqual(18);
    // Every line of it ends where a dot is (or is the last piece).
    const ends = await page.locator('[data-consent-host] .et').evaluateAll((labels) => {
      const rows = new Map<number, string>();
      for (const label of labels) {
        rows.set(Math.round(label.getBoundingClientRect().top), label.textContent ?? '');
      }
      return Array.from(rows.values());
    });
    for (const last of ends.slice(0, -1)) expect(last.endsWith('.')).toBe(true);
  });

  test('a single name wider than the screen scrolls inside its box, whole', async ({ page }) => {
    const wide = `${'a'.repeat(60)}.example.com`;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(consent('/es', wide));
    const shape = await hostShape(page);
    expect(shape.text).toBe(wide);
    expect(shape.brokenInside).toBe(0);
    expect(shape.scrolls).toBe(true);
    expect(shape.outOfCard).toBe(false);
    expect(shape.pageScrolls).toBe(false);
  });

  test('it also fits on a desktop, on as few lines as it can, large', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(consent('/es', LONG_HOST));
    const shape = await hostShape(page);
    expect(shape.brokenInside).toBe(0);
    expect(shape.scrolls).toBe(false);
    expect(shape.lines).toBe(1);
    expect(shape.fontSize).toBeGreaterThanOrEqual(22);
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
  for (const { locale, prefix } of LOCALES) {
    test(`${locale}: the two lists, the pickers, the unchecked hear box and the two buttons`, async ({
      context,
      page,
    }) => {
      const t = CONECTAR_IA_UI[locale];
      await signIn(context, ANA);
      await page.goto(consent(prefix, 'claude.ai'));
      await expect(page.locator('[data-consent="ok"]')).toBeVisible();
      await expect(page.locator('[data-consent-steps] .rotulo')).toHaveText(t.steps);
      expect(await stepsState(page)).toEqual(['hecho', 'ahora', 'pending']);
      await expect(page.locator('[data-consent-can] h3')).toHaveText(t.canTitle);
      await expect(page.locator('[data-consent-can] li')).toHaveText(t.canItems);
      await expect(page.locator('[data-consent-cannot] h3')).toHaveText(t.cannotTitle);
      await expect(page.locator('[data-consent-cannot] li')).toHaveText(t.cannotItems);
      await expect(page.locator('[data-consent-form]')).toContainText('Numen Games');
      await expect(page.locator('[data-consent-hear]')).toContainText(t.hearLabel);
      await expect(page.locator('[data-consent-hear]')).toContainText(t.hearHint);
      await expect(page.locator('[data-metric="connect-ai-hear"]')).not.toBeChecked();
      await expect(page.locator('[data-metric="connect-ai-allow"]')).toHaveText(t.allow);
      await expect(page.locator('[data-metric="connect-ai-cancel"]')).toHaveText(t.deny);
      await expect(page.locator('[data-consent-done]')).toBeHidden();
    });
  }

  test('es: the community, the role, the hint, and «Permitir» connects and says «Listo»', async ({
    context,
    page,
  }) => {
    const t = CONECTAR_IA_UI.es;
    await signIn(context, ANA);
    await page.goto(consent('/es', LONG_HOST));
    await expect(page.locator('[data-consent="ok"]')).toBeVisible();
    await expect(page.locator('[data-metric="connect-ai-new"]').first()).toBeChecked();
    await expect(page.locator('[data-consent-name]:visible')).toContainText(t.nameHint);
    const name = page.locator('[data-metric="connect-ai-name"]:visible');
    await expect(name).toHaveValue('Claude');
    await name.fill('Claude de Ana');
    const role = page.locator('[data-metric="connect-ai-role"]:visible');
    await expect(role.locator('option').first()).toHaveText(t.roleNone);
    await expect(page.locator('#ci-role-help')).toHaveText(t.roleHelp);
    await axeClean(page);

    await page.locator('[data-metric="connect-ai-allow"]').click();
    const done = page.locator('[data-consent-done]');
    await expect(done).toBeVisible();
    await expect(done.locator('h2')).toHaveText(t.doneTitle);
    await expect(done.locator('h2')).toBeFocused();
    await expect(page.locator('[data-consent-done-lead]')).toHaveText(
      t.doneLead.replace('{name}', 'Claude de Ana'),
    );
    await expect(page.locator('[data-consent-done-name]')).toHaveText('Claude de Ana');
    await expect(page.locator('[data-consent-sum="community"]')).toHaveText('Numen Games');
    await expect(page.locator('[data-consent-sum="role"]')).toHaveText(t.roleNone);
    await expect(page.locator('[data-consent-sum="hear"]')).toHaveText(t.no);
    await expect(page.locator('[data-consent-sum="host"]')).toHaveText(LONG_HOST);
    expect(await stepsState(page)).toEqual(['hecho', 'hecho', 'hecho']);
    await expect(page.locator('[data-consent-steps] li[aria-current]')).toHaveCount(0);
    await expect(page.locator('[data-consent-body]')).toBeHidden();
    await expect(page.locator('[data-consent-ask]')).toBeHidden();
    // The fixture relay gives no way back: nothing to go to, and no «returning» line.
    await expect(page.locator('[data-consent-return]')).toBeHidden();
    await expect(page.locator('[data-consent-returning]')).toBeHidden();
    await expect(page.locator('[data-metric="connect-ai-panel"]')).toHaveAttribute(
      'href',
      '/es/panel/agentes/',
    );
    await axeClean(page);

    // Asking again offers to reconnect it; a new one with the same name is refused in words.
    await page.goto(consent('/es'));
    await expect(page.locator('[data-metric="connect-ai-again"]').first()).toBeVisible();
    await page.locator('[data-metric="connect-ai-name"]:visible').fill('Claude de Ana');
    await page.locator('[data-metric="connect-ai-allow"]').click();
    await expect(page.locator('[data-consent-problem]')).toHaveText(t.refusals.taken);
  });

  test('with the box checked the request says so and «Listo» says «Sí»', async ({
    context,
    page,
  }) => {
    const t = CONECTAR_IA_UI.es;
    await signIn(context, ANA);
    await page.goto(consent('/es', 'claude.ai', 'Oyente'));
    await page.locator('[data-metric="connect-ai-hear"]').check();
    const request = page.waitForRequest('**/api/conectar-ia');
    await page.locator('[data-metric="connect-ai-allow"]').click();
    expect((await request).postDataJSON()).toMatchObject({ hear: true, host: 'claude.ai' });
    await expect(page.locator('[data-consent-done]')).toBeVisible();
    await expect(page.locator('[data-consent-sum="hear"]')).toHaveText(t.yes);
  });

  test('when the relay says where the AI waits: «Listo» for a moment, a way back, then it goes', async ({
    context,
    page,
  }) => {
    const t = CONECTAR_IA_UI.es;
    await signIn(context, ANA);
    await page.route('**/api/conectar-ia', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          connection: { name: 'Claude' },
          next: `${origin}/es/mundos/`,
        }),
      }),
    );
    await page.goto(consent('/es', 'claude.ai'));
    await page.locator('[data-metric="connect-ai-allow"]').click();
    await expect(page.locator('[data-consent-done] h2')).toHaveText(t.doneTitle);
    await expect(page.locator('[data-consent-returning]')).toHaveText(t.doneReturning);
    const back = page.locator('[data-metric="connect-ai-return"]');
    await expect(back).toHaveText(t.doneBack);
    await expect(back).toHaveAttribute('href', `${origin}/es/mundos/`);
    await page.waitForURL(`${origin}/es/mundos/`);
  });

  test('«No permitir» connects nothing and takes the steps away', async ({ context, page }) => {
    await signIn(context, ANA);
    await page.goto(consent('/es', 'claude.ai'));
    await page.locator('[data-metric="connect-ai-cancel"]').click();
    await expect(page.locator('[data-consent-cancelled]')).toHaveText(CONECTAR_IA_UI.es.cancelled);
    await expect(page.locator('[data-consent-body]')).toBeHidden();
    await expect(page.locator('[data-consent-steps]')).toBeHidden();
    await expect(page.locator('[data-consent-done]')).toBeHidden();
  });
});

test.describe('the consent, with no community to add an AI to', () => {
  for (const { locale, prefix } of LOCALES) {
    test(`${locale}: says why, what to do, and where to look`, async ({ context, page }) => {
      const t = CONECTAR_IA_UI[locale];
      await leaveTheCommunity(page, context);
      await page.goto(consent(prefix, LONG_HOST));
      await expect(page.locator('[data-consent="none"]')).toBeVisible();
      expect(await stepsState(page)).toEqual(['hecho', 'ahora', 'pending']);
      await expect(page.locator('[data-consent-host]')).toHaveText(LONG_HOST);
      await expect(page.locator('[data-consent-body] h2')).toHaveText(t.noneTitle);
      await expect(page.locator('[data-consent-body] .por-que')).toContainText(t.noneWhy);
      await expect(page.locator('[data-consent-body] .por-que')).toContainText(t.noneDo);
      const link = page.locator('[data-metric="connect-ai-communities"]');
      await expect(link).toHaveText(t.noneCommunities);
      await expect(link).toHaveAttribute('href', `${prefix}/belong/`);
      await expect(page.locator('[data-metric="connect-ai-cancel"]')).toHaveText(t.noneClose);
      await expect(page.locator('[data-consent-form]')).toHaveCount(0);
      await expect(page.locator('[data-metric="connect-ai-allow"]')).toHaveCount(0);
    });
  }

  test('es: no accessibility violations, and «Cerrar» connects nothing', async ({
    context,
    page,
  }) => {
    await leaveTheCommunity(page, context);
    await page.goto(consent('/es', 'claude.ai'));
    await axeClean(page);
    await page.locator('[data-metric="connect-ai-cancel"]').click();
    await expect(page.locator('[data-consent-cancelled]')).toBeVisible();
  });
});

// With SHOTS_DIR set: every state, at 1440 and at 390 px, to look at.
test.describe('the screenshots', () => {
  test.skip(!process.env['SHOTS_DIR'], 'set SHOTS_DIR to save them');
  const SIZES = [
    { name: '1440', width: 1440, height: 900 },
    { name: '390', width: 390, height: 844 },
  ] as const;

  async function shoot(page: Page, name: string): Promise<void> {
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.screenshot({
        path: `${process.env['SHOTS_DIR']}/${name}-${size.name}.png`,
        fullPage: true,
      });
    }
  }

  test('signed out, the form, no community, «Listo»', async ({ browser }) => {
    const out = await browser.newContext();
    const outPage = await out.newPage();
    await outPage.goto(consent('/es', LONG_HOST));
    await shoot(outPage, 'permiso-fuera');
    await outPage.goto(consent('/es'));
    await shoot(outPage, 'permiso-fuera-localhost');
    await outPage.goto(consent('/es', `${'a'.repeat(60)}.example.com`));
    await shoot(outPage, 'permiso-fuera-nombre-ancho');
    await out.close();

    const none = await browser.newContext();
    const nonePage = await none.newPage();
    await leaveTheCommunity(nonePage, none);
    await nonePage.goto(consent('/es', LONG_HOST));
    await shoot(nonePage, 'permiso-sin-comunidad');
    await none.close();

    const inside = await browser.newContext();
    const page = await inside.newPage();
    await signIn(inside, `0x${'ef'.repeat(20)}`);
    await page.goto(consent('/es', LONG_HOST, 'Hermes'));
    await page.locator('[data-metric="connect-ai-name"]:visible').fill('Hermes de Christian');
    await shoot(page, 'permiso');
    await page.locator('[data-metric="connect-ai-allow"]').click();
    await expect(page.locator('[data-consent-done]')).toBeVisible();
    await shoot(page, 'listo');
    await page.goto(consent('', 'claude.ai'));
    await shoot(page, 'permiso-en');
    await inside.close();
  });
});
