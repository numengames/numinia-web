/**
 * The house column is the same on the four sites: four entries, one of them
 * this site, every other one an absolute https link to a house domain.
 */
import { describe, expect, it } from 'vitest';
import { HOUSE_LINKS, THIS_SITE } from '../house-links';

describe('house-links', () => {
  it('names the four sites once each, this one included', () => {
    expect(HOUSE_LINKS.map((l) => l.id).sort()).toEqual(['archive', 'company', 'game', 'service']);
    expect(HOUSE_LINKS.some((l) => l.id === THIS_SITE)).toBe(true);
    expect(THIS_SITE).toBe('game');
  });

  it('every entry is an https link on a house domain with a label and a purpose', () => {
    for (const l of HOUSE_LINKS) {
      expect(l.href).toMatch(/^https:\/\/(numen\.games|numinia\.com|numinia\.org|nwos\.numen\.games)$/);
      expect(l.label.trim()).not.toBe('');
      expect(l.what.trim()).not.toBe('');
    }
  });
});
