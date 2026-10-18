/**
 * «Saldo» (v0.87.0) in a real browser against the built site. The e2e
 * server runs without auth secrets, so /api/saldo answers 401 there; the
 * till's answers are played by the browser (`page.route`), shaped as the
 * route sends them. What is under test is what the screen does with each.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const WALLET = '0x42e6000000000000000000000000000000ca26';
const OTHER = '0x' + 'cd'.repeat(20);

const PERSONAL = { id: 'acc_p', kind: 'personal', name: null, role: 'owner', balanceCents: 420 };
const TEAM = { id: 'acc_t', kind: 'team', name: 'Numen Games', role: 'admin', balanceCents: 1880 };

function today(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

/** What the till says an ordinary member may do: enter and top up, nothing else. */
const MEMBER_ACCESS = {
  as: 'member',
  permissions: ['enter-worlds', 'top-up', 'view-balance'],
  holders: {
    'manage-organization': ['Administration'],
    'invite-members': ['Administration', 'Finance'],
    'manage-roles': ['Administration'],
    'remove-members': ['Administration'],
    'top-up': ['Administration', '@everyone'],
  },
};
/** A person who holds nothing here, not even the top-up (the base role was narrowed). */
const NO_TOPUP_ACCESS = {
  ...MEMBER_ACCESS,
  permissions: ['enter-worlds'],
};

function statementOf(account: typeof PERSONAL | typeof TEAM, access: object | null = null) {
  const team = account.kind === 'team';
  return {
    statement: {
      account,
      balanceCents: account.balanceCents,
      lowBalance: account.balanceCents < 1000,
      lots: [],
      spend: [
        { bucket: today(2), cents: 60 },
        { bucket: today(1), cents: 60 },
      ],
      spendTotalCents: 120,
      lines: [
        {
          kind: 'world_day',
          at: `${today(1)}T00:30:00.000Z`,
          amountCents: -60,
          day: today(1),
          worldId: 'agora',
          size: '2g',
        },
        { kind: 'topup', at: `${today(20)}T10:00:00.000Z`, amountCents: 1000, vatCents: 210 },
      ],
      ...(team
        ? {
            members: [
              { wallet: WALLET, role: 'admin', addedAt: `${today(30)}T00:00:00.000Z` },
              { wallet: OTHER, role: 'member', addedAt: `${today(10)}T00:00:00.000Z` },
            ],
          }
        : {}),
    },
    you: WALLET,
    access: account.kind === 'team' ? access : null,
  };
}

/** The way back the till would answer: this very site, wherever the suite serves it. */
const VUELTA = '/es/saldo/vuelta/?session_id=cs_test_e2e';

async function signedIn(page: Page, access: object | null = null): Promise<string[]> {
  const posted: string[] = [];
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank: 'nomad' } }),
  );
  await page.route('**/api/saldo/statement?*', (route: Route) => {
    const id = new URL(route.request().url()).searchParams.get('cuenta');
    return route.fulfill({ json: statementOf(id === TEAM.id ? TEAM : PERSONAL, access) });
  });
  await page.route('**/api/saldo', (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { accounts: [PERSONAL, TEAM] } });
    }
    const body = route.request().postDataJSON() as { action: string };
    posted.push(body.action);
    if (body.action === 'topup') {
      const url = new URL(VUELTA, route.request().url()).href;
      return route.fulfill({ json: { result: { ok: true, url } } });
    }
    if (body.action === 'confirm') {
      return route.fulfill({
        json: { result: { ok: true, state: 'paid', accountId: 'acc_p', balanceCents: 1420 } },
      });
    }
    return route.fulfill({ json: { result: { ok: true, members: [] } } });
  });
  return posted;
}

test('without a session Saldo asks you to sign in and comes back here', async ({ page }) => {
  await page.goto('/es/saldo/');
  const door = page.locator('[data-saldo-signed-out] a');
  await expect(door).toBeVisible();
  await expect(door).toHaveAttribute('href', '/es/lap/session/?vuelta=%2Fes%2Fsaldo%2F');
});

