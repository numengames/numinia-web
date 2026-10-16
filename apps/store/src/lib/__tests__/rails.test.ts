/**
 * The rails' behaviour: the folds (kept per rail under the old sidebar's
 * key, else by width), the «/» shortcut, and where a rail menu floats.
 */

import { describe, expect, it } from 'vitest';
import {
  FOLD_KEY,
  autoRail,
  keepFold,
  keptFold,
  opensSearch,
  placeMenu,
  railState,
} from '../rails';

describe('the folds', () => {
  it('are kept under the key the cookie policy names', () => {
    expect(FOLD_KEY).toBe('numinia-sidebar');
  });

  it('read the old sidebar value as the city rail, the v3 value per rail', () => {
    expect(keptFold('collapsed', 'city')).toBe('collapsed');
    expect(keptFold('collapsed', 'you')).toBeNull();
    expect(keptFold('city=expanded;you=collapsed', 'city')).toBe('expanded');
    expect(keptFold('city=expanded;you=collapsed', 'you')).toBe('collapsed');
    expect(keptFold('you=odd', 'you')).toBeNull();
    expect(keptFold('', 'city')).toBeNull();
    expect(keptFold(null, 'you')).toBeNull();
  });

  it('write one rail and keep the other one’s choice', () => {
    expect(keepFold(null, 'you', 'expanded')).toBe('you=expanded');
    expect(keepFold('collapsed', 'you', 'expanded')).toBe('city=collapsed;you=expanded');
    expect(keepFold('city=collapsed;you=expanded', 'city', 'expanded')).toBe(
      'city=expanded;you=expanded',
    );
    expect(keepFold('city=collapsed', 'city', 'expanded')).toBe('city=expanded');
  });

  it('by width when nothing was chosen: both open, then yours folded, then both', () => {
    expect([autoRail('city', 1600), autoRail('you', 1600)]).toEqual(['expanded', 'expanded']);
    expect([autoRail('city', 1440), autoRail('you', 1440)]).toEqual(['expanded', 'expanded']);
    expect([autoRail('city', 1280), autoRail('you', 1280)]).toEqual(['expanded', 'collapsed']);
    expect([autoRail('city', 1024), autoRail('you', 1024)]).toEqual(['expanded', 'collapsed']);
    expect([autoRail('city', 900), autoRail('you', 900)]).toEqual(['collapsed', 'collapsed']);
  });

  it('a kept choice wins over the width', () => {
    expect(railState('you', 'you=expanded', 1280, 800)).toBe('expanded');
    expect(railState('city', 'collapsed', 1600, 900)).toBe('collapsed');
    expect(railState('city', 'odd', 1600, 900)).toBe('expanded');
    expect(railState('you', null, 1280, 800)).toBe('collapsed');
  });

  it('a phone on its side folds both, whatever was chosen', () => {
    expect(railState('city', 'city=expanded', 844, 390)).toBe('collapsed');
    expect(railState('you', 'you=expanded', 844, 390)).toBe('collapsed');
    // A short window that is not on its side keeps the rule.
    expect(railState('city', 'expanded', 500, 520)).toBe('expanded');
  });
});

describe('the «/» shortcut', () => {
  const key = (
    k: string,
    mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {},
  ) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...mods,
  });
  const on = (tagName: string, isContentEditable = false) => ({ tagName, isContentEditable });

  it('opens the search from the page', () => {
    expect(opensSearch(key('/'), null)).toBe(true);
    expect(opensSearch(key('/'), on('BODY'))).toBe(true);
    expect(opensSearch(key('/'), on('a'))).toBe(true);
  });

  it('never steals a slash from someone typing', () => {
    expect(opensSearch(key('/'), on('INPUT'))).toBe(false);
    expect(opensSearch(key('/'), on('textarea'))).toBe(false);
    expect(opensSearch(key('/'), on('SELECT'))).toBe(false);
    expect(opensSearch(key('/'), on('DIV', true))).toBe(false);
  });

  it('ignores other keys and modified slashes', () => {
    expect(opensSearch(key('s'), null)).toBe(false);
    expect(opensSearch(key('/', { ctrlKey: true }), null)).toBe(false);
    expect(opensSearch(key('/', { metaKey: true }), null)).toBe(false);
    expect(opensSearch(key('/', { altKey: true }), null)).toBe(false);
  });
});

describe('placeMenu', () => {
  const viewport = { width: 1600, height: 900 };
  const anchor = { top: 100, bottom: 142, left: 1360, right: 1590 };

  it('opens under its button, right edges together', () => {
    expect(placeMenu(anchor, { width: 300, height: 200 }, viewport)).toEqual({
      top: 150,
      left: 1290,
    });
  });

  it('flips above the button when there is no room below', () => {
    const low = { top: 800, bottom: 842, left: 1360, right: 1590 };
    expect(placeMenu(low, { width: 300, height: 200 }, viewport)).toEqual({ top: 592, left: 1290 });
  });

  it('never leaves the window', () => {
    const narrow = { top: 10, bottom: 50, left: 10, right: 100 };
    expect(placeMenu(narrow, { width: 300, height: 2000 }, viewport)).toEqual({ top: 8, left: 8 });
    const edge = { top: 10, bottom: 50, left: 1590, right: 1700 };
    expect(placeMenu(edge, { width: 300, height: 100 }, viewport).left).toBe(1292);
  });
});
