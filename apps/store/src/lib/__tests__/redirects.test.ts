/**
 * Unit tests for the site's permanent redirects: every retired door leads
 * to the Bazaar of its own locale, every docs page to numinia.org, the
 * object pages keep their addresses, and nothing redirects to a redirect.
 */

import { SUPPORTED_LOCALES } from '@numinia/domain';
import { describe, expect, it } from 'vitest';
import {
  DOCS_HOME,
  REDIRECTS,
  RETIRED_CITY,
  RETIRED_DOCS,
  RETIRED_DOORS,
  RETIRED_LAP,
  redirectOf,
} from '../redirects';

const prefixes = SUPPORTED_LOCALES.map((locale) => (locale === 'en' ? '' : `/${locale}`));

describe('REDIRECTS', () => {
  it('sends every retired door, in every locale, to the Bazaar of that locale', () => {
    for (const prefix of prefixes) {
      for (const door of RETIRED_DOORS) {
        expect(REDIRECTS[`${prefix}/${door}/`]).toBe(`${prefix}/bazaar/`);
      }
    }
  });

  it('sends the city page and its chapters, in every locale, to «How it works»', () => {
    for (const prefix of prefixes) {
      expect(REDIRECTS[`${prefix}/city/`]).toBe(`${prefix}/how-it-works/`);
      expect(REDIRECTS[`${prefix}/city/the-game/`]).toBe(`${prefix}/how-it-works/`);
    }
  });

  it('sends the panel’s old «Novedades», in every locale, to the public updates', () => {
    for (const prefix of prefixes) {
      expect(REDIRECTS[`${prefix}/lap/updates/`]).toBe(`${prefix}/updates/`);
    }
    expect(redirectOf('/es/lap/updates')).toBe('/es/updates/');
  });

  it('sends every docs page, in every locale, to numinia.org', () => {
    expect(DOCS_HOME).toBe('https://numinia.org/');
    for (const prefix of prefixes) {
      expect(REDIRECTS[`${prefix}/docs/`]).toBe(DOCS_HOME);
      expect(REDIRECTS[`${prefix}/docs/developers/database/`]).toBe(DOCS_HOME);
    }
    expect(Object.keys(REDIRECTS)).toHaveLength(
      prefixes.length *
        (RETIRED_DOORS.length + RETIRED_DOCS.length + RETIRED_CITY.length + RETIRED_LAP.length),
    );
  });

  it('never chains: no destination is itself redirected', () => {
    for (const destination of Object.values(REDIRECTS)) {
      expect(redirectOf(destination)).toBeNull();
    }
  });
});

describe('redirectOf', () => {
  it('answers with or without the trailing slash', () => {
    expect(redirectOf('/es/finder/')).toBe('/es/bazaar/');
    expect(redirectOf('/es/finder')).toBe('/es/bazaar/');
    expect(redirectOf('/docs/about/glb')).toBe(DOCS_HOME);
  });

  it('leaves the object pages, the Bazaar and everything else alone', () => {
    expect(redirectOf('/archive/avatar-arla-mncdhz3l/')).toBeNull();
    expect(redirectOf('/es/bazaar/')).toBeNull();
    expect(redirectOf('/')).toBeNull();
    expect(redirectOf('/constructor')).toBeNull();
  });
});
