/**
 * Cross-engine + responsive gate (MISSION-009): the platform must behave on
 * WebKit (iPhone/Safari), Firefox and Chromium, at phone, tablet and desktop
 * widths. What it pins is engine-sensitive and layout-critical:
 *   - no horizontal overflow (a page wider than its viewport is a defect)
 *   - touch targets ≥44px on phones (WCAG 2.2 AA is 24, Khepri §12 asks 44)
 *   - both modes actually flip (data-modo drives every token)
 *   - the sheet's file round-trip works (Blob/URL/FileReader differ per engine)
 * Runs against the built server; the projects live in playwright.config.
 */

import { expect, test } from '@playwright/test';

const PAGES = [
  '/es/lap/',
  '/es/lap/character/',
  '/es/lap/codex/',
  '/es/lap/codex/glosario/',
  '/es/lap/stats/',
  '/es/lap/settings/',
  '/es/lap/admin/assets/',
  '/es/city/',
  '/es/archive/',
  '/',
  // Responsive-audit offenders of 2026-08-16, pinned so they never return:
  // an underscore-heavy asset name, code-heavy docs, a markdown table.
  '/archive/ndg-019d3f89-3aca-7631-b541-054596bb1de6/',
  '/docs/developers/',
  '/docs/about/ardrive/',
] as const;

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

for (const viewport of VIEWPORTS) {
  for (const path of PAGES) {
    test(`${viewport.name} · no horizontal overflow: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      // 1px of rounding slack; anything more is a real horizontal scrollbar.
      expect(overflow.scroll, `${path} overflows at ${viewport.width}px`).toBeLessThanOrEqual(
        overflow.client + 1,
      );
    });
  }
}

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} · no horizontal overflow: every codex chapter`, async ({ page }) => {
    // Chapter slugs differ per corpus (CI builds hermetic on the fixture
    // manual), so the sweep discovers them from the index — hardcoded
    // real-corpus URLs silently 302'd to the cover and tested nothing.
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/es/lap/codex/');
    const chapters = await page
      .locator('.toc a')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute('href') ?? ''),
      );
    expect(chapters.length).toBeGreaterThan(0);
    for (const href of chapters) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(overflow.scroll, `${href} overflows at ${viewport.width}px`).toBeLessThanOrEqual(
        overflow.client + 1,
      );
    }
  });
}

test('phone · primary controls meet the 44px touch target', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/es/lap/character/');
  await page.waitForLoadState('networkidle');
  for (const selector of ['[data-metric="lap-sheet-edit"]', '[data-metric="lap-nav-codex"]']) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box, `${selector} not visible`).not.toBeNull();
    expect(box!.height, `${selector} is ${box!.height}px tall`).toBeGreaterThanOrEqual(40);
  }
});

test('phone · the chrome stays compact — two rows, never three', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/es/');
  await page.waitForLoadState('networkidle');
  const height = await page.locator('header').evaluate((el) => el.getBoundingClientRect().height);
  // Two 44px rows + paddings ≈ 105px; three loose rows was ~154px.
  expect(height).toBeLessThanOrEqual(120);
});

test('both modes flip every surface token', async ({ page }) => {
  await page.goto('/es/lap/stats/');
  const read = async (): Promise<string> =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const diurno = await read();
  await page.evaluate(() => {
    document.documentElement.dataset['modo'] = 'nocturno';
  });
  expect(await read()).not.toBe(diurno);
});

test('content survives with JavaScript disabled (SSG promise)', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of ['/es/lap/stats/', '/es/lap/codex/', '/es/archive/']) {
    await page.goto(path);
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll('.reveal')].filter(
          (el) => Number(getComputedStyle(el).opacity) < 1,
        ).length,
    );
    expect(hidden, `${path} hides content without JS`).toBe(0);
  }
  await context.close();
});

