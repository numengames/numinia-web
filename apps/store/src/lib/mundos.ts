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
import type { OrgWorld, WorldHome } from './worlds-homes';

/** The house's placements: who each world belongs to (an Oracle's session). */
export const HOMES_API = '/api/admin/worlds/homes';
/** Where the house places worlds. */
export const PLACE_API = '/api/admin/worlds/place';
/** The most worlds one placement request carries (the API's own limit). */
export const PLACE_MAX = 50;
/** Where the house renames one existing world (or server). */
export const RENAME_API = '/api/admin/worlds/rename';

/** What a world's id looks like in an address (the fleet's ids: `agora-plaza`, `pablofm-2`): lib/worlds-homes.ts's own rule. */
export const WORLD_ID_SHAPE = /^(?=.{1,63}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The status a world's page answers: 404 for an id that is not shaped like a
 * fleet's and for one the fleet does not have; 200 otherwise. A fleet that
 * cannot be read proves nothing either way, so the page is served and its
 * island says what it can (the world's data route is the same 404 for an
 * unknown id).
 */
export async function worldPageStatus(
  id: string,
  fleetIds: () => Promise<ReadonlySet<string>>,
): Promise<200 | 404> {
  if (!WORLD_ID_SHAPE.test(id)) return 404;
  try {
    return (await fleetIds()).has(id) ? 200 : 404;
  } catch {
    return 200;
  }
}

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

/** One world's own name, and since when (card t_a856c570, 2026-10-18). */
export interface WorldName {
  readonly worldId: string;
  readonly name: string;
  readonly renamedAt: string;
}

function readName(value: unknown): WorldName | null {
  if (!isRecord(value)) return null;
  const { worldId, name, renamedAt } = value;
  if (!isText(worldId) || !isText(name) || !isText(renamedAt)) return null;
  return { worldId, name, renamedAt };
}

/** Every world the house has renamed, as the API answers them; null when the body is not that. */
export function readNames(json: unknown): readonly WorldName[] | null {
  if (!isRecord(json) || !Array.isArray(json.names)) return null;
  const names = json.names.map(readName);
  return names.every((entry): entry is WorldName => entry !== null) ? names : null;
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

/** What a world's page draws: whose it is, whether the visitor manages it, and where it is served. */
export interface WorldPage {
  readonly worldId: string;
  readonly home: { readonly accountId: string; readonly accountName: string } | null;
  readonly manage: boolean;
  /** The world's own address, the guest link «Entrar» falls back to; null when unknown. */
  readonly url: string | null;
}

/** An address a browser may be sent to: https and nothing else. */
const isHttps = (value: unknown): value is string =>
  typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value);

export function readWorldPage(json: unknown): WorldPage | null {
  if (!isRecord(json) || !isText(json.worldId) || typeof json.manage !== 'boolean') return null;
  const url = isHttps(json.url) ? json.url : null;
  if (json.home === null) return { worldId: json.worldId, home: null, manage: json.manage, url };
  if (!isRecord(json.home) || !isText(json.home.accountId) || !isText(json.home.accountName)) {
    return null;
  }
  return {
    worldId: json.worldId,
    home: { accountId: json.home.accountId, accountName: json.home.accountName },
    manage: json.manage,
    url,
  };
}

/** A world's pass endpoint: POST, the session says who enters. */
export function passApiUrl(worldId: string): string {
  return `/api/mundos/${encodeURIComponent(worldId)}/pass`;
}

/**
 * «Entrar»: where to send the browser for this world — the address with the
 * pass after `#` for a person of its organization, the plain address for a
 * guest. Falls back to `fallback` (the guest address the page already has,
 * or null) when the endpoint is unavailable, says 503 or answers oddly;
 * null when there is no address at all. Never throws.
 */
export async function enterWorld(
  fetcher: Fetch,
  worldId: string,
  fallback: string | null,
): Promise<string | null> {
  try {
    const response = await fetcher(passApiUrl(worldId), {
      method: 'POST',
      headers: JSON_HEADERS,
      body: '{}',
    });
    const json: unknown = await response.json().catch(() => null);
    if (isRecord(json) && isHttps(json.url)) return json.url;
  } catch {
    // The guest link below is the answer.
  }
  return fallback;
}

/** The placements by world: a world is placed once, so the map has one home per id. */
export function homesByWorld(homes: readonly WorldHome[]): ReadonlyMap<string, WorldHome> {
  return new Map(homes.map((home) => [home.worldId, home]));
}

/** The renamed worlds, by id: a world is renamed once, so the map has one name per id. */
export function namesByWorld(names: readonly WorldName[]): ReadonlyMap<string, string> {
  return new Map(names.map((entry) => [entry.worldId, entry.name]));
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

/**
 * The house's placements, and every world it has renamed (card t_a856c570,
 * 2026-10-18) — one GET, not two, so a reload does not spend the admin-read
 * rate limit twice over.
 */
export async function loadHomes(fetcher: Fetch): Promise<{
  readonly homes: Sheet<WorldHome>;
  readonly names: Sheet<WorldName>;
}> {
  try {
    const response = await fetcher(HOMES_API, { headers: { accept: 'application/json' } });
    if (response.status === 401 || response.status === 403) {
      return { homes: { at: 'forbidden' }, names: { at: 'forbidden' } };
    }
    const json = response.ok ? await response.json().catch(() => null) : null;
    const homes = response.ok ? readHomes(json) : null;
    const names = response.ok ? readNames(json) : null;
    return {
      homes: homes === null ? { at: 'failed' } : { at: 'ready', items: homes },
      names: names === null ? { at: 'failed' } : { at: 'ready', items: names },
    };
  } catch {
    return { homes: { at: 'failed' }, names: { at: 'failed' } };
  }
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

/** What renaming a world came to (card t_a856c570, 2026-10-18). */
export type Rename =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly why: 'forbidden' | 'failed' };

/** Renames one existing world (or server); the name persists for the next load. */
export async function renameWorld(fetcher: Fetch, worldId: string, name: string): Promise<Rename> {
  try {
    const response = await fetcher(RENAME_API, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ worldId, name }),
    });
    if (response.status === 403) return { ok: false, why: 'forbidden' };
    const json: unknown = response.ok ? await response.json().catch(() => null) : null;
    if (!isRecord(json) || !isText(json.name)) return { ok: false, why: 'failed' };
    return { ok: true, name: json.name };
  } catch {
    return { ok: false, why: 'failed' };
  }
}
