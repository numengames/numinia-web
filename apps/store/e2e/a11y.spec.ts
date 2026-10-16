/**
 * Accessibility gate — the constitution's "Semantic HTML. WCAG AA" as an
 * executable check, not an aspiration. Every page added to the store must be
 * listed here (or covered by a glob route) and pass with zero violations.
 *
 * BOTH MODES (MIS-078, acceptance criterion 2): the platform is Diurno by
 * default and Nocturno by choice, so a gate that only measures one of them
 * certifies half a product. It measured half until 2026-08-18, and the other
 * half was shipping four AA failures — tertiary ink over surfaces, the
 * turquoise fill used as text, grana as a label, and a link that relied on
 * color alone. `colorScheme` drives the layout's own bootstrap: dark resolves
 * to Nocturno, light leaves the Diurno default.
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
  '/bazaar/', // the one door to the goods (v0.83.0): finder, gallery, archive, assets, inspector redirect here
  '/es/bazaar/',
  '/updates/',
  '/es/legal/privacy/',
  '/legal/terms/', // real corpus (MIS-086): long-form markdown, not our markup
  // The app shell pages (v0.83.0): «Cómo funciona» replaced /es/city/.
  '/es/how-it-works/',
  '/es/live/',
  '/es/belong/',
  '/es/rituals/numinia-anniversary-2026/', // the world stage, with a real world
  '/es/rituals/trg26/', // the world stage, home still to open
  '/es/communities/trgcon/', // the follow button and the home card
  '/es/mundos/', // the index of worlds (v3 «Ahora y Mundos»): cards, filters, state tooltips
  '/es/mundos/agora-plaza/', // a world's page with its card
  '/es/lap/',
  '/es/lap/character/',
  '/es/lap/codex/', // gated: what axe sees is the door, which must be accessible too
  '/es/lap/codex/glosario/',
  '/es/lap/codex/ficha/',
  '/es/lap/portals/',
  '/es/lap/seasons/',
  '/es/lap/settings/',
  '/es/notifications/', // the «Más» bell (2026-10-15): signed out, the door; the tabs in notifications.spec.ts
  '/es/lap/session/',
  '/es/lap/admin/assets/',
  '/es/lap/admin/census/',
  '/es/lap/admin/prices/',
  '/es/saldo/', // without a session: the door (the panel is measured in saldo.spec.ts)
  // /es/saldo/miembros/ only sends to /es/panel/miembros/ now: measured there.
  '/es/saldo/referidos/',
  '/es/panel/', // the organization panel without a session: the door (signed in it is measured in panel.spec.ts)
  '/es/panel/miembros/', // signed in: members.spec.ts and panel-gente.spec.ts
  '/es/panel/roles/',
  '/es/panel/agentes/', // without a session: the door; signed in, in both modes: panel-agentes.spec.ts
  '/es/panel/saldo/',
  '/support/', // the help page (v0.70.0)
];

const MODES = [
  { name: 'diurno', colorScheme: 'light' as const },
  { name: 'nocturno', colorScheme: 'dark' as const },
];

for (const mode of MODES) {
  test.describe(mode.name, () => {
    test.use({ colorScheme: mode.colorScheme });
    for (const path of PAGES) {
      test(`WCAG A/AA: ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        // Walk the whole page before measuring. Reveals fire on intersection,
        // so at 1280×720 everything below the fold stays at opacity 0 and axe
        // skips it silently — that is how two contrast defects reached
        // production on /updates/, whose first card starts at y=735.
        await page.evaluate(async () => {
          const step = Math.round(window.innerHeight * 0.8);
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 60));
          }
          window.scrollTo(0, 0);
        });
        // Sistema §10-09: analyze after the orchestrated entry settles — axe
        // blending mid-transition opacities reports phantom contrast ratios.
        await page
          .locator('.reveal:not(.visible)')
          .first()
          .waitFor({ state: 'detached', timeout: 5000 })
          .catch(() => undefined);
        // A reveal that just turned visible is still fading in: on a long page
        // (/updates/ grows with every release) the last cards are mid-fade when
        // axe reads them. Let every finite animation end, as axe() below does.
        await page.evaluate(() =>
          Promise.race([
            Promise.all(
              document
                .getAnimations()
                .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
                .map((animation) => animation.finished.catch(() => undefined)),
            ),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]),
        );
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // Sistema §6.1 binaria: texture-as-text, aria-hidden, deliberately faint.
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
  });
}

test('keyboard: the chrome walks in order and the focus ring is the system turquoise', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const stops: string[] = [];
  let sawSystemOutline = false;
  for (let i = 0; i < 24; i += 1) {
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
  // The app shell's reading order (the Oracle's design, 2026-10-14): the
  // skip link, the sidebar top to bottom — brand, fold, search, the places,
  // the call to sign in — then the top bar's door and ⋮. The folded
  // footer at the foot of the sidebar sits between the two.
  const expected = [
    'nav-skip',
    'nav-home',
    'nav-collapse',
    'nav-search',
    'nav-for-you',
    'nav-explore',
    'nav-communities',
    'nav-calendar',
    'nav-bazaar',
    'nav-belong',
    'nav-live',
    'nav-profile',
    'nav-more',
    'nav-sign-in',
    'chrome-sign-in',
    'chrome-more',
  ];
  expect(stops[0], stops.join(' → ')).toBe('nav-skip');
  const positions = expected.map((metric) => stops.indexOf(metric));
  expect(positions, stops.join(' → ')).not.toContain(-1);
  expect(
    [...positions].sort((a, b) => a - b),
    stops.join(' → '),
  ).toEqual(positions);
  expect(sawSystemOutline, `outlines seen on: ${stops.join(' → ')}`).toBe(true);
});

/* The app shell at both ends of the screen (1440 desktop, 390 phone), in
   both modes, with its menus open and the sidebar folded: the chrome is on
   every page, so its own states are measured here, not only the pages. */
