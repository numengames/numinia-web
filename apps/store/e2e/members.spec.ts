/**
 * The fresh signature of «La gente» (ORG-008, v0.95.0) in a real browser
 * against the built site — now in the panel's Miembros and Roles
 * (/panel/miembros/, /panel/roles/), where Saldo's old «Miembros y roles»
 * moved. As in panel.spec.ts the e2e server has no auth secrets, so the
 * till's answers are played by the browser (`page.route`), shaped as the
 * routes send them. What is under test is what the screens do with each —
 * and, for the fresh signature, that the real thirdweb code finds the wallet
 * of the session and signs the lines, from the table and from the roles.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { createThirdwebClient } from 'thirdweb';
import { verifyEOASignature } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';

const WALLET = '0x42e6000000000000000000000000000000ca26';
const OTHER = '0x' + 'cd'.repeat(20);
const TEAM = { id: 'acc_t', kind: 'team', name: 'Numen Games', role: 'admin', balanceCents: 1880 };
const ADMIN = 'role_0000000000000001';
const FINANCE = 'role_0000000000000002';
const BASE = 'role_0000000000000003';
/** The words /api/saldo answers while an act waits for a fresh signature (lib/accounts.ts). */
const FRESH_SIGNATURE =
  'giving administrator or manage-roles needs a fresh signature of your wallet';

const role = (id: string, name: string, position: number, extra: object = {}) => ({
  id,
  name,
  color: null,
  position,
  hoist: false,
  permissions: [],
  members: 0,
  mayEdit: position > 0,
  ...extra,
});

function organization(
  as: 'owner' | 'house' | 'member',
  held: string[] = [],
  me = WALLET,
  finance: string[] = ['manage-balance'],
) {
  return {
    ok: true,
    accountId: TEAM.id,
    as,
    roles: [
      role(ADMIN, 'Administración', 2, { permissions: ['administrator'], hoist: true, members: 1 }),
      role(FINANCE, 'Finanzas', 1, { permissions: finance, members: held.length }),
      role(BASE, '@todos', 0, { permissions: ['enter-worlds', 'top-up'], members: 2 }),
    ],
    members: [
      {
        wallet: me,
        owner: true,
        addedAt: '2026-09-01T00:00:00.000Z',
        roleIds: [],
        assignable: [],
      },
      {
        wallet: OTHER,
        owner: false,
        addedAt: '2026-09-20T00:00:00.000Z',
        roleIds: held,
        assignable: [ADMIN, FINANCE],
      },
    ],
  };
}

async function signedIn(page: Page, as: 'owner' | 'house' | 'member' = 'owner', me = WALLET) {
  const posted: Record<string, unknown>[] = [];
  let held: string[] = [];
  let finance = ['manage-balance'];
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: me, rank: 'nomad' } }),
  );
  await page.route('**/api/saldo/roles?*', (route: Route) =>
    route.fulfill({ json: { roles: organization(as, held, me, finance), you: me } }),
  );
  await page.route('**/api/saldo/ranks?*', (route: Route) =>
    route.fulfill({ json: { ok: true, ranks: { [me]: 'nomad', [OTHER]: null } } }),
  );
  await page.route('**/api/saldo/log?*', (route: Route) =>
    route.fulfill({
      json: {
        log: {
          ok: true,
          accountId: TEAM.id,
          lines: [
            {
              seq: 1,
              at: '2026-10-15T09:00:00.000Z',
              actor: WALLET,
              asHouse: false,
              act: 'role-given',
              subject: OTHER,
              detail: { name: 'Finanzas' },
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/saldo', (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { accounts: [TEAM] } });
    }
    const body = route.request().postDataJSON() as {
      action: string;
      roleId?: string;
      change?: { permissions?: string[] };
      fresh?: unknown;
    };
    posted.push(body);
    // Giving the role that carries «Administrador», or «Gestionar roles» to a role,
    // waits for a fresh signature (ORG-008).
    const grants =
      (body.action === 'give-role' && body.roleId === ADMIN) ||
      (body.action === 'edit-role' && (body.change?.permissions ?? []).includes('manage-roles'));
    if (grants && body.fresh === undefined) {
      return route.fulfill({ json: { result: { ok: false, problems: [FRESH_SIGNATURE] } } });
    }
    if (body.action === 'give-role') held = [body.roleId ?? FINANCE];
    if (body.action === 'take-role') held = [];
    if (body.action === 'edit-role') finance = body.change?.permissions ?? finance;
    if (body.action === 'delete-role') {
      return route.fulfill({
        json: {
          result: {
            ok: false,
            problems: ['you may act only on roles and members below your own highest role'],
          },
        },
      });
    }
    return route.fulfill({ json: { result: organization(as, held, me, finance) } });
  });
  return posted;
}

/**
 * A wallet like MetaMask in this browser, remembered from the login as
 * thirdweb remembers one: an EIP-1193 provider announced over EIP-6963
 * («io.metamask»), whose `personal_sign` is a throwaway key in this test's
 * process. Nothing of thirdweb is replaced: the island's own code finds it.
 */
async function withWallet(page: Page) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  const signer = privateKeyToAccount({
    client: createThirdwebClient({ clientId: 'e2e' }),
    privateKey,
  });
  await page.exposeFunction('numiniaTestSign', (raw: string) =>
    signer.signMessage({ message: { raw: raw as `0x${string}` } }),
  );
  await page.addInitScript((address: string) => {
    // Looked up at call time: the binding is the test process's own signer.
    const sign = (raw: string) =>
      (window as unknown as { numiniaTestSign: (raw: string) => Promise<string> }).numiniaTestSign(
        raw,
      );
    const provider = {
      isMetaMask: true,
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [address];
        if (method === 'eth_chainId') return '0x1';
        if (method === 'personal_sign') return sign(String(params?.[0]));
        throw new Error(`the test wallet does not know ${method}`);
      },
      on: () => provider,
      removeListener: () => provider,
    };
    const info = { uuid: 'numinia-e2e', name: 'MetaMask', icon: 'data:,', rdns: 'io.metamask' };
    const announce = () =>
      window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info, provider }) }),
      );
    window.addEventListener('eip6963:requestProvider', announce);
    localStorage.setItem('thirdweb:connected-wallet-ids', JSON.stringify(['io.metamask']));
    localStorage.setItem('thirdweb:active-wallet-id', 'io.metamask');
  }, signer.address);
  return signer.address;
}