test('your own account: the balance, the low-balance warning, usage and movements', async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/es/saldo/');
  await expect(page.locator('[data-saldo-balance]')).toHaveText(/4,20\s€/);
  await expect(page.locator('[data-saldo-low]')).toBeVisible();
  await expect(page.locator('[data-saldo-spent]')).toHaveText(/1,20\s€/);
  await expect(page.locator('[data-saldo-chart]')).toBeVisible();
  // Before paying: who sells, and what the bank statement will say.
  await expect(page.locator('[data-saldo-seller]')).toContainText('Link (Stripe)');
  await expect(page.locator('[data-saldo-seller]')).toContainText('LINK.COM* NUMEN GAMES');
  await expect(page.locator('[data-saldo-lines] tbody tr')).toHaveCount(2);
  await expect(page.locator('[data-saldo-team]')).toHaveCount(0);
  // The city's rail opens Saldo once you are signed in.
  await expect(page.locator('[data-metric="you-balance"]')).toBeVisible();
});

/** What a till of this cut adds to the personal statement: the split, the worlds, the minutes, the pace, the tariff. */
function statementOfThisCut() {
  const { statement, ...rest } = statementOf(PERSONAL);
  const day = (daysAgo: number, world: string, size: string, running: number, amount: number) => ({
    kind: 'world_day',
    at: `${today(daysAgo - 1)}T00:30:00.000Z`,
    amountCents: amount,
    day: today(daysAgo),
    worldId: world,
    size,
    minutesRunning: running,
    minutesStopped: 1440 - running,
  });
  return {
    ...rest,
    statement: {
      ...statement,
      spend: [
        { bucket: today(2), cents: 68, runningCents: 60, stoppedCents: 8 },
        { bucket: today(1), cents: 3, runningCents: 0, stoppedCents: 3 },
      ],
      spendTotalCents: 71,
      lines: [
        day(1, 'taller', '1g', 0, -3),
        day(2, 'agora', '4g', 720, -65),
        day(2, 'taller', '1g', 0, -3),
        { kind: 'topup', at: `${today(20)}T10:00:00.000Z`, amountCents: 1000, vatCents: 210 },
      ],
      worlds: [
        { worldId: 'agora', size: '4g', daysRunning: 1, cents: 65 },
        { worldId: 'taller', size: '1g', daysRunning: 0, cents: 6 },
      ],
      pace: { sevenDaysCents: 71, monthCents: 71, monthWorlds: 2 },
      tariff: {
        startsOn: today(40),
        sizes: {
          '4g': { runningCentsPerDay: 120, stoppedCentsPerDay: 10 },
          '1g': { runningCentsPerDay: 30, stoppedCentsPerDay: 3 },
        },
        rules: { keepDaysAtZero: 90, noticeDaysForRise: 30 },
      },
    },
  };
}

test('a till of this cut: runway, this month, stacked bars, worlds, the balance after each line and the rules', async ({
  page,
}) => {
  await signedIn(page);
  await page.route('**/api/saldo/statement?*', (route: Route) =>
    route.fulfill({ json: statementOfThisCut() }),
  );
  await page.goto('/es/saldo/');
  await expect(page.locator('[data-saldo-runway]')).toContainText(
    'Te da para unos 41 días al ritmo de los últimos 7 días',
  );
  await expect(page.locator('[data-saldo-month]')).toHaveText(/0,71\s€/);
  await expect(page.locator('[data-saldo-month-worlds]')).toContainText('2 sedes con cargo');
  const chart = page.locator('[data-saldo-chart]');
  await expect(chart).toHaveAttribute('data-saldo-stacked', '');
  await expect(chart.locator('[data-saldo-bar]')).toHaveCount(30);
  const busiest = chart.locator('[data-saldo-bar] title', { hasText: '0,68' });
  await expect(busiest).toContainText(/encendida 0,60\s€/);
  await expect(busiest).toContainText(/apagada 0,08\s€/);
  await expect(page.locator('[data-saldo-legend]')).toBeVisible();
  const worlds = page.locator('[data-saldo-worlds] tbody tr');
  await expect(worlds).toHaveCount(2);
  await expect(worlds.first().locator('td')).toHaveText(['agora', '4g', '1', /0,65\s€/]);
  await expect(page.locator('[data-saldo-after]')).toHaveText([
    /4,20\s€/,
    /4,23\s€/,
    /4,88\s€/,
    /4,91\s€/,
  ]);
  const rules = page.locator('[data-saldo-rules]');
  await expect(rules).toContainText(/0,30\s€ al día encendida y 0,03\s€ apagada/);
  await expect(rules).toContainText(/1,20\s€ al día encendida y 0,10\s€ apagada/);
  await expect(rules).toContainText('Es tu cuenta personal: solo tú recargas y ves estos datos');
});

