/**
 * Performance gate (MISSION-017): the numbers that made the city fast stay
 * pinned. Budgets follow Sistema §13.2 (<1MB initial) and the measured
 * baseline of 2026-08-16 (archive 2.4MB→468KB after the thumbnail bake).
 * Layer 0/1 pages ship ZERO JavaScript — the constitution's SSG promise
 * made mechanical. CLS tolerates the typing headline (§10 flagship) but
 * never the 0.1 "needs improvement" line.
 */

import { expect, test, type Page } from '@playwright/test';

interface Budget {
  readonly path: string;
  readonly totalKB: number;
  readonly jsKB: number;
  readonly imgKB: number;
}

// Total budgets carry ~25% headroom over the measured baseline; JS budgets
// are exact promises (zero means zero).
const BUDGETS: readonly Budget[] = [
  // The front door of the communities platform (2026-10-14): the featured
  // community's illustration, the three seals and the city rituals' pictures
  // (~363KB measured; the cards without a picture draw a monogram, no art,
  // to keep it there). Still 0 KB of external JS.
  { path: '/', totalKB: 720, jsKB: 0, imgKB: 450 },
  { path: '/es/', totalKB: 720, jsKB: 0, imgKB: 450 },
  // The Bazaar (v0.83.0) — the one door to the goods; the Archive's index
  // and the Gallery (zero-JS pages, 620/450KB) went out with it. It is the
  // Finder's island rethought: React and the island (~211KB, the 3D viewer
  // only on «See it in 3D»), the first rows of baked thumbnails lazily
  // (~301KB), ~750KB in all (measured on the fixture, 1280×720).
  { path: '/bazaar/', totalKB: 940, jsKB: 230, imgKB: 380 },
  // «Cómo funciona» took the old /city/ line (v0.83.0): text, six templates
  // and one lazy illustration of the city's story. Zero external JS.
  { path: '/how-it-works/', totalKB: 420, jsKB: 0, imgKB: 160 },
  { path: '/lap/', totalKB: 260, jsKB: 30, imgKB: 10 },
  // The book plane pays for its paper: four self-hosted Alegreya faces +
  // Geist + the grain put the cover at ~706KB (measured 2026-08-18), all
  // immutable-cached statics — while the reader itself stays at ~6KB JS.
  { path: '/lap/codex/', totalKB: 780, jsKB: 30, imgKB: 10 },
  { path: '/lap/portals/', totalKB: 280, jsKB: 30, imgKB: 10 },
  // Raised 280→300 (2026-08-18, MIS-085 D): the v0.6.0 rules engine ships
  // with the island — enabling matrix, position mechanics (id-only facts,
  // ~4KB) and the gear control. Feature weight with a name, not creep.
  // Raised 480→495 (2026-09-29): the house look as numinia.org draws it —
  // the night sky, the phone menu and a Phosphor icon per bar entry — rides
  // on every chromed page; this one sat closest to its line (485KB).
  // Raised 495→515 (2026-10-14, the app shell): the sidebar, the top bar's
  // ⋮ menu, the phone's tab bar and the folded footer ride on every page
  // (measured 504KB here; the island itself did not change).
  // Raised 515→522 (2026-10-14, Pablo's walkthrough): the sheet laid out —
  // its head with the portrait, the blank sheet's one door, the identity in
  // groups, the dots — and the manual's sheet opened in a panel (~0.8KB of
  // script; its text comes from the Codex page on demand). Measured 515.5KB
  // (511.8KB before); the page's HTML shrank, the island grew ~3KB.
  { path: '/lap/character/', totalKB: 522, jsKB: 300, imgKB: 10 },
  // The login page carries the wallet vendor — the one sanctioned heavy page,
  // still under the 1MB line. It grows past it only with a written reason.
  // Written reason (2026-10-14): the app shell above, measured 1028KB; the
  // wallet vendor is unchanged. Raised 1040→1050 the same day, with the
  // balanced two-column door and the wallet's permission line (Pablo's
  // walkthrough): measured 1039.6KB, a hair under the old line.
  // Raised 1050→1062 on 2026-10-16 (v0.112.0, «La ciudad y tú»): the chrome's
  // two rails, the phone's bar and «Tú» sheet and their menus are in every
  // page's HTML (~11KB more markup than the sidebar and top bar); measured
  // 1051KB, the wallet vendor unchanged.
  { path: '/lap/session/', totalKB: 1062, jsKB: 900, imgKB: 10 },
];

interface Weight {
  readonly js: number;
  readonly img: number;
  readonly total: number;
}

/** Opens a page and weighs everything it fetched, in KB. */
async function weigh(page: Page, path: string): Promise<Weight> {
  const sizes = { js: 0, img: 0, total: 0 };
  page.on('response', async (response) => {
    const body = await response.body().catch(() => Buffer.alloc(0));
    sizes.total += body.length;
    const type = response.request().resourceType();
    if (type === 'script') sizes.js += body.length;
    if (type === 'image') sizes.img += body.length;
  });
  await page.goto(path, { waitUntil: 'networkidle' });
  const kb = (n: number): number => Math.round(n / 1024);
  return { js: kb(sizes.js), img: kb(sizes.img), total: kb(sizes.total) };
}

for (const budget of BUDGETS) {
  test(`weight budget: ${budget.path}`, async ({ page }) => {
    const weight = await weigh(page, budget.path);
    expect(weight.js, `${budget.path} ships ${weight.js}KB of JS`).toBeLessThanOrEqual(budget.jsKB);
    expect(weight.img, `${budget.path} ships ${weight.img}KB of images`).toBeLessThanOrEqual(
      budget.imgKB,
    );
    expect(weight.total, `${budget.path} weighs ${weight.total}KB`).toBeLessThanOrEqual(
      budget.totalKB,
    );
  });
}

// The same Bazaar on a density-2 screen — a phone, a Retina laptop — which
// takes the 480px cut of every card, not the 1x one (v0.91.0: the gate had
// only ever measured density 1). Under Playwright's Chromium every lazy card
// loads, even those 2200px below the fold, so this is the worst case, pinned.
// Measured 573KB of images, 1049KB in all; AVIF at the same look would be ~310KB — the next
// lever, with a <picture> fallback, if this line ever has to come down.
test.describe('on a density-2 screen', () => {
  test.use({ deviceScaleFactor: 2 });
  test('weight budget: /bazaar/ with the 480px cards', async ({ page }) => {
    const weight = await weigh(page, '/bazaar/');
    expect(weight.js, `/bazaar/ ships ${weight.js}KB of JS`).toBeLessThanOrEqual(230);
    expect(weight.img, `/bazaar/ ships ${weight.img}KB of images`).toBeLessThanOrEqual(640);
    expect(weight.total, `/bazaar/ weighs ${weight.total}KB`).toBeLessThanOrEqual(1180);
  });
});

test('layout stays still: CLS under 0.1 on the landing', async ({ page }) => {
  await page.addInitScript(() => {
    (window as { __cls?: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEntry[] &
        { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) (window as { __cls?: number }).__cls! += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/es/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const cls = await page.evaluate(() => (window as { __cls?: number }).__cls ?? 0);
  expect(cls, `CLS ${cls.toFixed(3)}`).toBeLessThan(0.1);
});