const other = (page: Page) => page.locator(`[data-person="${OTHER}"]`);
const notices = (page: Page) => page.locator('[data-people-notices]');

/** The panel's Miembros, the table drawn; then «+» on the other person's row with this role chosen. */
async function giveFromTable(page: Page, roleId: string): Promise<void> {
  await page.goto(`/es/panel/miembros/?org=${TEAM.id}`);
  await expect(other(page)).toBeVisible();
  await other(page).locator('[data-metric="panel-member-role-more"]').click();
  await other(page).getByRole('combobox').selectOption(roleId);
  await other(page).locator('[data-metric="panel-member-role-give"]').click();
}

test('gives and takes a role from the table, then reads the log', async ({ page }) => {
  const posted = await signedIn(page);
  await giveFromTable(page, FINANCE);
  await expect(other(page).locator('[data-role-chip]')).toHaveText(['Finanzas']);
  await other(page).locator('[data-metric="panel-member-role-take"]').click();
  await expect(other(page).locator('[data-role-chip]')).toHaveCount(0);
  expect(posted.map((body) => body.action)).toEqual(['give-role', 'take-role']);
  await page.locator('[data-metric="panel-log-toggle"]').click();
  await expect(page.locator('[data-panel-log] li')).toContainText('Rol dado');
});

test('giving «Administración» asks the wallet to sign: with no wallet in this browser it says so, and gives nothing', async ({
  page,
}) => {
  const posted = await signedIn(page);
  let asked = 0;
  await page.route('**/api/saldo/signature?*', (route: Route) => {
    asked += 1;
    return route.fulfill({
      json: { sign: { message: 'Numinia · Numen Games', token: 'f1.a.b', expiresAt: 'x' } },
    });
  });
  await giveFromTable(page, ADMIN);
  await expect(notices(page).getByRole('alert')).toContainText('no recuerda tu cartera');
  expect(posted).toHaveLength(1);
  expect(posted[0]).not.toHaveProperty('fresh');
  // The wallet is looked for first: no sentence is asked for one that is not there.
  expect(asked).toBe(0);
  await expect(other(page).locator('[data-role-chip]')).toHaveCount(0);
});

