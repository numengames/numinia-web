/**
 * «Tus comunidades» (/belong/, cut N) in a real browser against the built
 * site: the fixture wallet that administers Numen Games sees it under «Las
 * que llevas» with «Su panel» and «Entrar»; a wallet that is only a member
 * of Active Inference Institute sees that one under «A las que perteneces»;
 * a follow lands under «Las que sigues» with its next encounter line and
 * «Ver el encuentro»; a community both followed and administered is drawn
 * once; signed out the page is the door; axe clean; a phone reads the
 * same. Like e2e/follows.spec.ts it starts the built server a second time,
 * on a free port, with throwaway secrets; the fixture desk is the data, per
 * process, so each test uses its own wallet.
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

/** The fixture desk (fixtures/accounts/desk.json): every wallet administers Numen Games… */
const PABLO = `0x${'ab'.repeat(20)}`;
const EVA = `0x${'34'.repeat(20)}`;
/** …and this one is also a plain member of Active Inference Institute. */
const DORA = '0x00000000000000000000000000000000000000d4';
const TRGCON = 'trgcon';
const NUMEN = 'numen-games';

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

const belongPage = (prefix = '/es') => `${origin}${prefix}/belong/`;
const lead = '[data-belong-lead] .tuya';
const member = '[data-belong-member] .tuya';
const follow = '[data-belong-follow] .tuya';

test.describe('signed out', () => {
  test('the page is the door; nothing is painted', async ({ page }) => {
    await page.goto(belongPage());
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Tus comunidades');
    await expect(page.locator('[data-metric="belong-sign-in"]')).toHaveAttribute(
      'href',
      '/es/lap/session/?vuelta=%2Fes%2Fbelong%2F',
    );
    await expect(page.locator('[data-belong-sections]')).toBeHidden();
    await expect(page.locator('[data-metric="belong-open-home"]')).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);
  });
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
  });

  test('the three sections, each with its real cards', async ({ page, context }) => {
    await signIn(context, DORA);
    await page.request.post(`${origin}/api/follow`, { data: { communityId: TRGCON, on: true } });
    // A follow of a community you administer is not drawn twice.
    await page.request.post(`${origin}/api/follow`, { data: { communityId: NUMEN, on: true } });
    await page.goto(belongPage());
    await expect(page.locator('html')).toHaveAttribute('data-session', 'in');
    await expect(page.locator('[data-belong-sections]')).toBeVisible();
    await expect(page.locator('.puerta[data-session-out]')).toBeHidden();

    // «Las que llevas»: Numen Games, Titular, its panel and its world to enter.
    const leading = page.locator(lead);
    await expect(leading).toHaveCount(1);
    await expect(leading.locator('h3 a')).toHaveText('Numen Games');
    await expect(leading.locator('h3 a')).toHaveAttribute('href', `/es/communities/${NUMEN}/`);
    await expect(leading.locator('[data-line]')).toHaveText(/^Titular · en /);
    await expect(leading.locator('[data-metric="belong-panel"]')).toHaveAttribute(
      'href',
      '/es/panel/?org=acc_team_numen_games',
    );
    await expect(leading.locator('[data-world-enter]')).toBeVisible();
    await expect(leading.locator('[data-world-enter]')).toBeEnabled();
    await expect(leading.locator('[data-metric="belong-unfollow"]')).toHaveCount(0);
    await expect(leading.locator('img')).toHaveAttribute('src', /\.webp$/);
    await expect(page.locator('[data-belong-lead-empty]')).toBeHidden();

    // «A las que perteneces»: Active Inference Institute, Miembro, no panel.
    const belonging = page.locator(member);
    await expect(belonging).toHaveCount(1);
    await expect(belonging.locator('h3')).toHaveText('Active Inference Institute');
    await expect(belonging.locator('[data-line]')).toHaveText('Miembro');
    await expect(belonging.locator('[data-metric="belong-panel"]')).toHaveCount(0);
    await expect(page.locator('[data-belong-member-empty]')).toBeHidden();

    // «Las que sigues»: only La Tarugo, with its next encounter and «Ver el encuentro».
    const followed = page.locator(follow);
    await expect(followed).toHaveCount(1);
    await expect(followed.locator('h3 a')).toHaveAttribute('href', `/es/communities/${TRGCON}/`);
    await expect(followed.locator('[data-line]')).toHaveText(/^La sigues · próximo: TRG26, /);
    await expect(followed.locator('[data-see-ritual]')).toHaveAttribute(
      'href',
      '/es/rituals/trg26/',
    );
    await expect(followed.locator('[data-see-ritual]')).toHaveText('Ver el encuentro');
    await expect(followed.locator('[data-metric="belong-unfollow"]')).toBeVisible();
    await expect(page.locator('[data-belong-follow-empty]')).toBeHidden();
    await expect(page.locator('[data-metric="belong-find-more"]')).toHaveAttribute(
      'href',
      '/es/communities/',
    );

    // No pill: the fixture's worlds say nobody is inside, so no figure is drawn.
    await expect(page.locator('[data-live]:not([hidden])')).toHaveCount(0);

    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('a wallet in one organization alone: two empty states in the house voice', async ({
    page,
    context,
  }) => {
    await signIn(context, PABLO);
    await page.goto(belongPage());
    await expect(page.locator(lead)).toHaveCount(1);
    await expect(page.locator(member)).toHaveCount(0);
    await expect(page.locator('[data-belong-member-empty]')).toHaveText(
      'Aún no perteneces a ninguna comunidad.',
    );
    await expect(page.locator(follow)).toHaveCount(0);
    await expect(page.locator('[data-belong-follow-empty]')).toContainText('No sigues ninguna.');
    await expect(page.locator('[data-metric="belong-explore"]')).toHaveAttribute(
      'href',
      '/es/communities/',
    );
    await expect(page.locator('footer.pie-tuyas')).toContainText('¿Llevas una que aún no está?');
    await expect(page.locator('[data-metric="belong-claim"]')).toHaveAttribute(
      'href',
      '/es/communities/',
    );
  });

  test('on a phone, the cards read the same', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(context, EVA);
    await page.request.post(`${origin}/api/follow`, { data: { communityId: TRGCON, on: true } });
    await page.goto(belongPage());
    await expect(page.locator(lead)).toHaveCount(1);
    await expect(page.locator(follow)).toHaveCount(1);
    await expect(page.locator(follow).locator('[data-see-ritual]')).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('speaks every language', async ({ page, context }) => {
    await signIn(context, PABLO);
    for (const [prefix, title, role] of [
      ['', 'Your communities', 'Holder'],
      ['/ja', 'あなたのコミュニティ', '名義人'],
      ['/ko', '내 커뮤니티', '명의자'],
      ['/pt-br', 'Suas comunidades', 'Titular'],
    ] as const) {
      await page.goto(belongPage(prefix));
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator(lead).locator('[data-line]')).toContainText(role);
    }
  });
});
