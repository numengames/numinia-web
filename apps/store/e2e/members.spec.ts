/**
 * «Miembros y roles» (v0.94.0; the fresh signature, v0.95.0) in a real
 * browser against the built site. As in saldo.spec.ts the e2e server has no
 * auth secrets, so the till's answers are played by the browser
 * (`page.route`), shaped as the routes send them. What is under test is
 * what the screen does with each — and, for the fresh signature, that the
 * real thirdweb code finds the wallet of the session and signs the lines.
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

function organization(as: 'owner' | 'house' | 'member', held: string[] = [], me = WALLET) {
  return {
    ok: true,
    accountId: TEAM.id,
    as,
    roles: [
      role(ADMIN, 'Administración', 2, { permissions: ['administrator'], hoist: true, members: 1 }),
      role(FINANCE, 'Finanzas', 1, { permissions: ['manage-balance'], members: held.length }),
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
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: me, rank: 'nomad' } }),
  );
  await page.route('**/api/saldo/roles?*', (route: Route) =>
    route.fulfill({ json: { roles: organization(as, held, me), you: me } }),
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
      fresh?: unknown;
    };
    posted.push(body);
    // Giving the role that carries «Administrador» waits for a fresh signature (ORG-008).
    if (body.action === 'give-role' && body.roleId === ADMIN && body.fresh === undefined) {
      return route.fulfill({ json: { result: { ok: false, problems: [FRESH_SIGNATURE] } } });
    }
    if (body.action === 'give-role') held = [body.roleId ?? FINANCE];
    if (body.action === 'take-role') held = [];
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
    return route.fulfill({ json: { result: organization(as, held, me) } });
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

test('without a session the tab asks you to sign in and comes back here', async ({ page }) => {
  await page.goto('/es/saldo/miembros/');
  const door = page.locator('[data-saldo-signed-out] a');
  await expect(door).toHaveAttribute('href', '/es/lap/session/?vuelta=%2Fes%2Fsaldo%2Fmiembros%2F');
});

test('shows the roles from the top down, who holds them and the owner strip', async ({ page }) => {
  await signedIn(page);
  await page.goto('/es/saldo/miembros/');
  await expect(page.locator('[data-panel-owner]')).toBeVisible();
  await expect(page.locator('[data-panel-house]')).toHaveCount(0);
  const names = page.locator('[data-role] strong');
  await expect(names).toHaveText(['Administración', 'Finanzas', '@todos']);
  await expect(page.locator(`[data-role="${BASE}"]`)).toContainText('Rol de base');
  // The base role cannot be moved or deleted; the others can.
  await expect(page.locator(`[data-role="${BASE}"] [data-metric="saldo-role-delete"]`)).toHaveCount(
    0,
  );
  await expect(
    page.locator(`[data-role="${FINANCE}"] [data-metric="saldo-role-delete"]`),
  ).toHaveCount(1);
  await expect(page.locator(`[data-role="${ADMIN}"] [data-metric="saldo-role-up"]`)).toHaveCount(0);
  await expect(
    page.locator(`[data-role="${FINANCE}"] [data-metric="saldo-role-down"]`),
  ).toHaveCount(0);
});

test('the house enters with its own strip', async ({ page }) => {
  await signedIn(page, 'house');
  await page.goto('/es/saldo/miembros/');
  await expect(page.locator('[data-panel-house]')).toContainText('Entras como la casa');
});

test('gives and takes a role, then reads the log', async ({ page }) => {
  const posted = await signedIn(page);
  await page.goto('/es/saldo/miembros/');
  const person = page.locator('.saldo-persona').nth(1);
  await person.getByRole('combobox').selectOption(FINANCE);
  await person.locator('[data-metric="saldo-role-give"]').click();
  await expect(person.locator('.saldo-chip', { hasText: 'Finanzas' })).toBeVisible();
  await person.locator('[data-metric="saldo-role-take"]').click();
  await expect(person.locator('.saldo-chip')).toHaveCount(0);
  expect(posted.map((body) => body.action)).toEqual(['give-role', 'take-role']);
  await page.locator('[data-metric="saldo-log-toggle"]').click();
  await expect(page.locator('.saldo-registro li')).toContainText('Rol dado');
});

test('a role form offers every permission, «Administrador» too, and creates the role', async ({
  page,
}) => {
  const posted = await signedIn(page);
  await page.goto('/es/saldo/miembros/');
  await page.locator('[data-metric="saldo-role-new"]').click();
  await expect(page.getByRole('checkbox', { name: 'Administrador' })).toBeEnabled();
  await expect(page.getByRole('checkbox', { name: 'Gestionar roles' })).toBeEnabled();
  await page.getByLabel('Nombre').fill('Cartografía');
  await page.getByRole('checkbox', { name: 'Entrar en la sede' }).check();
  await page.locator('[data-metric="saldo-role-save"]').click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0]).toMatchObject({
    action: 'create-role',
    accountId: TEAM.id,
    role: { name: 'Cartografía', color: null, hoist: false, permissions: ['enter-worlds'] },
  });
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
  await page.goto('/es/saldo/miembros/');
  const person = page.locator('.saldo-persona').nth(1);
  await person.getByRole('combobox').selectOption(ADMIN);
  await person.locator('[data-metric="saldo-role-give"]').click();
  await expect(page.getByRole('alert')).toContainText('no recuerda tu cartera');
  expect(posted).toHaveLength(1);
  expect(posted[0]).not.toHaveProperty('fresh');
  // The wallet is looked for first: no sentence is asked for one that is not there.
  expect(asked).toBe(0);
  await expect(person.locator('.saldo-chip', { hasText: 'Administración' })).toHaveCount(0);
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
  await page.goto('/es/saldo/miembros/');
  const person = page.locator('.saldo-persona').nth(1);
  await person.getByRole('combobox').selectOption(ADMIN);
  await person.locator('[data-metric="saldo-role-give"]').click();
  await expect(person.locator('.saldo-chip', { hasText: 'Administración' })).toBeVisible();

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

test('a wallet that is not the session’s signs nothing', async ({ page }) => {
  await withWallet(page);
  const posted = await signedIn(page);
  let asked = 0;
  await page.route('**/api/saldo/signature?*', (route: Route) => {
    asked += 1;
    return route.fulfill({ json: { sign: { message: 'x', token: 'f1.a.b', expiresAt: 'x' } } });
  });
  await page.goto('/es/saldo/miembros/');
  const person = page.locator('.saldo-persona').nth(1);
  await person.getByRole('combobox').selectOption(ADMIN);
  await person.locator('[data-metric="saldo-role-give"]').click();
  await expect(page.getByRole('alert')).toContainText('no es la de tu sesión');
  expect(asked).toBe(0);
  expect(posted).toHaveLength(1);
});

test('a refusal is told in plain words, and nothing moves', async ({ page }) => {
  await signedIn(page);
  await page.goto('/es/saldo/miembros/');
  await page.locator(`[data-role="${FINANCE}"] [data-metric="saldo-role-delete"]`).click();
  await page.locator('[data-metric="saldo-role-delete-confirm"]').click();
  await expect(page.getByRole('alert')).toContainText('por debajo de tu rol más alto');
  await expect(page.locator('[data-role]')).toHaveCount(3);
});

test('the panel is accessible, on a phone too', async ({ page }) => {
  await signedIn(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/es/saldo/miembros/');
    await expect(page.locator('[data-role]').first()).toBeVisible();
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(width);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