test('giving «Administración» with the session’s wallet: it signs the very lines, and the act goes again with the proof', async ({
  page,
}) => {
  const me = await withWallet(page);
  const posted = await signedIn(page, 'owner', me.toLowerCase());
  const lines =
    'Numinia · Numen Games\nDas el rol «Administración», con Administrador, a 0xcdcd…cdcd.';
  const asked: { url: string; body: unknown }[] = [];
  await page.route('**/api/saldo/signature?*', (route: Route) => {
    asked.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return route.fulfill({
      json: { sign: { message: lines, token: 'f1.e2e.token', expiresAt: 'x' } },
    });
  });
  await giveFromTable(page, ADMIN);
  await expect(other(page).locator('[data-role-chip]')).toHaveText(['Administración']);

  // Asked once for the lines of this very act, in the page's language, on the wallet's chain.
  expect(asked).toHaveLength(1);
  const query = new URL(asked[0]!.url).searchParams;
  expect(query.get('locale')).toBe('es');
  expect(query.get('chain')).toBe('1');
  expect(asked[0]!.body).toEqual(posted[0]);
  // Then the same act again, with the token and the wallet's own signature over the lines.
  expect(posted).toHaveLength(2);
  const { fresh, ...act } = posted[1] as { fresh: { token: string; signature: string } };
  expect(act).toEqual(posted[0]);
  expect(fresh.token).toBe('f1.e2e.token');
  expect(
    await verifyEOASignature({ message: lines, signature: fresh.signature, address: me }),
  ).toBe(true);
});

test('saving «Gestionar roles» in a role’s permissions signs the same way', async ({ page }) => {
  const me = await withWallet(page);
  const posted = await signedIn(page, 'owner', me.toLowerCase());
  const lines = 'Numinia · Numen Games\nDas «Gestionar roles» al rol «Finanzas».';
  await page.route('**/api/saldo/signature?*', (route: Route) =>
    route.fulfill({ json: { sign: { message: lines, token: 'f1.e2e.roles', expiresAt: 'x' } } }),
  );
  await page.goto(`/es/panel/roles/?org=${TEAM.id}`);
  await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
  await page.locator('[data-metric="panel-role-tab-permissions"]').click();
  const manage = page.locator('[data-role-permissions]').getByRole('switch', {
    name: 'Gestionar roles',
  });
  await manage.click();
  await page.locator('[data-metric="panel-role-permissions-save"]').click();
  await expect(manage).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-metric="panel-role-permissions-save"]')).toHaveCount(0);
  expect(posted).toHaveLength(2);
  expect(posted[0]).toEqual({
    action: 'edit-role',
    accountId: TEAM.id,
    roleId: FINANCE,
    change: { permissions: ['manage-roles', 'manage-balance'] },
  });
  const { fresh, ...act } = posted[1] as { fresh: { token: string; signature: string } };
  expect(act).toEqual(posted[0]);
  expect(fresh.token).toBe('f1.e2e.roles');
  expect(
    await verifyEOASignature({ message: lines, signature: fresh.signature, address: me }),
  ).toBe(true);
});

test('a wallet that is not the session’s signs nothing', async ({ page }) => {
  await withWallet(page);
  const posted = await signedIn(page);
  let asked = 0;
  await page.route('**/api/saldo/signature?*', (route: Route) => {
    asked += 1;
    return route.fulfill({ json: { sign: { message: 'x', token: 'f1.a.b', expiresAt: 'x' } } });
  });
  await giveFromTable(page, ADMIN);
  await expect(notices(page).getByRole('alert')).toContainText('no es la de tu sesión');
  expect(asked).toBe(0);
  expect(posted).toHaveLength(1);
});

test('a refusal is told in plain words, and nothing moves', async ({ page }) => {
  await signedIn(page);
  await page.goto(`/es/panel/roles/?org=${TEAM.id}`);
  await page.locator(`[data-role="${FINANCE}"] [data-metric="panel-role-select"]`).click();
  await page.locator('[data-metric="panel-role-tab-look"]').click();
  await page.locator('[data-metric="panel-role-delete"]').click();
  await page.locator('[data-metric="panel-role-delete-confirm"]').click();
  await expect(notices(page).getByRole('alert')).toContainText('por debajo de tu rol más alto');
  await expect(page.locator('[data-roles-list] [data-role]')).toHaveCount(3);
});

test('both screens are accessible, on a phone too', async ({ page }) => {
  await signedIn(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/es/panel/miembros/', '/es/panel/roles/']) {
      await page.goto(`${path}?org=${TEAM.id}`);
      await expect(
        page.locator('[data-person], [data-roles-list] [data-role]').first(),
      ).toBeVisible();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll, `${path} at ${width}`).toBeLessThanOrEqual(width);
      const results = await new AxeBuilder({ page }).exclude('.binaria').analyze();
      expect(results.violations, `${path} at ${width}`).toEqual([]);
    }
  }
});
