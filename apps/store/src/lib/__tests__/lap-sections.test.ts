/**
 * The LAP's sections: which ones may be hidden, what a person who never
 * chose finds hidden (a quiet panel), how a choice is stored and wins over
 * that default, and which sections are still being built (the crane mark in
 * the rail, the settings and the page).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HIDDEN,
  HIDEABLE_SECTIONS,
  LAP_HIDDEN_KEY,
  UNDER_CONSTRUCTION,
  hiddenSections,
  isHideable,
  isUnderConstruction,
  storedValue,
  withSection,
} from '../lap-sections';

describe('a quiet panel by default', () => {
  it('hides the Codex, the portals, the loot and the stats when the person never chose', () => {
    expect(hiddenSections(null)).toEqual(['codex', 'portals', 'loot', 'stats']);
    expect(hiddenSections(null)).toBe(DEFAULT_HIDDEN);
  });

  it('keeps the character and the seasons in sight by default', () => {
    expect(DEFAULT_HIDDEN).not.toContain('character');
    expect(DEFAULT_HIDDEN).not.toContain('seasons');
  });

  it('only hides sections the rail can hide', () => {
    for (const section of DEFAULT_HIDDEN) expect(HIDEABLE_SECTIONS).toContain(section);
  });
});

describe('a choice wins over the default', () => {
  it('reads an empty value as «show everything», never as «never chose»', () => {
    expect(hiddenSections('')).toEqual([]);
  });

  it('reads the stored list in the rail order and drops what it does not know', () => {
    expect(hiddenSections('stats,codex')).toEqual(['codex', 'stats']);
    expect(hiddenSections('codex,,updates,overview,nonsense')).toEqual(['codex']);
  });

  it('turning one section on from the default stores the other three', () => {
    const next = withSection(hiddenSections(null), 'stats', true);
    expect(next).toEqual(['codex', 'portals', 'loot']);
    expect(storedValue(next)).toBe('codex,portals,loot');
    expect(hiddenSections(storedValue(next))).toEqual(next);
  });

  it('turning every section on stores an empty choice that persists as «show all»', () => {
    let hidden = hiddenSections(null);
    for (const section of DEFAULT_HIDDEN) hidden = withSection(hidden, section, true);
    expect(storedValue(hidden)).toBe('');
    expect(hiddenSections(storedValue(hidden))).toEqual([]);
  });

  it('turning a section off adds it once, in the rail order', () => {
    const next = withSection(['stats'], 'character', false);
    expect(next).toEqual(['character', 'stats']);
    expect(withSection(next, 'character', false)).toEqual(['character', 'stats']);
    expect(withSection(next, 'seasons', true)).toEqual(['character', 'stats']);
  });

  it('knows which ids the rail can hide', () => {
    expect(isHideable('codex')).toBe(true);
    expect(isHideable('updates')).toBe(false);
    expect(isHideable(undefined)).toBe(false);
  });
});

describe('the boot script before the first paint', () => {
  // BaseLayout's inline script cannot import this module: it carries the
  // default as a literal, pinned here to the list above.
  const layout = readFileSync(
    fileURLToPath(new URL('../../layouts/BaseLayout.astro', import.meta.url)),
    'utf8',
  );

  it('reads the same key and applies the same default when nothing is stored', () => {
    expect(layout).toContain(`localStorage.getItem('${LAP_HIDDEN_KEY}')`);
    expect(layout).toContain(`if (hidden === null) hidden = '${storedValue(DEFAULT_HIDDEN)}';`);
  });
});

describe('under construction', () => {
  it('marks the loot and the portals, and nothing that works', () => {
    expect([...UNDER_CONSTRUCTION].sort()).toEqual(['loot', 'portals']);
    for (const section of ['overview', 'character', 'codex', 'seasons', 'stats', 'updates']) {
      expect(isUnderConstruction(section)).toBe(false);
    }
    expect(isUnderConstruction('loot')).toBe(true);
    expect(isUnderConstruction('portals')).toBe(true);
  });

  it('only marks sections the rail can hide, so the settings can say it too', () => {
    for (const section of UNDER_CONSTRUCTION) expect(HIDEABLE_SECTIONS).toContain(section);
  });
});
