/**
 * Accessibility gate — the constitution's "Semantic HTML. WCAG AA" as an
 * executable check, not an aspiration. Every page added to the store must be
 * listed here (or covered by a glob route) and pass with zero violations.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/es/', '/ja/', '/ko/', '/pt-br/', '/spike/', '/archive/', '/es/archive/'];

for (const path of PAGES) {
  test(`WCAG A/AA: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}
