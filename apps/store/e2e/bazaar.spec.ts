/**
 * The Bazaar (v0.83.0) — the Finder rethought — against the built server
 * (fixture data): the filters narrow the cards, a chosen good fills the
 * preview and opens its page, the queue gathers goods and leaves as ONE
 * zip, a phone gets the preview as a sheet, axe stays clean with all of it
 * open, and every retired door answers a permanent redirect.
 */

import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readZipIndex } from '../src/lib/zip-read';

const BYTES = Buffer.from('a good from the Bazaar');

async function openBazaar(page: Page, path = '/bazaar/'): Promise<void> {
  await page.goto(path);
  // The beacon guarantees the handlers are attached (hydration race).
  await page.waitForSelector('[data-bazaar][data-hydrated]');
}

/** Every file the zip asks for answers `status` — through the media proxy or directly. */
async function serveFiles(page: Page, status: number): Promise<void> {
  await page.route('**/api/media?**', (route) =>
    route.fulfill({ status, contentType: 'application/octet-stream', body: BYTES }),
  );
  await page.route(/^https:\/\//, (route) =>
    route.request().resourceType() === 'fetch'
      ? route.fulfill({ status, contentType: 'application/octet-stream', body: BYTES })
      : route.fallback(),
  );
}

test.describe('the Bazaar', () => {
  test.beforeEach(async ({ page }) => {
    await openBazaar(page);
  });

  test('a kind, a format and the search narrow the cards; clearing brings them back', async ({
    page,
  }) => {
    const cards = page.locator('[data-metric="bazaar-card"]');
    const total = await cards.count();
    expect(total).toBeGreaterThan(1);
    await expect(page.locator('[data-bazaar-count]')).toContainText(String(total));

    const avatars = page.locator('[data-metric="bazaar-collection"][data-category="avatars"]');
    const avatarCount = Number(await avatars.locator('.n').textContent());
    await avatars.click();
    await expect(avatars).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(avatarCount);

    const chip = page.locator('[data-metric="bazaar-format"]').first();
    const format = ((await chip.textContent()) ?? '').trim();
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    for (const kind of await cards.locator('.tipo').allTextContents()) {
      expect(kind).toContain(format);
    }

    await page.locator('[data-metric="bazaar-search"]').fill('zzz-nothing-like-this');
    await expect(cards).toHaveCount(0);
    await expect(page.locator('[data-bazaar-empty]')).toBeVisible();
    await page.locator('[data-metric="bazaar-clear"]').click();
    await expect(cards).toHaveCount(total);
  });

  test('a chosen good fills the preview, which opens its page; the page leads back', async ({
    page,
  }) => {
    // No good chosen, no third pane: the cards keep its width (v0.89.0).
    await expect(page.locator('[data-bazaar-preview]')).toHaveCount(0);
    const card = page.locator('[data-metric="bazaar-card"]').first();
    const id = await card.getAttribute('data-item');
    const name = ((await card.locator('.nombre').textContent()) ?? '').trim();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-bazaar-preview] h2')).toHaveText(name);

    const open = page.locator('[data-metric="bazaar-open-card"]');
    await expect(open).toHaveAttribute('href', `/archive/${id}/`);
    await open.click();
    await page.waitForURL(`**/archive/${id}/`);
    const back = page.locator('[data-metric="archive-back"]');
    await expect(back).toHaveAttribute('href', '/bazaar/');
    await expect(back).toHaveText('Bazaar');
  });

  test('the queue gathers, never twice, and empties', async ({ page }) => {
    const count = page.locator('[data-bazaar-queue-count]');
    await expect(count).toHaveText('0');
    const cards = page.locator('[data-metric="bazaar-card"]');
    const toggle = page.locator('[data-metric="bazaar-queue-toggle"]');

    await cards.nth(0).click();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await cards.nth(1).click();
    await toggle.click();
    await expect(count).toHaveText('2');
    await expect(cards.nth(0).locator('.en-cola')).toBeVisible();

    // The same good again leaves the queue: no duplicates by construction.
    await toggle.click();
    await expect(count).toHaveText('1');
    await page.locator('[data-metric="bazaar-queue-remove"]').click();
    await expect(count).toHaveText('0');
    await expect(page.locator('[data-metric="bazaar-zip"]')).toHaveCount(0);
  });

  test('«Download all» leaves as one zip: the goods and a note naming each', async ({ page }) => {
    await serveFiles(page, 200);
    const cards = page.locator('[data-metric="bazaar-card"]');
    for (const index of [0, 1]) {
      await cards.nth(index).click();
      await page.locator('[data-metric="bazaar-queue-toggle"]').click();
    }
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-metric="bazaar-zip"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^numinia-bazaar-\d{4}-\d{2}-\d{2}\.zip$/);
    const index = await readZipIndex(new Blob([await readFile(await download.path())]));
    expect(index.ok).toBe(true);
    if (!index.ok) return;
    const names = index.entries.map((entry) => entry.name);
    expect(names).toHaveLength(3);
    expect(names.at(-1)).toBe('README.txt');
    for (const entry of index.entries.slice(0, 2)) {
      expect(entry.name).toMatch(/\.(glb|vrm|hyp|mp3|mp4|png|jpg)$/);
      expect(entry.size).toBe(BYTES.byteLength);
      expect(entry.method).toBe(0);
    }
    await expect(page.locator('[data-bazaar-zip-status]')).toHaveAttribute(
      'data-bazaar-zip-status',
      'done',
    );
  });

  test('when no file answers, it says so and leaves no empty zip', async ({ page }) => {
    await serveFiles(page, 502);
    await page.locator('[data-metric="bazaar-card"]').first().click();
    await page.locator('[data-metric="bazaar-queue-toggle"]').click();
    let downloads = 0;
    page.on('download', () => {
      downloads += 1;
    });
    await page.locator('[data-metric="bazaar-zip"]').click();
    const status = page.locator('[data-bazaar-zip-status]');
    await expect(status).toHaveAttribute('data-bazaar-zip-status', 'failed');
    await expect(status).not.toBeEmpty();
    expect(downloads).toBe(0);
  });
});

