/**
 * Unit tests for the docs view-model — slug derivation, sidebar ordering,
 * and prev/next navigation.
 */

import { describe, expect, it } from 'vitest';
import { prevNext, slugFromFile, sortNav } from '../docs';

describe('slugFromFile', () => {
  it('derives locale and slug, collapsing readme indexes', () => {
    expect(slugFromFile('/x/src/content/docs/en/about/glb.md')).toEqual({
      locale: 'en',
      slug: 'about/glb',
    });
    expect(slugFromFile('/x/src/content/docs/ja/about/readme.md')).toEqual({
      locale: 'ja',
      slug: 'about',
    });
    expect(slugFromFile('/x/src/content/docs/en/readme.md')).toEqual({ locale: 'en', slug: '' });
    expect(slugFromFile('/x/src/content/docs/en/help.md')).toEqual({ locale: 'en', slug: 'help' });
  });

  it('returns null outside the docs tree or for unknown locales', () => {
    expect(slugFromFile('/x/src/content/docs/es/help.md')).toBeNull();
    expect(slugFromFile('/x/src/pages/index.astro')).toBeNull();
    expect(slugFromFile('/x/src/content/docs/en/help.md.png')).toBeNull();
  });
});

describe('sortNav', () => {
  it('orders canonically, NOT alphabetically: unknown sections go last', () => {
    // 'a-custom' sorts alphabetically before everything but canonically last.
    const nav = sortNav([
      { slug: 'a-custom', title: 'Custom' },
      { slug: 'help', title: 'Help' },
      { slug: 'developers/website', title: 'Website' },
      { slug: 'about/license', title: 'License' },
      { slug: 'avatar-collections', title: 'Collections' },
      { slug: '', title: 'Resources' },
      { slug: 'about', title: 'About' },
      { slug: 'developers', title: 'Developers' },
    ]);
    expect(nav.map((entry) => entry.slug)).toEqual([
      '',
      'about',
      'about/license',
      'avatar-collections',
      'developers',
      'developers/website',
      'help',
      'a-custom',
    ]);
  });
});

describe('prevNext', () => {
  const nav = [
    { slug: '', title: 'A' },
    { slug: 'about', title: 'B' },
    { slug: 'help', title: 'C' },
  ];

  it('returns neighbours and nulls at the edges', () => {
    expect(prevNext(nav, '')).toEqual({ prev: null, next: nav[1] });
    expect(prevNext(nav, 'about')).toEqual({ prev: nav[0], next: nav[2] });
    expect(prevNext(nav, 'help')).toEqual({ prev: nav[1], next: null });
    expect(prevNext(nav, 'missing')).toEqual({ prev: null, next: null });
  });
});