test('a till before this cut: one-colour bars, no table of worlds, no runway and no rules', async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/es/saldo/');
  await expect(page.locator('[data-saldo-chart]')).toBeVisible();
  await expect(page.locator('[data-saldo-chart]')).not.toHaveAttribute('data-saldo-stacked', '');
  await expect(page.locator('[data-saldo-legend]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-worlds]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-runway]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-rules]')).toHaveCount(0);
  // The movements still carry the balance after each line.
  await expect(page.locator('[data-saldo-after]').first()).toHaveText(/4,20\s€/);
});

test('switching to an organization shows its balance and the way to its members, not a Team section', async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/es/saldo/');
  await page.locator('#saldo-cuenta').selectOption('acc_t');
  await expect(page.locator('[data-saldo-balance]')).toHaveText(/18,80\s€/);
  await expect(page.locator('[data-saldo-low]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-team]')).toHaveCount(0);
  const link = page.locator('[data-saldo-members-link] a');
  await expect(link).toHaveText('Miembros y roles');
  await expect(link).toHaveAttribute('href', '/es/panel/miembros/?org=acc_t');
});

/** A just-opened organization at 0 €: the till says it has nothing that costs. */
const FRESH = { id: 'acc_f', kind: 'team', name: 'Ateneo', role: 'owner', balanceCents: 0 };

async function withFresh(page: Page): Promise<void> {
  await signedIn(page, MEMBER_ACCESS);
  await page.route('**/api/saldo/statement?*', (route: Route) => {
    const id = new URL(route.request().url()).searchParams.get('cuenta');
    if (id !== FRESH.id) {
      return route.fulfill({ json: statementOf(PERSONAL, null) });
    }
    const empty = statementOf(TEAM, MEMBER_ACCESS);
    return route.fulfill({
      json: {
        ...empty,
        statement: {
          ...empty.statement,
          account: FRESH,
          balanceCents: 0,
          lowBalance: true,
          hasCosts: false,
          spend: [],
          spendTotalCents: 0,
          lines: [],
          pace: { sevenDaysCents: 0, monthCents: 0, monthWorlds: 0 },
        },
      },
    });
  });
  await page.route('**/api/saldo', (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { accounts: [PERSONAL, FRESH] } });
    }
    return route.fulfill({ json: { result: { ok: true, members: [] } } });
  });
}

test('an organization with nothing that costs shows no low-balance warning: the free line, and the top-up as a secondary act', async ({
  page,
}) => {
  await withFresh(page);
  await page.goto('/es/saldo/');
  await page.locator('#saldo-cuenta').selectOption('acc_f');
  await expect(page.locator('[data-saldo-balance]')).toHaveText(/0,00\s€/);
  await expect(page.locator('[data-saldo-low]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-runway]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-free]')).toHaveText(
    'Esta comunidad no gasta nada todavía. Pagarás solo cuando tenga un mundo en marcha.',
  );
  await expect(page.locator('[data-saldo-topup]')).toHaveAttribute('data-saldo-topup', 'secondary');
  await expect(page.locator('[data-saldo-optional]')).toBeVisible();
  await expect(page.locator('[data-metric="saldo-pay"]')).toHaveClass(/btn-fantasma/);
  await expect(page.locator('[data-saldo-panel] .btn-primario')).toHaveCount(0);
});

test('an account with a world and less than 10 € keeps the warning and the top-up as the main act', async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/es/saldo/');
  await expect(page.locator('[data-saldo-low]')).toContainText('Saldo bajo');
  await expect(page.locator('[data-saldo-free]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-topup]')).toHaveAttribute('data-saldo-topup', 'primary');
  await expect(page.locator('[data-metric="saldo-pay"]')).toHaveClass(/btn-primario/);
});

test('«Nueva organización» says opening one is free, with no price and no top-up', async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/es/saldo/');
  await page.locator('[data-metric="saldo-new-team"]').click();
  await expect(page.locator('#saldo-nueva-nota')).toHaveText(
    'Abrirla es gratis. Solo pagas cuando le des un mundo que esté en marcha.',
  );
  await expect(page.locator('.saldo-nueva')).not.toContainText('€');
  await expect(page.locator('.saldo-nueva a')).toHaveCount(0);
});

test('a member who may top up sees the top-up, and the members of the organization are a link away', async ({
  page,
}) => {
  await signedIn(page, MEMBER_ACCESS);
  await page.goto('/es/saldo/');
  await page.locator('#saldo-cuenta').selectOption('acc_t');
  await expect(page.locator('[data-saldo-kpi="balance"] [data-metric="saldo-pay"]')).toBeVisible();
  await expect(page.locator('[data-metric="saldo-rename"]')).toHaveCount(0);
  await expect(page.locator('[data-metric="saldo-member-add"]')).toHaveCount(0);
  await expect(page.locator('[data-saldo-members-link]')).toBeVisible();
});

