/**
 * The Social column is the house's, not a person's: every entry must be an
 * absolute https URL on a known network, never a personal profile. An empty
 * list is valid — it means the footer draws no column.
 */

import { describe, expect, it } from 'vitest';
import { SOCIAL_LINKS } from '../social-links';

describe('social-links', () => {
  it('is a list (possibly empty) of labelled https links', () => {
    expect(Array.isArray(SOCIAL_LINKS)).toBe(true);
    for (const link of SOCIAL_LINKS) {
      expect(link.label.trim().length).toBeGreaterThan(0);
      expect(link.href).toMatch(/^https:\/\//);
    }
  });

  it('never points at a personal account', () => {
    for (const link of SOCIAL_LINKS) {
      expect(link.href).not.toMatch(/PabloFMM|Pablo_FMM|linkedin\.com\/in\//i);
    }
  });
});