const SHELL_PAGES = [
  '/',
  '/es/',
  '/es/communities/',
  '/es/mundos/',
  '/es/bazaar/',
  '/es/lap/',
  '/es/legal/cookies/',
  '/updates/',
];
const SHELL_VIEWPORTS = [
  { name: 'desktop 1440', width: 1440, height: 900 },
  { name: 'phone 390', width: 390, height: 844 },
];

async function axe(page: import('@playwright/test').Page): Promise<unknown[]> {
  /* The home's hero fades in (a staggered entrance): measured mid-fade, axe
     reads a blend of a button and the page, not the colour a reader sees.
     Let every finite animation end first (the sky's endless ones excluded). */
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.binaria')
    .exclude('[data-metric="auth-connect"]')
    .analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
  }));
}

for (const mode of MODES) {
  for (const viewport of SHELL_VIEWPORTS) {
    test.describe(`app shell — ${mode.name}, ${viewport.name}`, () => {
      test.use({
        colorScheme: mode.colorScheme,
        viewport: { width: viewport.width, height: viewport.height },
      });
      for (const path of SHELL_PAGES) {
        test(`WCAG A/AA: ${path}`, async ({ page }) => {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          const violations = await axe(page);
          expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
      }

      test('WCAG A/AA with ⋮ and the folded footer open', async ({ page }) => {
        await page.goto('/es/');
        await page.waitForLoadState('networkidle');
        await page.locator('[data-metric="chrome-more"]').click();
        await page.locator('[data-lang-menu] summary').click();
        for (const fold of await page.locator('.pie-pliegue:visible > summary').all()) {
          await fold.click();
        }
        const violations = await axe(page);
        expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      });

      if (viewport.width > 860) {
        test('WCAG A/AA with «Más» open, then with the sidebar folded', async ({ page }) => {
          await page.goto('/es/');
          await page.waitForLoadState('networkidle');
          await page.locator('[data-metric="nav-more"]').click();
          expect(await axe(page)).toEqual([]);
          await page.keyboard.press('Escape');
          await page.locator('[data-metric="nav-collapse"]').click();
          const violations = await axe(page);
          expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        });
      }
    });
  }
}
