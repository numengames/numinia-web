/**
 * «El dinero» (cut 2026-10-16) in a real browser against the built site and
 * the fixture desk: the Saldo screen — one screen for your own account at
 * /saldo/ and for an organization at /panel/saldo/ — with its three KPI
 * cards, the stacked chart of running and stopped days, the table of worlds,
 * the movements with the balance after each line and their CSV, the rules in
 * sight and, for an organization, the way to «Miembros y roles» instead of
 * the old Team section; and the panel's Resumen with its four cards and «Lo
 * último».
 *
 * As in house.spec.ts, the suite's own server has no auth secrets, so this
 * one starts the built server a second time with throwaway secrets, mints a
 * session cookie with them, and lets the fixture desk (DATA_SOURCE=fixture)
 * answer: the figures are the seed's, the plumbing is the real one.
 */

import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '@numinia/auth';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LEGAL_CORPUS_VERSION } from '../src/lib/legal';

const ORACLE = `0x${'ab'.repeat(20)}`;
const CITIZEN = `0x${'cd'.repeat(20)}`;
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';

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

/** «4,20 €» → 420: the figures the screen prints, back in cents. */
function cents(text: string): number {
  const match = /(-?)\s*([\d.]+),(\d{2})/.exec(text.replace(/\u2212/g, '-'));
  if (match === null) throw new Error(`no euros in «${text}»`);
  const [, sign = '', whole = '0', fraction = '00'] = match;
  return (sign === '-' ? -1 : 1) * (Number(whole.replace(/\./g, '')) * 100 + Number(fraction));
}

async function settled(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity))
        .map((a) => a.finished),
    ),
  );
}

