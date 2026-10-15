/**
 * «Miembros y roles» (v0.94.0) in a real browser against the built site.
 * As in saldo.spec.ts the e2e server has no auth secrets, so the till's
 * answers are played by the browser (`page.route`), shaped as the routes
 * send them. What is under test is what the screen does with each.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const WALLET = '0x42e6000000000000000000000000000000ca26';
const OTHER = '0x' + 'cd'.repeat(20);
const TEAM = { id: 'acc_t', kind: 'team', name: 'Numen Games', role: 'admin', balanceCents: 1880 };
const ADMIN = 'role_0000000000000001';
const FINANCE = 'role_0000000000000002';
const BASE = 'role_0000000000000003';

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

function organization(as: 'owner' | 'house' | 'member', held: string[] = []) {
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
        wallet: WALLET,
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

async function signedIn(page: Page, as: 'owner' | 'house' | 'member' = 'owner') {
  const posted: Record<string, unknown>[] = [];
  let held: string[] = [];
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 200, json: { address: WALLET, rank: 'nomad' } }),
  );
  await page.route('**/api/saldo/roles?*', (route: Route) =>
    route.fulfill({ json: { roles: organization(as, held), you: WALLET } }),
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
    const body = route.request().postDataJSON() as { action: string; roleId?: string };
    posted.push(body);
    if (body.action === 'give-role') held = [FINANCE];
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
    return route.fulfill({ json: { result: organization(as, held) } });
  });
  return posted;
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

test('a role form keeps «Administrador» and «Gestionar roles» shut, and creates the role', async ({
  page,
}) => {
  const posted = await signedIn(page);
  await page.goto('/es/saldo/miembros/');
  await page.locator('[data-metric="saldo-role-new"]').click();
  await expect(page.getByRole('checkbox', { name: 'Administrador' })).toBeDisabled();
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
