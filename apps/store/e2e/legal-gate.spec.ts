/**
 * The door asks before it opens (MIS-086): /lap/session/ must not offer a
 * wallet widget until the visitor accepts the published legal corpus, and the
 * acceptance must point at the real documents.
 */

import { expect, test } from '@playwright/test';

test.describe('legal gate at the door', () => {
  test('no wallet widget until the corpus is accepted', async ({ page }) => {
    await page.goto('/es/lap/session/');
    // The island is server-rendered and hydrated after: ticking the box
    // before hydration is a click React later discards.
    await page.waitForLoadState('networkidle');
    const gate = page.locator('[data-legal-gate]');
    await expect(gate).toBeVisible();
    const checkbox = gate.getByRole('checkbox');
    await expect(checkbox).not.toBeChecked();
    // Before acceptance the widget is not merely hidden — it is not mounted.
    await expect(page.locator('[data-metric="auth-connect"]')).toHaveCount(0);
    await expect(page.locator('[data-legal-gate-pending]')).toBeVisible();

    await checkbox.check();
    await expect(page.locator('[data-metric="auth-connect"]')).toHaveCount(1);
    await expect(page.locator('[data-legal-gate-pending]')).toHaveCount(0);
  });

  test('the acceptance points at the published documents, in the reader locale', async ({
    page,
  }) => {
    await page.goto('/es/lap/session/');
    const gate = page.locator('[data-legal-gate]');
    await expect(gate.locator('[data-metric="auth-legal-terms"]')).toHaveAttribute(
      'href',
      '/es/legal/terms/',
    );
    await expect(gate.locator('[data-metric="auth-legal-privacy"]')).toHaveAttribute(
      'href',
      '/es/legal/privacy/',
    );
    // Asked in Spanish even though the login guide is still EN (D9).
    await expect(gate).toContainText('acepto');
  });
});
