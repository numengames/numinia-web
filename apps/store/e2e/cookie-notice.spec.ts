/**
 * The cookie notice (LEG-003 §4): shown on a first visit, Accept all and
 * Reject all at equal weight, nothing stored before an answer, the answer
 * recorded in numinia_consent, the footer and the Codex reopen it, and the
 * click counting (Measurement) follows the answer.
 *
 * The library hides itself from automated browsers (navigator.webdriver);
 * production keeps that default, so these checks pretend not to be one.
 */

import { expect, test, type BrowserContext } from '@playwright/test';

async function asVisitor(context: BrowserContext): Promise<void> {
  await context.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }),
  );
}

test.describe('cookie notice', () => {
  test('asks on a first visit and stores nothing before the answer', async ({ page, context }) => {
    await asVisitor(context);
    await page.goto('/es/');
    const notice = page.locator('#cc-main .cm');
    await expect(notice).toBeVisible();
    expect(await context.cookies()).toEqual([]);
    // The Terms are accepted at sign-in, never here.
    await expect(notice).not.toContainText(/términos/i);
    const accept = notice.getByRole('button', { name: 'Aceptar todo' });
    const reject = notice.getByRole('button', { name: 'Rechazar todo' });
    const [a, r] = [await accept.boundingBox(), await reject.boundingBox()];
    expect(a?.width).toBe(r?.width);
    expect(a?.height).toBe(r?.height);
    expect(a!.height).toBeGreaterThanOrEqual(44);
    expect(await accept.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
      await reject.evaluate((e) => getComputedStyle(e).backgroundColor),
    );
  });

  test('Reject all records the answer and the notice stays away', async ({ page, context }) => {
    await asVisitor(context);
    await page.goto('/');
    await page.locator('#cc-main .cm').getByRole('button', { name: 'Reject all' }).click();
    const cookie = (await context.cookies()).find((c) => c.name === 'numinia_consent');
    expect(cookie).toBeDefined();
    const value = JSON.parse(decodeURIComponent(cookie!.value)) as { categories: string[] };
    expect(value.categories).toEqual(['necessary']);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#cc-main .cm')).toBeHidden();
  });

  test('the footer button reopens the preferences', async ({ page, context }) => {
    await asVisitor(context);
    await page.goto('/');
    await page.locator('#cc-main .cm').getByRole('button', { name: 'Reject all' }).click();
    await page.locator('footer [data-cookie-choice]').click();
    await expect(page.locator('#cc-main .pm')).toBeVisible();
    await expect(page.locator('#cc-main .pm')).toContainText('Measurement');
  });

  test('automated browsers never download the notice', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fetched = await page.evaluate(() =>
      performance.getEntriesByType('resource').some((r) => r.name.includes('cookie-notice-run')),
    );
    expect(fetched).toBe(false);
  });
});

/* A returning visitor from before v0.60.0 carries the retired banner's
   cookie: `numinia_consent=2026-08-18`, host-only. The library writes its
   answer with `Domain=` the site, so both cookies coexisted, the old one was
   read first, and the notice came back on every page. The library only adds
   `Domain` on a dotted hostname (never on localhost), so this check serves
   the build under one: numinia.localhost, which browsers resolve to the
   local server by themselves. */
test.describe('cookie notice — a returning visitor with the retired cookie', () => {
  test.use({ baseURL: 'http://numinia.localhost:4321' });

  test('answers once and the notice stays away on the next page', async ({ page, context }) => {
    await asVisitor(context);
    await context.addCookies([
      { name: 'numinia_consent', value: '2026-08-18', url: 'http://numinia.localhost:4321/' },
    ]);
    await page.goto('/');
    await page.locator('#cc-main .cm').getByRole('button', { name: 'Accept all' }).click();

    const next = await context.newPage();
    await next.goto('/archive/');
    await next.waitForLoadState('networkidle');
    await expect(next.locator('#cc-main .cm')).toBeHidden();
    expect(
      await next.evaluate(() =>
        performance.getEntriesByType('resource').some((r) => r.name.includes('cookie-notice-run')),
      ),
    ).toBe(false);

    // One answer left in the jar: the library's, on the site's domain.
    const jar = (await context.cookies()).filter((c) => c.name === 'numinia_consent');
    expect(jar.map((c) => c.domain)).toEqual(['.numinia.localhost']);
    const value = JSON.parse(decodeURIComponent(jar[0]!.value)) as { categories: string[] };
    expect(value.categories).toContain('analytics');
  });
});