test('a veiled chapter ships only its teaser, never the text', async ({ page, request }) => {
  // The Umbral is a funnel, not a wall (D2+D6): the READER veils gated
  // chapters — their body must be ABSENT from the response, not hidden
  // with CSS — while the .md download of the whole book stays free.
  const chapter = await request.get('/es/lap/codex/historia-y-leyendas-de-numinia/');
  expect(await chapter.text()).not.toMatch(/Tohu va-Bohu|Athanasius/);
  const legacy = await request.get('/es/lap/codex/capitulo-2/');
  expect(await legacy.text()).not.toMatch(/Tohu va-Bohu|Athanasius/);
  const download = await request.get('/api/codex/manual.md');
  expect(download.status()).toBe(200);
  expect(await download.text()).toContain('CAPÍTULO');
  await page.goto('/es/lap/codex/');
  await expect(page.locator('[data-metric="codex-gate-enter"]')).toBeVisible();
});

test('the book travels: PDF and EPUB editions download free (D6)', async ({ request }) => {
  // Baked by scripts/build-exports.mjs into dist/client/descargas/ after
  // every build — locally, in CI and on deploy. No login, ever.
  const base = 'Numinia_Manual_del_juego_de_rol_v0_6_0';
  const pdf = await request.get(`/descargas/${base}.pdf`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const epub = await request.get(`/descargas/${base}.epub`);
  expect(epub.status()).toBe(200);
  const bytes = await epub.body();
  // EPUB handshake: a zip whose FIRST entry is the stored `mimetype`.
  expect(bytes.subarray(0, 2).toString()).toBe('PK');
  expect(bytes.subarray(30, 38).toString()).toBe('mimetype');
});

/** CI builds are hermetic: the fixture manual has its own chapter slugs, so
 * codex tests resolve a REAL open chapter from the index instead of
 * hardcoding one — the same path a reader walks. */
async function gotoFirstChapter(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/es/lap/codex/');
  const href = await page.locator('.toc a').first().getAttribute('href');
  await page.goto(href!);
  await page.waitForLoadState('networkidle');
}

test('the chrome compacts but never leaves; the final paragraph can be marked', async ({
  page,
}) => {
  // A short viewport guarantees scroll room on the lean fixture corpus too.
  await page.setViewportSize({ width: 1024, height: 500 });
  await gotoFirstChapter(page);
  // Reading downward compacts the bar — it must NOT leave the screen
  // (Oracle amendment 2026-08-18: bookmark and index always one tap away).
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForFunction(() =>
    document.querySelector('.codex .chrome')?.classList.contains('compacta'),
  );
  await expect(page.locator('.codex .chrome')).toBeInViewport();
  // At the very end of the page, the bookmark pins the LAST block — the
  // top-most rule alone made a chapter's closing paragraphs unmarkable.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  await page.locator('[data-codex-marca]').click();
  const marked = await page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('numinia-codex-marca') ?? '{}') as { blockId?: string })
        .blockId,
  );
  const lastBlock = await page.evaluate(() => {
    const blocks = document.querySelectorAll('.cuerpo [id]');
    return blocks[blocks.length - 1]?.id;
  });
  expect(marked).toBe(lastBlock);
  // Chapter jumps live in the running footer, mid-read.
  await page.evaluate(() => window.scrollBy(0, -160));
  await expect(page.locator('.pie [data-metric="codex-pie-next"]')).toBeVisible();
  await expect(page.locator('.pie [data-metric="codex-pie-prev"]')).toHaveAttribute(
    'href',
    /\/lap\/codex\//,
  );
});

