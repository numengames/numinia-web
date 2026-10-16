/**
 * «Mundos ↔ organizaciones» in the browser (cut 4, 2026-10-16): what the
 * Worlds room's placement dialog, the panel's «Sedes» and a world's own page
 * share. Every world belongs to exactly one organization, placed by the house
 * alone; the organization that pays a world is the one that administers it.
 *
 * Pure and zod-free (islands import it: zod in an island breaks the bundle
 * budget). The server side (lib/worlds-homes.ts) checks everything with zod;
 * these readers only keep a wrong body from breaking a screen. The islands
 * never call the API by hand: each address and each request lives here.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { Counted } from '../i18n/mundos';
import type { OrgWorld, WorldHome } from './worlds-homes-types';

/** The house's placements: who each world belongs to (an Oracle's session). */
export const HOMES_API = '/api/admin/worlds/homes';
/** Where the house places worlds. */
export const PLACE_API = '/api/admin/worlds/place';
/** The most worlds one placement request carries (the API's own limit). */
export const PLACE_MAX = 50;

/** What a world's id looks like in an address (the fleet's ids: `agora-plaza`, `pablofm-2`). */
export const WORLD_ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };

/** The organization's worlds' address: members of it, and the house. */
export function orgWorldsUrl(org: string): string {
  return `/api/mundos?org=${encodeURIComponent(org)}`;
}

/** A world's own address in the API: public, the session only adds what it may manage. */
export function worldApiUrl(worldId: string): string {
  return `/api/mundos/${encodeURIComponent(worldId)}`;
}

/** A world's page under the visitor's locale, English at the root (app-nav's localeHref). */
export function worldHref(locale: SupportedLocale, worldId: string): string {
  const path = `/mundos/${encodeURIComponent(worldId)}/`;
  return locale === 'en' ? path : `/${locale}${path}`;
}

/** The singular or the plural form of a count, in the language's own two. */
export function counted(forms: Counted, n: number): string {
  return n === 1 ? forms.one : forms.other;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

function readHome(value: unknown): WorldHome | null {
  if (!isRecord(value)) return null;
  const { worldId, accountId, accountName, placedAt } = value;
  if (!isText(worldId) || !isText(accountId) || !isText(accountName) || !isText(placedAt)) {
    return null;
  }
  return { worldId, accountId, accountName, placedAt };
}

/** The house's placements as the API answers them; null when the body is not that. */
export function readHomes(json: unknown): readonly WorldHome[] | null {
  if (!isRecord(json) || !Array.isArray(json.homes)) return null;
  const homes = json.homes.map(readHome);
  return homes.every((home): home is WorldHome => home !== null) ? homes : null;
}

/** An organization's worlds as the API answers them; null when the body is not that. */
export function readOrgWorlds(json: unknown): readonly OrgWorld[] | null {
  if (!isRecord(json) || !Array.isArray(json.worlds)) return null;
  const worlds: OrgWorld[] = [];
  for (const entry of json.worlds) {
    if (!isRecord(entry) || !isText(entry.worldId) || !isText(entry.accountId)) return null;
    worlds.push({ worldId: entry.worldId, accountId: entry.accountId });
  }
  return worlds;
}

/** What a world's page draws: whose it is, and whether the visitor manages it. */
export interface WorldPage {
  readonly worldId: string;
  readonly home: { readonly accountId: string; readonly accountName: string } | null;
  readonly manage: boolean;
}

export function readWorldPage(json: unknown): WorldPage | null {
  if (!isRecord(json) || !isText(json.worldId) || typeof json.manage !== 'boolean') return null;
  if (json.home === null) return { worldId: json.worldId, home: null, manage: json.manage };
  if (!isRecord(json.home) || !isText(json.home.accountId) || !isText(json.home.accountName)) {
    return null;
  }
  return {
    worldId: json.worldId,
    home: { accountId: json.home.accountId, accountName: json.home.accountName },
    manage: json.manage,
  };
}

/** The placements by world: a world is placed once, so the map has one home per id. */
export function homesByWorld(homes: readonly WorldHome[]): ReadonlyMap<string, WorldHome> {
  return new Map(homes.map((home) => [home.worldId, home]));
}

/** One read of a list, as a screen draws it. */
export type Sheet<T> =
  | { readonly at: 'ready'; readonly items: readonly T[] }
  | { readonly at: 'forbidden' }
  | { readonly at: 'failed' };

async function loadSheet<T>(
  fetcher: Fetch,
  url: string,
  read: (json: unknown) => readonly T[] | null,
): Promise<Sheet<T>> {
  try {
    const response = await fetcher(url, { headers: { accept: 'application/json' } });
    if (response.status === 401 || response.status === 403) return { at: 'forbidden' };
    const items = response.ok ? read(await response.json().catch(() => null)) : null;
    return items === null ? { at: 'failed' } : { at: 'ready', items };
  } catch {
    return { at: 'failed' };
  }
}

/** The house's placements; never throws. */
export function loadHomes(fetcher: Fetch): Promise<Sheet<WorldHome>> {
  return loadSheet(fetcher, HOMES_API, readHomes);
}

/** The worlds an organization has; never throws. */
export function loadOrgWorlds(fetcher: Fetch, org: string): Promise<Sheet<OrgWorld>> {
  return loadSheet(fetcher, orgWorldsUrl(org), readOrgWorlds);
}

/** A world's page: its answer, or why there is none. Never throws. */
export type PageSheet =
  | { readonly at: 'ready'; readonly page: WorldPage }
  | { readonly at: 'missing' }
  | { readonly at: 'failed' };

export async function loadWorldPage(fetcher: Fetch, worldId: string): Promise<PageSheet> {
  try {
    const response = await fetcher(worldApiUrl(worldId), {
      headers: { accept: 'application/json' },
    });
    if (response.status === 404) return { at: 'missing' };
    const page = response.ok ? readWorldPage(await response.json().catch(() => null)) : null;
    return page === null ? { at: 'failed' } : { at: 'ready', page };
  } catch {
    return { at: 'failed' };
  }
}

/** What placing worlds came to. */
export type Placement =
  | { readonly ok: true; readonly placed: number }
  | { readonly ok: false; readonly why: 'forbidden' | 'unknown-org' | 'failed' };

/**
 * Places worlds in one organization, in as many requests as the API's limit
 * needs. The first refusal stops it; what was placed before it stays placed
 * (the list is read again after, so the room says how things stand).
 */
export async function placeWorlds(
  fetcher: Fetch,
  worldIds: readonly string[],
  accountId: string,
): Promise<Placement> {
  let placed = 0;
  try {
    for (let from = 0; from < worldIds.length; from += PLACE_MAX) {
      const response = await fetcher(PLACE_API, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ worldIds: worldIds.slice(from, from + PLACE_MAX), accountId }),
      });
      if (response.status === 403) return { ok: false, why: 'forbidden' };
      if (response.status === 404) return { ok: false, why: 'unknown-org' };
      const json: unknown = response.ok ? await response.json().catch(() => null) : null;
      if (!isRecord(json) || typeof json.placed !== 'number') return { ok: false, why: 'failed' };
      placed += json.placed;
    }
  } catch {
    return { ok: false, why: 'failed' };
  }
  return { ok: true, placed };
}