test('on a phone the preview opens as a sheet that Escape closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBazaar(page, '/es/bazaar/');
  await expect(page.locator('h1')).toHaveText('Bazar');
  const card = page.locator('[data-metric="bazaar-card"]').first();
  await card.click();
  const sheet = page.locator('dialog[data-bazaar-preview]');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h2')).not.toBeEmpty();
  await expect(sheet.locator('[data-metric="bazaar-open-card"]')).toHaveText('Abrir la ficha');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
});

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test(`WCAG A/AA with a good chosen and queued (${name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openBazaar(page, '/es/bazaar/');
    await page.locator('[data-metric="bazaar-card"]').first().click();
    await page.locator('[data-metric="bazaar-queue-toggle"]').click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Sistema §6.1 binaria: texture-as-text, aria-hidden, deliberately faint
      // (the a11y gate excludes it the same way: WCAG 1.4.3 exempts decoration).
      .exclude('.binaria')
      .analyze();
    const violations = results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

test.describe('the doors that went out', () => {
  const MOVED = [
    ['/finder/', '/bazaar/'],
    ['/assets/', '/bazaar/'],
    ['/gallery/', '/bazaar/'],
    ['/archive/', '/bazaar/'],
    ['/inspector/', '/bazaar/'],
    ['/es/finder/', '/es/bazaar/'],
    ['/ja/gallery/', '/ja/bazaar/'],
    ['/ko/assets/', '/ko/bazaar/'],
    ['/pt-br/archive/', '/pt-br/bazaar/'],
    ['/docs/', 'https://numinia.org/'],
    ['/es/docs/about/license/', 'https://numinia.org/'],
  ] as const;

  for (const [from, to] of MOVED) {
    test(`${from} answers 301 → ${to}`, async ({ request, baseURL }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      const location = new URL(response.headers()['location'] ?? '', baseURL).href;
      expect(location).toBe(new URL(to, baseURL).href);
    });
  }

  test('the object pages stay where they are', async ({ request }) => {
    const response = await request.get('/archive/ndg-019d3f89-3aca-7631-b541-054596bb1de6/', {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
  });
});