test('without the top-up permission the form is replaced by the sentence that says who has it', async ({
  page,
}) => {
  await signedIn(page, NO_TOPUP_ACCESS);
  await page.goto('/es/saldo/');
  await page.locator('#saldo-cuenta').selectOption('acc_t');
  await expect(page.locator('[data-saldo-no-topup]')).toContainText('«Recargar saldo»');
  await expect(page.locator('[data-metric="saldo-pay"]')).toHaveCount(0);
});

test('a top-up opens Stripe in a new tab and this tab stays on Saldo', async ({
  page,
  context,
}) => {
  const posted = await signedIn(page);
  await page.goto('/es/saldo/');
  await page.locator('[data-metric="saldo-amount-50"]').click();
  await expect(page.locator('[data-metric="saldo-amount-50"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('[data-metric="saldo-pay"]').click(),
  ]);
  await expect(page.locator('[data-saldo-opened]')).toBeVisible();
  await expect(page).toHaveURL(/\/es\/saldo\/$/);
  await tab.waitForURL(/\/es\/saldo\/vuelta\/\?session_id=cs_test_e2e/);
  expect(posted).toContain('topup');
});

test('the way back confirms the payment and shows the new balance', async ({ page }) => {
  const posted = await signedIn(page);
  await page.goto('/es/saldo/vuelta/?session_id=cs_test_e2e');
  await expect(page.locator('[data-saldo-vuelta="paid"]')).toContainText(/14,20\s€/);
  await expect(page.locator('[data-saldo-vuelta="paid"] [data-saldo-seller]')).toContainText(
    'LINK.COM* NUMEN GAMES',
  );
  expect(posted).toEqual(['confirm']);
});

test('the paid state shows a centered thank-you card with the celebration, then sends the buyer to Saldo (t_ef680bad)', async ({
  page,
}) => {
  await signedIn(page);
  await page.goto('/es/saldo/vuelta/?session_id=cs_test_e2e');
  const card = page.locator('[data-saldo-gracias]');
  await expect(card).toBeVisible();
  // The old plain message is gone.
  await expect(card).not.toContainText('ya puedes cerrar esta pestaña');
  await expect(card).toContainText('¡Gracias!');
  // The celebration: the burst's stars, decorative and numínica (never a
  // generic confetti icon).
  await expect(card.locator('.saldo-gracias-estrella')).toHaveCount(24);
  // It sends the buyer on to Saldo by itself (the balance page, not the lab).
  await page.waitForURL(/\/es\/saldo\/$/, { timeout: 10_000 });
});

for (const colorScheme of ['dark', 'light'] as const) {
  test(`the signed-in panel, for an organization, passes axe (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signedIn(page);
    await page.goto('/es/saldo/');
    await page.locator('#saldo-cuenta').selectOption('acc_t');
    await expect(page.locator('[data-saldo-members-link]')).toBeVisible();
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity))
          .map((a) => a.finished),
      ),
    );
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
    ).toEqual([]);
  });
}

test('a cancelled checkout says nothing was charged, and Referrals says it is coming', async ({
  page,
}) => {
  // «Nothing was charged» claims nothing about an account, so it is told to
  // anybody, with no session and no request of its own.
  await page.goto('/es/saldo/vuelta/?cancelled=1');
  await expect(page.locator('[data-saldo-vuelta="cancelled"]')).toContainText(
    'No se ha cobrado nada',
  );
  await page.goto('/es/saldo/referidos/');
  await expect(page.locator('[data-saldo-referrals]')).toBeVisible();
});

test('the way back from a top-up greets a stranger with the door, not an error', async ({
  page,
}) => {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/saldo')) asked.push(request.url());
  });
  await page.goto('/es/saldo/vuelta/');
  const door = page.locator('[data-saldo-vuelta="signed-out"]');
  // The same words «Saldo» uses, never «No encontramos esta recarga».
  await expect(door).toContainText('Entra para ver tu saldo');
  await expect(page.locator('[data-saldo-vuelta]')).not.toContainText('No encontramos');
  await expect(door.locator('[data-metric="saldo-sign-in"]')).toHaveAttribute(
    'href',
    `/es/lap/session/?vuelta=${encodeURIComponent('/es/saldo/')}`,
  );
  // And it asked the till nothing: without a session there is nothing to ask.
  await page.waitForLoadState('networkidle');
  expect(asked).toEqual([]);
});