test('el Narrador reads aloud and follows the sounding block', async ({ page }) => {
  // Deterministic voice through the script's test seam (__narradorSynth) —
  // window.speechSynthesis itself is not replaceable in every engine, and
  // headless WebKit must never touch the real voice stack.
  await page.addInitScript(() => {
    class FakeUtterance {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    const fake = {
      speaking: false,
      paused: false,
      speak(utterance: FakeUtterance) {
        fake.speaking = true;
        setTimeout(() => utterance.onstart?.(), 0);
      },
      cancel() {
        fake.speaking = false;
      },
      pause() {
        fake.paused = true;
      },
      resume() {
        fake.paused = false;
      },
      getVoices: () => [{ lang: 'es-ES', name: 'Voz de prueba' }],
      addEventListener() {},
    };
    (window as { __narradorSynth?: unknown }).__narradorSynth = fake;
    (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = FakeUtterance;
  });
  await gotoFirstChapter(page);
  const narrator = page.locator('[data-codex-narrador]');
  await expect(narrator).toBeVisible();
  await narrator.click();
  await expect(narrator).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.cuerpo .narrando')).toHaveCount(1);
  const pace = page.locator('[data-codex-ritmo]');
  await expect(pace).toBeVisible();
  await pace.click();
  await expect(pace).toContainText('×1.25');
  // Pause keeps the place and hands the button its next verb.
  await narrator.click();
  await expect(narrator).toHaveAttribute('aria-pressed', 'false');
  // No prose, no narrator: the glossary offers no button (v1 reads chapters).
  await page.goto('/es/lap/codex/glosario/');
  await expect(page.locator('[data-codex-narrador]')).toBeHidden();
});

test('management data is refused without a session', async ({ request }) => {
  const response = await request.get('/api/admin/overview');
  expect(response.status()).toBe(403);
  expect(await response.text()).not.toContain('assets');
});

test('the census is refused without a session — read and write alike', async ({ request }) => {
  const read = await request.get(
    '/api/admin/census?wallet=0x0000000000000000000000000000000000000001',
  );
  expect(read.status()).toBe(403);
  const write = await request.post('/api/admin/census', {
    data: { wallet: '0x0000000000000000000000000000000000000001', rank: 'citizen' },
  });
  expect(write.status()).toBe(403);
});

test('the sheet round-trips through a real file in this engine', async ({ page }) => {
  test.slow(); // island hydration + a real download, slower under load
  await page.goto('/es/lap/character/');
  await page.waitForLoadState('networkidle');
  await page.locator('[data-metric="lap-sheet-edit"]').click();
  // Target a real field: the hidden file input comes first in DOM order.
  const name = page.locator('[data-lap-sheet] input[data-metric="lap-sheet-field"]').first();
  await name.fill('Rima');
  const download = page.waitForEvent('download');
  await page.locator('[data-metric="lap-sheet-export"]').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('numinia-character-sheet.md');

  // PDF export is the print dialog (File Over App: the browser hands the
  // citizen the file) — stub print and prove the button reaches it.
  await page.evaluate(() => {
    (window as { __printed?: number }).__printed = 0;
    window.print = () => {
      (window as { __printed?: number }).__printed =
        ((window as { __printed?: number }).__printed ?? 0) + 1;
    };
  });
  await page.locator('[data-metric="lap-sheet-export-pdf"]').click();
  expect(await page.evaluate(() => (window as { __printed?: number }).__printed)).toBe(1);

  // Leaving edit mode reveals the prestige/prisma probes.
  await page.locator('[data-metric="lap-sheet-edit"]').click();
  await expect(page.locator('[data-lap-sheet] .kpis .dato-xl').first()).toBeVisible();
});

test('v0.6.0 rules: identity enables competences and the device keeps the sheet (D11)', async ({
  page,
}) => {
  test.slow();
  await page.goto('/es/lap/character/');
  await page.waitForLoadState('networkidle');
  await page.locator('[data-metric="lap-sheet-edit"]').click();

  const competences = page.locator('[data-lap-sheet] section[aria-label="Competencias"]');
  const row = (name: string) => competences.locator('li').filter({ hasText: name });
  // Blank identity: nothing is enabled — every gear group is disabled.
  await expect(row('Tecnomancia').locator('.engranajes')).toHaveAttribute('aria-disabled', 'true');

  await page.getByLabel('Especie').selectOption('biomechanical');
  await page.getByLabel('Gremio').selectOption('alchemists');
  await page.getByLabel('Facción').selectOption('neo-atlantists');

  // Enabled by this identity; a foreign competence stays locked — its
  // radios are real disabled controls, no interaction can score them.
  await expect(row('Tecnomancia').locator('.engranajes')).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(row('Visión Neural').locator('.engranajes')).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(row('Visión Neural').locator('input[value="3"]')).toBeDisabled();
  await row('Tecnomancia').locator('input[value="3"]').check();

  // D11: the character lives on this device — a full reload keeps it.
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(
    page
      .locator('[data-lap-sheet] section[aria-label="Competencias"] li')
      .filter({ hasText: 'Tecnomancia' })
      .locator('.stat-value'),
  ).toContainText('3');
});