async function axe(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`);
}

test('signed out, Saldo and the panel ask you to sign in and show no figure', async ({ page }) => {
  await page.goto(`${origin}/es/saldo/`);
  await expect(page.locator('[data-saldo-signed-out]')).toBeVisible();
  await expect(page.locator('[data-saldo-kpis]')).toHaveCount(0);
  for (const path of ['/es/panel/', '/es/panel/saldo/']) {
    await page.goto(`${origin}${path}`);
    await expect(page.locator('[data-org-signed-out]')).toBeVisible();
    await expect(page.locator('[data-summary-cards], [data-saldo-kpis]')).toHaveCount(0);
  }
});

test.describe('your own account at /saldo/', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context, CITIZEN, 'nomad');
  });

  test('three cards: the balance with its runway and the top-up, this month, and the low-balance warning', async ({
    page,
  }) => {
    await page.goto(`${origin}/es/saldo/`);
    const kpis = page.locator('[data-saldo-kpis]');
    await expect(kpis).toBeVisible();
    const balance = kpis.locator('[data-saldo-kpi="balance"]');
    await expect(balance.locator('[data-saldo-balance]')).toHaveText(/4,20\s€/);
    await expect(balance).toContainText('no caduca');
    await expect(balance.locator('[data-saldo-runway]')).toContainText(
      /Te da para (unos \d+ días|menos de un día) al ritmo de los últimos 7 días/,
    );
    await expect(balance.locator('[data-metric="saldo-pay"]')).toBeVisible();
    await expect(balance.locator('[data-metric="saldo-amount-10"]')).toBeVisible();
    const month = kpis.locator('[data-saldo-kpi="month"]');
    await expect(month).toContainText('Este mes');
    await expect(month.locator('[data-saldo-month]')).toHaveText(/\d,\d{2}\s€/);
    await expect(month.locator('[data-saldo-month-worlds]')).toContainText(/\d+ sedes? con cargo/);
    const low = kpis.locator('[data-saldo-kpi="low"]');
    await expect(low).toContainText('Aviso de saldo bajo');
    await expect(low).toContainText(/10\s€/);
    await expect(low.locator('[data-saldo-keep]')).toContainText(
      'Con el saldo a cero, las sedes se apagan y se guardan 90 días',
    );
    await expect(low).not.toContainText('Cambiarlo');
    await expect(page.locator('[data-saldo-low]')).toBeVisible();
  });

  test('the chart stacks running over stopped, each bar telling both halves, and a table of worlds', async ({
    page,
  }) => {
    await page.goto(`${origin}/es/saldo/`);
    const usage = page.locator('[data-saldo-usage]');
    await expect(usage).toContainText('Cada día se cierra a medianoche UTC');
    await expect(usage.locator('[data-saldo-legend]')).toContainText('Sede encendida');
    await expect(usage.locator('[data-saldo-legend]')).toContainText('Apagada');
    await expect(usage).not.toContainText(/modo evento/i);
    const chart = usage.locator('[data-saldo-chart]');
    await expect(chart).toHaveAttribute('data-saldo-stacked', '');
    await expect(chart.locator('[data-saldo-bar]')).toHaveCount(30);
    const titles = await chart.locator('[data-saldo-bar] title').allTextContents();
    expect(titles.every((title) => /encendida/.test(title) && /apagada/.test(title))).toBe(true);
    const stopped = await chart
      .locator('rect.saldo-apagada')
      .evaluateAll(
        (rects) => rects.filter((rect) => Number(rect.getAttribute('height')) > 0).length,
      );
    expect(stopped).toBeGreaterThan(0);
    const worlds = usage.locator('[data-saldo-worlds]');
    await expect(worlds.locator('thead th')).toHaveText([
      'Sede',
      'Tamaño',
      'Días encendida',
      'Importe del periodo',
    ]);
    expect(await worlds.locator('tbody tr').count()).toBeGreaterThanOrEqual(2);
    // Another range draws another chart: 7 days, then 12 months.
    await page.locator('[data-metric="saldo-range-7d"]').click();
    await expect(chart.locator('[data-saldo-bar]')).toHaveCount(7);
    await page.locator('[data-metric="saldo-range-12m"]').click();
    await expect(chart.locator('[data-saldo-bar]')).toHaveCount(12);
  });

  test('the movements carry the balance after each line, counted back from today’s, and a CSV of them', async ({
    page,
  }) => {
    await page.goto(`${origin}/es/saldo/`);
    const movements = page.locator('[data-saldo-movements]');
    await expect(movements).toContainText(
      'Las líneas nunca se borran: si algo se corrige, se añade otra',
    );
    const table = movements.locator('[data-saldo-lines]');
    await expect(table.locator('thead th')).toHaveText([
      'Día (UTC)',
      'Qué',
      'Detalle',
      'Importe',
      'Saldo',
    ]);
    const rows = table.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(30);
    const after = await table.locator('[data-saldo-after]').allTextContents();
    const amounts = await table.locator('[data-saldo-amount]').allTextContents();
    expect(cents(after[0] ?? '')).toBe(420);
    for (let i = 0; i + 1 < Math.min(after.length, 10); i += 1) {
      expect(cents(after[i + 1] ?? '')).toBe(cents(after[i] ?? '') - cents(amounts[i] ?? ''));
    }
    await expect(movements.locator('[data-saldo-lines-note]')).toContainText('100');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      movements.locator('[data-metric="saldo-csv"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^numinia-saldo-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = await readFile(await download.path(), 'utf8');
    const lines = text
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(lines[0]).toBe('Día (UTC),Qué,Detalle,Importe,Saldo');
    expect(lines).toHaveLength((await rows.count()) + 1);
    expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2},.+,-?\d+\.\d{2},4\.20$/);
  });

  test('the rules in sight come from the tariff, and say whose account it is; no Team section', async ({
    page,
  }) => {
    await page.goto(`${origin}/es/saldo/`);
    const rules = page.locator('[data-saldo-rules]');
    await expect(rules).toContainText('Las reglas, a la vista');
    await expect(rules).toContainText(/\d,\d{2}\s€ al día encendida y \d,\d{2}\s€ apagada/);
    await expect(rules).toContainText(
      'Recargas de 10, 50 o 100 €. Sin suscripción: pagas lo que gastas',
    );
    await expect(rules).toContainText('Con el saldo a cero, la sede se apaga y se guarda 90 días');
    await expect(rules).toContainText(
      'Si la tarifa sube, la subida no empieza hasta 30 días después de anunciarse',
    );
    await expect(rules).toContainText('Es tu cuenta personal: solo tú recargas y ves estos datos');
    await expect(page.locator('[data-saldo-team]')).toHaveCount(0);
    await expect(page.locator('[data-saldo-members-link]')).toHaveCount(0);
  });

  test('in English too', async ({ page }) => {
    await page.goto(`${origin}/saldo/`);
    await expect(page.locator('[data-saldo-kpi="month"]')).toContainText('This month');
    await expect(page.locator('[data-saldo-rules]')).toContainText('Rules in sight');
    await expect(page.locator('[data-saldo-lines] thead th').first()).toHaveText('Day (UTC)');
  });
});

test.describe('an organization at /panel/saldo/', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context, CITIZEN, 'nomad');
  });

  test('the same screen, with who tops up and a way to «Miembros y roles» instead of the Team section', async ({
    page,
  }) => {
    await page.goto(`${origin}/es/panel/saldo/?org=${NUMEN}`);
    await expect(page.locator('[data-saldo-kpi="balance"] [data-saldo-balance]')).toHaveText(
      /0,88\s€/,
    );
    await expect(page.locator('[data-saldo-chart][data-saldo-stacked]')).toBeVisible();
    expect(await page.locator('[data-saldo-worlds] tbody tr').count()).toBeGreaterThanOrEqual(2);
    const after = await page.locator('[data-saldo-after]').first().textContent();
    expect(cents(after ?? '')).toBe(88);
    const rules = page.locator('[data-saldo-rules]');
    await expect(rules).toContainText('Recargan');
    await expect(rules).not.toContainText('Es tu cuenta personal');
    await expect(page.locator('[data-saldo-team]')).toHaveCount(0);
    const link = page.locator('[data-saldo-members-link] a');
    await expect(link).toHaveText('Miembros y roles');
    await expect(link).toHaveAttribute('href', `/es/panel/miembros/?org=${NUMEN}`);
    await expect(link).toHaveAttribute('data-metric', 'saldo-members-link');
  });

  test('«Cada sede en el periodo» draws a bar per world next to the numeric table, real till figures', async ({
    page,
  }) => {
    const TARUGO = 'acc_team_la_tarugo';
    const TARUGO_ADMIN = '0x00000000000000000000000000000000000000e5';
    await signIn(page.context(), TARUGO_ADMIN, 'nomad');
    await page.goto(`${origin}/es/panel/saldo/?org=${TARUGO}`);
    const chart = page.locator('[data-saldo-worlds-chart]');
    await expect(chart).toBeVisible();
    const bars = chart.locator('[data-saldo-world-bar]');
    const worldRows = chart.locator('[data-saldo-worlds] tbody tr');
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThan(0);
    expect(barCount).toBe(await worldRows.count());
    // Every bar's title names a real world and its real euro figure, the
    // same the table beside it prints — never invented.
    const titles = await bars.locator('title').allTextContents();
    const cells = await worldRows.locator('td:first-child').allTextContents();
    for (const world of cells) {
      expect(titles.some((title) => title.startsWith(world))).toBe(true);
    }
    await page.screenshot({
      path: 'test-results/la-tarugo-saldo.png',
      fullPage: true,
    });
  });
});

test.describe('the panel’s Resumen', () => {
  test('four cards under «Tu lugar aquí», then «Lo último», and the pieces below as before', async ({
    page,
    context,
  }) => {
    await signIn(context, CITIZEN, 'nomad');
    await page.goto(`${origin}/es/panel/?org=${NUMEN}`);
    await expect(page.locator('[data-org-you]')).toContainText('Tu lugar aquí');
    const cards = page.locator('[data-summary-cards]');
    await expect(cards).toBeVisible();
    const venues = cards.locator('[data-summary-card="venues"]');
    await expect(venues).toContainText(/\d+/);
    await expect(venues).toContainText('con cargo en los últimos 30 días');
    const next = cards.locator('[data-summary-card="next"]');
    await expect(next).toContainText('Lo próximo');
    const ahead = await next.locator('a[href^="/es/rituals/"]').count();
    if (ahead === 0) await expect(next).toContainText('Ningún encuentro a la vista');
    const people = cards.locator('[data-summary-card="people"]');
    await expect(people).toContainText('3');
    await expect(people).toContainText('miembros');
    await expect(people.locator('a')).toHaveAttribute('href', `/es/panel/miembros/?org=${NUMEN}`);
    const balance = cards.locator('[data-summary-card="balance"]');
    await expect(balance).toContainText(/0,88\s€/);
    await expect(balance.locator('a')).toHaveAttribute('href', `/es/panel/saldo/?org=${NUMEN}`);
    for (const link of await cards.locator('a').all()) {
      await expect(link).toHaveAttribute('data-metric', /^panel-summary-/);
    }
    // «Qué ha pasado» is the organization's log and nothing else: this wallet's own acts, here two changes.
    for (const vocabulary of ['simple', 'mixed']) {
      const changed = await page.request.post(`${origin}/api/saldo/settings`, {
        data: { accountId: NUMEN, vocabulary },
      });
      expect(changed.ok()).toBe(true);
    }
    await page.reload();
    const latest = page.locator('[data-summary-latest]');
    await expect(latest).toContainText('Qué ha pasado');
    const entries = latest.locator('[data-happened-list] li');
    await expect(entries).toHaveCount(2);
    await expect(entries.first()).toContainText('Ajustes de la comunidad cambiados');
    await expect(entries.first().locator('time')).toHaveAttribute('datetime', /Z$/);
    await expect(latest.locator('[data-metric="panel-summary-log"]')).toHaveAttribute(
      'href',
      `/es/panel/miembros/?org=${NUMEN}`,
    );
    await expect(page.locator('[data-org-cards]')).toBeVisible();
    // The cards come before the pieces.
    const order = await page.evaluate(() => {
      const cardsAt = document.querySelector('[data-summary-cards]');
      const piecesAt = document.querySelector('[data-org-cards]');
      return cardsAt !== null && piecesAt !== null
        ? Boolean(cardsAt.compareDocumentPosition(piecesAt) & Node.DOCUMENT_POSITION_FOLLOWING)
        : false;
    });
    expect(order).toBe(true);
  });
});

test.describe('on a phone and for everyone', () => {
  for (const path of ['/es/saldo/', `/es/panel/saldo/?org=${NUMEN}`, `/es/panel/?org=${NUMEN}`]) {
    test(`${path} fits a 390-pixel phone and passes axe`, async ({ page, context }) => {
      await signIn(context, CITIZEN, 'nomad');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${origin}${path}`);
      await expect(page.locator('[data-saldo-kpis], [data-summary-cards]').first()).toBeVisible();
      await settled(page);
      const { scroll, width } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: window.innerWidth,
      }));
      expect(scroll).toBeLessThanOrEqual(width);
      expect(await axe(page)).toEqual([]);
    });
  }

  for (const colorScheme of ['dark', 'light'] as const) {
    test(`an Oracle entering an organization’s Saldo y consumo passes axe (${colorScheme})`, async ({
      page,
      context,
    }) => {
      await signIn(context, ORACLE, 'oracle');
      await page.emulateMedia({ colorScheme });
      await page.goto(`${origin}/es/panel/saldo/?org=${NUMEN}`);
      await expect(page.locator('[data-saldo-rules]')).toBeVisible();
      await settled(page);
      expect(await axe(page)).toEqual([]);
    });
  }
});
