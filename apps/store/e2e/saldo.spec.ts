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
  // The sidebar opens Saldo once you are signed in.
  await expect(page.locator('[data-metric="nav-saldo"]')).toBeVisible();
});

test('switching to an organization shows its balance and its team', async ({ page }) => {
  await signedIn(page);
  await page.goto('/es/saldo/');
  await page.locator('#saldo-cuenta').selectOption('acc_t');
  await expect(page.locator('[data-saldo-balance]')).toHaveText(/18,80\s€/);
  await expect(page.locator('[data-saldo-low]')).toHaveCount(0);
  const team = page.locator('[data-saldo-team]');
  await expect(team).toBeVisible();
  await expect(team.locator('tbody tr')).toHaveCount(2);
  await expect(team).toContainText('(tú)');
});

test('a member sees only what the roles let them do, and who could do the rest', async ({
  page,
}) => {
  await signedIn(page, MEMBER_ACCESS);
  await page.goto('/es/saldo/');
  await page.locator('#saldo-cuenta').selectOption('acc_t');
  const team = page.locator('[data-saldo-team]');
  await expect(team).toBeVisible();
  // Every member may top up and leave; nothing else is offered.
  await expect(page.locator('[data-metric="saldo-pay"]')).toBeVisible();
  await expect(team.locator('[data-metric="saldo-rename"]')).toHaveCount(0);
  await expect(team.locator('[data-metric="saldo-member-add"]')).toHaveCount(0);
  await expect(team.locator('[data-metric="saldo-member-role"]')).toHaveCount(0);
  await expect(team.locator('[data-metric="saldo-member-remove"]')).toHaveCount(1);
  await expect(team.locator('[data-metric="saldo-member-remove"]')).toHaveText('Salir');
  await expect(team.locator('[data-saldo-no-invite]')).toContainText('«Invitar»');
  await expect(team.locator('[data-saldo-no-invite]')).toContainText('Administration y Finance');
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

for (const colorScheme of ['dark', 'light'] as const) {
  test(`the signed-in panel, with an organization's team, passes axe (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signedIn(page);
    await page.goto('/es/saldo/');
    await page.locator('#saldo-cuenta').selectOption('acc_t');
    await expect(page.locator('[data-saldo-team]')).toBeVisible();
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
  await page.goto('/es/saldo/vuelta/?cancelled=1');
  await expect(page.locator('[data-saldo-vuelta="cancelled"]')).toContainText(
    'No se ha cobrado nada',
  );
  await page.goto('/es/saldo/referidos/');
  await expect(page.locator('[data-saldo-referrals]')).toBeVisible();
});
