/**
 * The sphere of Numen Games and its page (v3 «La esfera y la casa»): the
 * sphere renders (WebGL or its CSS fallback), a drag turns the ring, the
 * arrow keys and Home turn it, the focus on a dot brings it to the front,
 * a touch screen takes two taps (the name, then the door), Esc closes a name,
 * the house's page carries its sections in the five locales, and axe stays
 * clean on a phone and a desktop, by night and by day.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const INDEX = '/es/communities/';
const HOUSE = '/es/communities/numen-games/';

async function awake(page: Page): Promise<void> {
  await expect(page.locator('[data-house-sphere][data-live]').first()).toBeAttached({
    timeout: 15_000,
  });
}

const ringPath = (page: Page): Promise<string | null> =>
  page.locator('[data-house-sphere] .anillo.delante path').first().getAttribute('d');

test('the house leaves the grid and its sphere draws one dot per community, WebGL or not', async ({
  page,
}) => {
  await page.goto(INDEX);
  await expect(page.locator('#communities a[href$="/communities/numen-games/"]')).toHaveCount(0);
  const cards = await page.locator('#communities [data-search]').count();
  const sphere = page.locator('[data-house-sphere]');
  await expect(sphere).toBeVisible();
  expect(await sphere.locator('[data-dot]').count()).toBe(Math.min(12, cards));
  await expect(sphere.locator('.mas-com')).toHaveCount(cards > 12 ? 1 : 0);
  await awake(page);
  // Either the oracle is drawn in WebGL, or the built CSS sphere stays.
  await expect
    .poll(
      () =>
        sphere.evaluate((el) => el.classList.contains('lista') || el.classList.contains('sin-gl')),
      {
        timeout: 15_000,
      },
    )
    .toBe(true);
  await expect(page.locator('.cuenta')).toContainText('y Numen Games, que las reúne');
});

test('a drag turns the ring, the arrows turn it and Home puts it back', async ({ page }) => {
  await page.goto(HOUSE);
  await awake(page);
  const handle = page.locator('[data-sphere-handle]');
  // The arrival's single settle turn (when motion is allowed) ends at the built rest.
  const built = await (await page.request.get(HOUSE)).text();
  const rest =
    /class="anillo delante"[^>]*>\s*<path class="aro" d="([^"]+)"/.exec(built)?.[1] ?? '';
  expect(rest).not.toBe('');
  await expect.poll(() => ringPath(page), { timeout: 15_000 }).toBe(rest);
  const box = await page.locator('[data-house-sphere]').boundingBox();
  if (!box) throw new Error('no sphere box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 4 });
  await page.mouse.move(x + 120, y, { steps: 4 });
  await page.mouse.up();
  expect(await ringPath(page)).not.toBe(rest);

  await handle.focus();
  await page.keyboard.press('Home');
  await expect.poll(() => ringPath(page)).toBe(rest);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => ringPath(page)).not.toBe(rest);
  await page.keyboard.press('Home');
  await expect.poll(() => ringPath(page)).toBe(rest);
});

test('under reduced motion it does not move on its own: no settle turn on arrival', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const built = await (await page.request.get(HOUSE)).text();
  const front = /class="anillo delante"[^>]*>\s*<path class="aro" d="([^"]+)"/.exec(built);
  expect(front).not.toBeNull();
  await page.goto(HOUSE);
  await awake(page);
  await page.waitForTimeout(600);
  expect(await ringPath(page)).toBe(front?.[1]);
});

test('the focus on a dot brings it to the front and shows its name; Esc closes it', async ({
  page,
}) => {
  await page.goto(HOUSE);
  await awake(page);
  await page.locator('[data-sphere-handle]').focus();
  await page.keyboard.press('Tab');
  const dot = page.locator('[data-house-sphere] [data-dot]').first();
  await expect(dot.locator('a')).toBeFocused();
  await expect(dot).toHaveClass(/frente/);
  await expect(dot.locator('em')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dot.locator('em')).toBeHidden();
});

test('pointing at a chip of the legend brings its dot to the front', async ({ page }) => {
  await page.goto(HOUSE);
  await awake(page);
  const last = page.locator('[data-house-sphere] [data-dot]').last();
  const id = await last.getAttribute('data-dot');
  await page.locator(`[data-ring-chip="${id}"]`).hover();
  await expect(last).toHaveClass(/activo/);
  await expect(last).toHaveClass(/frente/);
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('the first tap names the dot and brings it front, the second goes', async ({ page }) => {
    await page.goto(HOUSE);
    await awake(page);
    const dot = page.locator('[data-house-sphere] [data-dot]:not(.oculto)').first();
    const id = await dot.getAttribute('data-dot');
    const target = page.locator(`[data-house-sphere] [data-dot="${id}"]`);
    await target.locator('a').tap();
    await expect(page).toHaveURL(new RegExp(`${HOUSE}$`));
    await expect(target).toHaveClass(/nombrado/);
    await expect(target).toHaveClass(/frente/);
    await expect(target.locator('em')).toBeVisible();
    await target.locator('a').tap();
    await expect(page).toHaveURL(new RegExp(`/es/communities/${id}/$`));
  });
});

for (const prefix of ['', '/es', '/ja', '/ko', '/pt-br']) {
  test(`the page of Numen Games tells its sections (${prefix || 'en'})`, async ({ page }) => {
    await page.goto(`${prefix}/communities/numen-games/`);
    await expect(page.locator('h1')).toHaveText('Numen Games');
    await expect(page.locator('#nudo .anillos-3 > li')).toHaveCount(3);
    await expect(page.locator('#metajuego article')).toHaveCount(5);
    await expect(page.locator('[data-house-ranks] li')).toHaveCount(6);
    await expect(page.locator('#citas')).toBeAttached();
    await expect(page.locator('.cierre-casa p')).toContainText(
      'They dreamed and experimented life',
    );
    await expect(page.locator('[data-house-sphere]')).toBeVisible();
  });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1600, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];
const MODES = [
  { name: 'night', colorScheme: 'dark' as const },
  { name: 'day', colorScheme: 'light' as const },
];

for (const viewport of VIEWPORTS) {
  for (const mode of MODES) {
    test.describe(`axe — ${viewport.name}, ${mode.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: mode.colorScheme,
      });
      for (const path of [INDEX, HOUSE]) {
        test(`WCAG A/AA: ${path}`, async ({ page }) => {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          await page.evaluate(async () => {
            const step = Math.round(window.innerHeight * 0.8);
            for (let y = 0; y < document.body.scrollHeight; y += step) {
              window.scrollTo(0, y);
              await new Promise((resolve) => setTimeout(resolve, 60));
            }
            window.scrollTo(0, 0);
          });
          await awake(page);
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .exclude('.binaria')
            .exclude('[data-metric="auth-connect"]')
            .analyze();
          const violations = results.violations.map((violation) => ({
            id: violation.id,
            nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
          }));
          expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
      }
    });
  }
}
