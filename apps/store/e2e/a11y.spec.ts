/**
 * Accessibility gate — the constitution's "Semantic HTML. WCAG AA" as an
 * executable check, not an aspiration. Every page added to the store must be
 * listed here (or covered by a glob route) and pass with zero violations.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/es/',
  '/ja/',
  '/ko/',
  '/pt-br/',
  '/spike/',
  '/archive/',
  '/es/archive/',
  '/gallery/',
  '/es/gallery/',
  '/finder/',
  '/es/finder/',
  '/updates/',
  '/es/legal/privacy/',
  '/es/docs/',
  '/docs/developers/',
  '/es/inspector/',
  '/es/city/',
  '/es/assets/',
  '/es/lap/',
  '/es/lap/character/',
  '/es/lap/codex/', // gated: what axe sees is the door, which must be accessible too
  '/es/lap/portals/',
  '/es/lap/settings/',
  '/es/lap/session/',
  '/es/lap/admin/assets/',
  '/es/lap/admin/census/',
];

for (const path of PAGES) {
  test(`WCAG A/AA: ${path}`, async ({ page }) => {
    await page.goto(path);
    // Khepri §10-09: analyze the page after its orchestrated entry settles —
    // axe blending mid-transition opacities reports phantom contrast ratios.
    await page.waitForLoadState('networkidle');
    await page
      .locator('.reveal:not(.visible)')
      .first()
      .waitFor({ state: 'detached', timeout: 3000 })
      .catch(() => undefined);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Khepri §6.1 binaria: texture-as-text, aria-hidden, deliberately faint.
      // WCAG 1.4.3 exempts pure decoration from contrast; axe cannot know.
      .exclude('.binaria')
      // The wallet widget is vendor markup (thirdweb ConnectEmbed): one of
      // its internal buttons ships without an accessible name. We cannot
      // patch third-party DOM — reported upstream, excluded here so the gate
      // keeps guarding OUR markup on this page instead of going silent.
      .exclude('[data-metric="auth-connect"]')
      .analyze();
    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

test('keyboard: the chrome walks in order and the focus ring is the system turquoise', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const stops: string[] = [];
  let sawSystemOutline = false;
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return {
        metric: el.dataset['metric'] ?? el.tagName.toLowerCase(),
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
      };
    });
    stops.push(info.metric);
    // §5: outline 2px solid #018EA1 = rgb(1, 142, 161), visible always.
    if (info.outlineColor === 'rgb(1, 142, 161)' && info.outlineWidth === '2px') {
      sawSystemOutline = true;
    }
  }
  // Tab order follows the chrome's reading order — brand, pillars, utilities.
  const expected = ['nav-home', 'nav-city', 'nav-assets', 'nav-lap', 'chrome-mode'];
  const positions = expected.map((metric) => stops.indexOf(metric));
  expect(positions, stops.join(' → ')).not.toContain(-1);
  expect(
    [...positions].sort((a, b) => a - b),
    stops.join(' → '),
  ).toEqual(positions);
  expect(sawSystemOutline, `outlines seen on: ${stops.join(' → ')}`).toBe(true);
});
