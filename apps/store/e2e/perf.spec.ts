/**
 * Performance gate (MISSION-017): the numbers that made the city fast stay
 * pinned. Budgets follow Sistema §13.2 (<1MB initial) and the measured
 * baseline of 2026-08-16 (archive 2.4MB→468KB after the thumbnail bake).
 * Layer 0/1 pages ship ZERO JavaScript — the constitution's SSG promise
 * made mechanical. CLS tolerates the typing headline (§10 flagship) but
 * never the 0.1 "needs improvement" line.
 */

import { expect, test } from '@playwright/test';

interface Budget {
  readonly path: string;
  readonly totalKB: number;
  readonly jsKB: number;
  readonly imgKB: number;
}

// Total budgets carry ~25% headroom over the measured baseline; JS budgets
// are exact promises (zero means zero).
const BUDGETS: readonly Budget[] = [
  { path: '/', totalKB: 220, jsKB: 0, imgKB: 10 },
  { path: '/es/', totalKB: 220, jsKB: 0, imgKB: 10 },
  { path: '/archive/', totalKB: 620, jsKB: 0, imgKB: 400 },
  { path: '/gallery/', totalKB: 450, jsKB: 0, imgKB: 250 },
  { path: '/city/', totalKB: 420, jsKB: 0, imgKB: 160 },
  { path: '/lap/', totalKB: 260, jsKB: 30, imgKB: 10 },
  // The book plane pays for its paper: four self-hosted Alegreya faces +
  // Geist + the grain put the cover at ~706KB (measured 2026-08-18), all
  // immutable-cached statics — while the reader itself stays at ~6KB JS.
  { path: '/lap/codex/', totalKB: 780, jsKB: 30, imgKB: 10 },
  { path: '/lap/portals/', totalKB: 280, jsKB: 30, imgKB: 10 },
  // Raised 280→300 (2026-08-18, MIS-085 D): the v0.6.0 rules engine ships
  // with the island — enabling matrix, position mechanics (id-only facts,
  // ~4KB) and the gear control. Feature weight with a name, not creep.
  { path: '/lap/character/', totalKB: 480, jsKB: 300, imgKB: 10 },
  // The login page carries the wallet vendor — the one sanctioned heavy page,
  // still under the 1MB line. It grows past it only with a written reason.
  { path: '/lap/session/', totalKB: 1024, jsKB: 900, imgKB: 10 },
];

for (const budget of BUDGETS) {
  test(`weight budget: ${budget.path}`, async ({ page }) => {
    const sizes = { js: 0, img: 0, total: 0 };
    page.on('response', async (response) => {
      const body = await response.body().catch(() => Buffer.alloc(0));
      sizes.total += body.length;
      const type = response.request().resourceType();
      if (type === 'script') sizes.js += body.length;
      if (type === 'image') sizes.img += body.length;
    });
    await page.goto(budget.path, { waitUntil: 'networkidle' });
    const kb = (n: number): number => Math.round(n / 1024);
    expect(kb(sizes.js), `${budget.path} ships ${kb(sizes.js)}KB of JS`).toBeLessThanOrEqual(
      budget.jsKB,
    );
    expect(kb(sizes.img), `${budget.path} ships ${kb(sizes.img)}KB of images`).toBeLessThanOrEqual(
      budget.imgKB,
    );
    expect(kb(sizes.total), `${budget.path} weighs ${kb(sizes.total)}KB`).toBeLessThanOrEqual(
      budget.totalKB,
    );
  });
}

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
