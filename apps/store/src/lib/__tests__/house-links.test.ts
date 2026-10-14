/**
 * The footer's sister sites on numinia.com (the app shell, 2026-10-14):
 * three entries — Numen Games, Numinia (this site) and the Archive — every
 * other one an absolute https link to a house domain. NWOS left the list.
 */
import { describe, expect, it } from 'vitest';
import { HOUSE_LINKS, THIS_SITE } from '../house-links';

describe('house-links', () => {
  it('names the three sites once each, in reading order, this one included', () => {
    expect(HOUSE_LINKS.map((l) => l.id)).toEqual(['company', 'game', 'archive']);
    expect(HOUSE_LINKS.some((l) => l.id === THIS_SITE)).toBe(true);
    expect(THIS_SITE).toBe('game');
  });

  it('every entry is an https link on a house domain with a label and a purpose', () => {
    for (const l of HOUSE_LINKS) {
      expect(l.href).toMatch(/^https:\/\/(numen\.games|numinia\.com|numinia\.org)$/);
      expect(l.label.trim()).not.toBe('');
      expect(l.what.trim()).not.toBe('');
    }
  });

  it('no longer names NWOS', () => {
    expect(HOUSE_LINKS.map((l) => `${l.label} ${l.href}`).join(' ')).not.toMatch(/NWOS|nwos/);
  });
});
