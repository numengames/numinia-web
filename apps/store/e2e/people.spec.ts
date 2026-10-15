/**
 * The people of a community's organization (v0.96.0; STD-053 PRS-004), in a
 * real browser against the built site. The e2e server has the fixture desk
 * and no auth secrets, so a visitor is a stranger and gets the head count
 * from the real route; a member's list is played by the browser
 * (`page.route`), shaped as the route sends it. What is under test is what
 * the page does with each answer: nothing invented, names only as text, and
 * a page that stays as it was when the till says nothing.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGE = '/es/communities/numen-games/';

const LIST = {
  view: 'list',
  members: 4,
  groups: [
    {
      id: 'role_0000000000000001',
      name: 'Oráculos <b>x</b>',
      color: '#7c3aed',
      people: [{ short: '0x42e6…ca26', owner: true, you: true, color: '#7c3aed' }],
    },
    {
      id: 'rest',
      name: '',
      color: null,
      people: [
        { short: '0xabab…abab', owner: false, you: false, color: null },
        { short: '0xcdcd…cdcd', owner: false, you: false, color: 'url(javascript:alert(1))' },
        { short: '0x1212…1212', owner: false, you: false, color: '#14b8a6' },
      ],
    },
  ],
};

test('a stranger is told how many, and the names are said to be for members', async ({ page }) => {
  await page.goto(PAGE);
  const slot = page.locator('[data-people="numen-games"]');
  await expect(slot).toBeVisible();
  await expect(slot.locator('[data-people-count]')).toHaveText('3 miembros');
  await expect(slot.locator('[data-people-hidden]')).toBeVisible();
  await expect(slot.locator('.gente-persona')).toHaveCount(0);
});

test('a member sees the groups; a name is only ever text, and a colour only a colour', async ({
  page,
}) => {
  await page.route('**/api/people?*', (route) => route.fulfill({ json: LIST }));
  await page.goto(PAGE);
  const slot = page.locator('[data-people="numen-games"]');
  await expect(slot.locator('[data-people-count]')).toHaveText('4 miembros');
  await expect(slot.locator('[data-people-hidden]')).toBeHidden();
  const names = slot.locator('.gente-grupo > .etiqueta');
  await expect(names).toHaveText(['Oráculos <b>x</b>', 'Más gente']);
  await expect(slot.locator('.gente-grupo b')).toHaveCount(0);
  const people = slot.locator('.gente-persona');
  await expect(people).toHaveCount(4);
  await expect(people.first()).toContainText('0x42e6…ca26');
  await expect(people.first()).toContainText('Propietaria');
  await expect(people.first()).toContainText('(tú)');
  const dots = slot.locator('.gente-punto');
  expect(await dots.nth(0).evaluate((el) => (el as HTMLElement).style.backgroundColor)).not.toBe(
    '',
  );
  expect(await dots.nth(2).evaluate((el) => (el as HTMLElement).style.backgroundColor)).toBe('');
  const axe = await new AxeBuilder({ page }).include('[data-people]').analyze();
  expect(axe.violations).toEqual([]);
});

test('a community with no organization linked has no slot at all', async ({ page }) => {
  await page.goto('/es/communities/trgcon/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-people]')).toHaveCount(0);
});

test('when the till says nothing the slot stays hidden and nothing is made up', async ({
  page,
}) => {
  for (const status of [404, 502, 503]) {
    await page.route('**/api/people?*', (route) =>
      route.fulfill({ status, json: { error: 'no-team' } }),
    );
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-people="numen-games"]')).toBeHidden();
    await page.unroute('**/api/people?*');
  }
});
