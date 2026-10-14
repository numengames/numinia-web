/**
 * The site's permanent redirects — one map, three readers.
 *
 * The doors that went out (v0.83.0, the Oracle's verdict on /assets/): the
 * digital goods had five doors — the Assets page, the Gallery, the
 * Archive's index, the Finder and the Inspector — plus the docs
 * («Resources»). One way to navigate them is left: the Bazaar. Every old
 * address keeps working. Each door answers a permanent redirect to the
 * Bazaar of its own locale; the docs, written for the platform before this
 * one, lead to numinia.org, where the house keeps its documents. The
 * object pages /archive/<id>/ stay where they are.
 *
 * Readers: astro.config.mjs (`redirects` — a 301 from the Node server and a
 * `_redirects` line on Cloudflare, because both adapters turn off Astro's
 * meta-refresh pages), scripts/link-check.mjs (an internal link to a
 * redirect is not a broken link) and the tests. Plain data, no I/O: Node
 * reads this file directly (type stripping) from the link checker.
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@numinia/domain';

/** The doors that lead to the Bazaar now (the Archive keeps its object pages). */
export const RETIRED_DOORS = ['finder', 'assets', 'gallery', 'archive', 'inspector'] as const;

/** Every page the docs section rendered, by slug ('' is its index). */
export const RETIRED_DOCS = [
  '',
  'about',
  'about/ardrive',
  'about/glb',
  'about/license',
  'about/philosophy',
  'avatar-collections',
  'developers',
  'developers/database',
  'developers/website',
  'help',
] as const;

/** Where the house keeps its documents now. */
export const DOCS_HOME = 'https://numinia.org/';

/**
 * The city page and its three chapter stubs retired into «How it works»
 * (the same v0.83.0 cut): what the city page told lives there now.
 */
export const RETIRED_CITY = ['', 'inhabitants', 'districts', 'the-game'] as const;

/**
 * LAP rooms that went back out of the panel (the Oracle, 2026-10-15): the
 * updates have one door, the version, which opens the public /updates/.
 * Each slug leads to the page of the same name at the site's root.
 */
export const RETIRED_LAP = ['updates'] as const;

const prefixOf = (locale: string): string => (locale === DEFAULT_LOCALE ? '' : `/${locale}`);

function buildRedirects(): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const prefix = prefixOf(locale);
    for (const door of RETIRED_DOORS) map[`${prefix}/${door}/`] = `${prefix}/bazaar/`;
    for (const slug of RETIRED_DOCS) {
      map[`${prefix}/docs/${slug === '' ? '' : `${slug}/`}`] = DOCS_HOME;
    }
    for (const chapter of RETIRED_CITY) {
      map[`${prefix}/city/${chapter === '' ? '' : `${chapter}/`}`] = `${prefix}/how-it-works/`;
    }
    for (const room of RETIRED_LAP) map[`${prefix}/lap/${room}/`] = `${prefix}/${room}/`;
  }
  return map;
}

/** Source path (with its trailing slash) → destination, every locale. */
export const REDIRECTS: Readonly<Record<string, string>> = buildRedirects();

/** Where a redirected address leads, with or without its trailing slash; null when it is no redirect. */
export function redirectOf(path: string): string | null {
  // Every key ends in '/', so no lookup can land on an Object.prototype name.
  const withSlash = path.endsWith('/') ? path : `${path}/`;
  return REDIRECTS[withSlash] ?? null;
}
