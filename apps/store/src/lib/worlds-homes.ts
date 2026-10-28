/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16): which organization each
 * world belongs to. Pablo: only the house (the Oracles) assigns a world to
 * an organization, and the organization that pays a world is the one that
 * administers it — one per world, no field for anyone reselling. The till
 * keeps the placements (apps/till `world_placements`); this file is the
 * store's door to them: the routes' answers, the readers of what a browser
 * sends, and the fleet's world ids a world page is checked against.
 *
 * Who asks is the session's, read from our own signed cookie
 * (lib/auth/session-wallet.ts `sessionAsker`), never from a body, a query
 * or a header: the house is an Oracle's session. The trust model is
 * lib/accounts-source.ts's.
 */

import { z } from 'zod';
import { NOT_IMPLEMENTED, type AccountDesk, type Asker } from './accounts';
import { logEvent } from './telemetry';
import { venueFace, type WorldCard } from './world-index';

/** Where one world stands: its organization, by name, and since when (the contract with the screens). */
export interface WorldHome {
  readonly worldId: string;
  readonly accountId: string;
  readonly accountName: string;
  readonly placedAt: string;
}

/** What «Sedes» lists: a world of an organization. */
export interface OrgWorld {
  readonly worldId: string;
  readonly accountId: string;
}

/** The most worlds one placement carries (the till's limit). */
const WORLD_IDS_MAX = 50;

/** The till's own words (apps/till src/lib/world-placements.ts), which decide the status of a refusal. */
export const PLACEMENT_PROBLEMS = {
  notHouse: 'only the house places a world in an organization',
  worlds: `worldIds must be 1 to ${WORLD_IDS_MAX} world ids: lowercase letters, digits and single hyphens`,
  world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
  account: 'accountId must be an organization id',
  noAccount: 'no such organization',
  notMember: 'only the organization’s members and the house see its worlds',
} as const;

/** A fleet order's id: lowercase letters and digits in groups split by single hyphens. */
const WORLD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORLD_ID_MAX = 63;
/** An account id the till wrote: a few safe characters, never long. */
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** 50 ids of 63 characters fit well inside it. */
const MAX_BODY_BYTES = 8_192;

/** A world id as the fleet writes it, or undefined. */
export function readWorldId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= WORLD_ID_MAX && WORLD_ID.test(value)
    ? value
    : undefined;
}

/** Card t_a856c570 (2026-10-18): the till's own words (src/lib/world-names.ts). */
export const NAME_PROBLEMS = {
  notHouse: 'only the house renames a world',
  world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
  name: 'name must be 1 to 80 characters, with no leading or trailing blank',
} as const;

const WORLD_NAME_MAX = 80;
// eslint-disable-next-line no-control-regex -- deliberately matches control characters to reject them
const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

/** A world's new name as the Lab sends it, or undefined when it is not that. */
export function readWorldName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed !== value || trimmed.length < 1 || trimmed.length > WORLD_NAME_MAX) {
    return undefined;
  }
  return CONTROL_CHAR.test(trimmed) ? undefined : trimmed;
}

/** The body of a rename — exactly `{ worldId, name }` — or null. */
export function readRenameBody(
  json: unknown,
): { readonly worldId: string; readonly name: string } | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const keys = Object.keys(json);
  const { worldId, name } = json as Readonly<Record<string, unknown>>;
  const id = readWorldId(worldId);
  const read = readWorldName(name);
  return keys.length === 2 && id !== undefined && read !== undefined
    ? { worldId: id, name: read }
    : null;
}

/** 1 to 50 world ids, each once, in the order sent; or undefined when it is not that. */
export function readWorldIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > WORLD_IDS_MAX) return undefined;
  const ids = value.map(readWorldId);
  return ids.every((id) => id !== undefined) ? [...new Set(ids)] : undefined;
}

/** An organization's id as the till writes it, or undefined. */
export function readAccountId(value: unknown): string | undefined {
  return typeof value === 'string' && ACCOUNT_ID.test(value) ? value : undefined;
}

/** The body of the house's placement — exactly `{ worldIds, accountId }` — or null. */
export function readPlaceBody(
  json: unknown,
): { readonly worldIds: string[]; readonly accountId: string } | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const keys = Object.keys(json);
  const { worldIds, accountId } = json as Readonly<Record<string, unknown>>;
  const ids = readWorldIds(worldIds);
  const account = readAccountId(accountId);
  return keys.length === 2 && ids !== undefined && account !== undefined
    ? { worldIds: ids, accountId: account }
    : null;
}

/** A machine as the fleet reads it: an open door lists its worlds; a closed one lists nothing. */
type FleetView =
  | {
      readonly open: true;
      readonly worlds: readonly { readonly id: string; readonly domain?: string | null }[];
    }
  | { readonly open: false };

/** Every world id of the fleet's open machines, and of the worlds run by hand. */
export function fleetWorldIds(
  views: readonly FleetView[],
  legacy: readonly { readonly id: string }[],
): ReadonlySet<string> {
  return new Set([
    ...views.flatMap((view) => (view.open ? view.worlds.map((world) => world.id) : [])),
    ...legacy.map((world) => world.id),
  ]);
}

/**
 * The host each world is served at (its `domain`): the fleet's open machines
 * first, then the worlds run by hand. A world with no domain has no host and
 * is left out; the first host seen for an id wins.
 */
export function fleetWorldHosts(
  views: readonly FleetView[],
  legacy: readonly { readonly id: string; readonly domain?: string | null }[],
): ReadonlyMap<string, string> {
  const hosts = new Map<string, string>();
  const worlds = [...views.flatMap((view) => (view.open ? view.worlds : [])), ...legacy];
  for (const world of worlds) {
    if (typeof world.domain === 'string' && world.domain !== '' && !hosts.has(world.id)) {
      hosts.set(world.id, world.domain);
    }
  }
  return hosts;
}

// ---- Answers ---------------------------------------------------------------

export type Log = (event: Readonly<Record<string, unknown>>) => void;

/** The answers name people's organizations: private to the browser that asked, never stored. */
const HEADERS = { 'cache-control': 'private, no-store' } as const;
export const answer = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: HEADERS });
export const forbidden = (): Response => answer({ error: 'forbidden' }, 403);
export const notBound = (): Response => answer({ error: 'not-bound' }, 503);

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const home = z.object({ accountId: z.string(), accountName: z.string(), placedAt: z.string() });

const SHAPES = {
  placements: z.union([
    z.object({
      ok: z.literal(true),
      homes: z.array(home.extend({ worldId: z.string() })),
    }),
    refusal,
  ]),
  place: z.union([
    z.object({ ok: z.literal(true), placed: z.number().int().nonnegative() }),
    refusal,
  ]),
  worldsOf: z.union([
    z.object({
      ok: z.literal(true),
      worlds: z.array(z.object({ worldId: z.string(), accountId: z.string() })),
    }),
    refusal,
  ]),
  homeOf: z.union([
    z.object({ ok: z.literal(true), home: home.nullable(), manage: z.boolean() }),
    refusal,
  ]),
  rename: z.union([
    z.object({ ok: z.literal(true), worldId: z.string(), name: z.string() }),
    refusal,
  ]),
  names: z.union([
    z.object({
      ok: z.literal(true),
      names: z.array(z.object({ worldId: z.string(), name: z.string(), renamedAt: z.string() })),
    }),
    refusal,
  ]),
} as const;

/** Ask the desk and read its answer: the answer, or the response to send when it is missing, failed or odd. */
export async function ask<S extends z.ZodType>(
  log: Log,
  action: string,
  call: () => Promise<unknown>,
  shape: S,
): Promise<
  | { readonly ok: true; readonly value: z.infer<S> }
  | { readonly ok: false; readonly response: Response }
> {
  let raw: unknown;
  try {
    raw = await call();
  } catch (error) {
    if (error instanceof Error && error.message.includes(NOT_IMPLEMENTED)) {
      log({ level: 'error', kind: 'worlds-homes-till', action, rule: 'not-implemented' });
      return { ok: false, response: notBound() };
    }
    log({
      level: 'error',
      kind: 'worlds-homes-till',
      action,
      rule: 'threw',
      error: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false, response: answer({ error: 'till-failed' }, 502) };
  }
  const parsed = shape.safeParse(raw);
  if (!parsed.success) {
    log({ level: 'error', kind: 'worlds-homes-till', action, rule: 'answer-shape' });
    return { ok: false, response: answer({ error: 'till-failed' }, 502) };
  }
  return { ok: true, value: parsed.data as z.infer<S> };
}

/** A till's refusal as the browser gets it: the status its words decide, the problems in the body. */
function refused(problems: readonly string[]): Response {
  const status = problems.includes(PLACEMENT_PROBLEMS.notHouse)
    ? 403
    : problems.includes(NAME_PROBLEMS.notHouse)
      ? 403
      : problems.includes(PLACEMENT_PROBLEMS.notMember)
        ? 403
        : problems.includes(PLACEMENT_PROBLEMS.noAccount)
          ? 404
          : 400;
  return answer({ error: 'refused', problems }, status);
}

export const lowercase = (asker: Asker): string => asker.wallet.toLowerCase();

/**
 * GET /api/admin/worlds/homes: where every placed world stands — `{ homes:
 * [{ worldId, accountId, accountName, placedAt }] }` — to the house alone
 * (403 for any other session or none).
 */
export async function answerHomes(
  desk: AccountDesk | null,
  asker: Asker | null,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null || !asker.house) return forbidden();
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'placements',
    () => desk.placements(lowercase(asker), true),
    SHAPES.placements,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  // Card t_a856c570 (2026-10-18): the names ride along on the same GET, so
  // the room's reload does not cost the admin-read rate limit a second
  // request every time it draws the fleet.
  const names = await namesQuietly(desk, asker, log);
  return answer({ homes: asked.value.homes, names });
}

/** Every renamed world, or an empty list when the till cannot say: never fails `answerHomes`. */
async function namesQuietly(
  desk: AccountDesk,
  asker: Asker,
  log: Log,
): Promise<readonly { worldId: string; name: string; renamedAt: string }[]> {
  if (typeof desk.worldNames !== 'function') return [];
  const asked = await ask(
    log,
    'worldNames',
    () => desk.worldNames(lowercase(asker), true),
    SHAPES.names,
  );
  return asked.ok && !('problems' in asked.value) ? asked.value.names : [];
}

/** The JSON body of a request, or the response that refuses it. */
export async function bodyOf(
  request: Request,
): Promise<{ ok: true; json: unknown } | { ok: false; response: Response }> {
  const type = (request.headers.get('content-type') ?? '').trim().toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(type)) {
    return { ok: false, response: answer({ error: 'content-type must be application/json' }, 415) };
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES)
    return { ok: false, response: answer({ error: 'body too large' }, 413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, response: answer({ error: 'body too large' }, 413) };
  }
  try {
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: answer({ error: 'body must be JSON' }, 400) };
  }
}

/**
 * POST /api/admin/worlds/place, JSON `{ worldIds: [1 to 50], accountId }`:
 * the house places those worlds in that organization — `{ placed }` — and
 * nobody else: 403 for any other session before the body is read, 404 for an
 * organization the till does not have, 400 for a body out of shape.
 */
export async function answerPlace(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null || !asker.house) return forbidden();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readPlaceBody(body.json);
  if (read === null) {
    return answer({ error: `body: { worldIds: 1 to ${WORLD_IDS_MAX} world ids, accountId }` }, 400);
  }
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'placeWorld',
    () => desk.placeWorld(lowercase(asker), true, read.worldIds, read.accountId),
    SHAPES.place,
  );
  if (!asked.ok) return asked.response;
  return 'problems' in asked.value
    ? refused(asked.value.problems)
    : answer({ placed: asked.value.placed });
}

/**
 * GET /api/mundos?org=<accountId>: the worlds placed in one organization —
 * `{ worlds: [{ worldId, accountId }] }` — to its members and the house; the
 * till decides, from the session's wallet (403 otherwise, 404 unknown).
 */
export async function answerOrgWorlds(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  log: Log = logEvent,
  index: () => Promise<readonly WorldCard[]> = () => Promise.resolve([]),
): Promise<Response> {
  if (asker === null) return forbidden();
  const org = readAccountId(url.searchParams.get('org') ?? '');
  if (org === undefined) return answer({ error: 'org: an organization id' }, 400);
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'worldsOf',
    () => desk.worldsOf(lowercase(asker), asker.house, org),
    SHAPES.worldsOf,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  // Each world with the name and picture its card has in the index (MIS-265); an index that fails names them by id.
  const cards = await index().catch((): readonly WorldCard[] => []);
  return answer({
    worlds: asked.value.worlds.map((world) => ({ ...world, ...venueFace(world.worldId, cards) })),
  });
}

/**
 * GET /api/mundos/<worldId>: one world's page data, public — `{ worldId,
 * home, manage }` — where `home` is its organization or null and `manage`
 * says the session is a member, an owner or the house, and `url` is the
 * address the world is served at (`https://<host>/`) or null when its host is
 * not known. A world the fleet does not have (`known`) is 404, whoever asks.
 */
export async function answerWorld(
  desk: AccountDesk | null,
  asker: Asker | null,
  worldId: string,
  known: ReadonlySet<string>,
  log: Log = logEvent,
  hosts: ReadonlyMap<string, string> = new Map(),
): Promise<Response> {
  const id = readWorldId(worldId);
  if (id === undefined || !known.has(id)) return answer({ error: 'not-found' }, 404);
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'homeOf',
    () => desk.homeOf(id, asker === null ? null : lowercase(asker), asker?.house ?? false),
    SHAPES.homeOf,
  );
  if (!asked.ok) return asked.response;
  return 'problems' in asked.value
    ? refused(asked.value.problems)
    : answer({
        worldId: id,
        home: asked.value.home,
        manage: asked.value.manage,
        url: hosts.has(id) ? `https://${hosts.get(id)}/` : null,
      });
}

/**
 * POST /api/admin/worlds/rename, JSON `{ worldId, name }` (card t_a856c570,
 * 2026-10-18): the house renames that existing world (or server) — `{
 * worldId, name }` — persisted so a reload still shows it. 403 for any
 * other session before the body is read; 400 for a body out of shape.
 */
export async function answerRename(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null || !asker.house) return forbidden();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readRenameBody(body.json);
  if (read === null) {
    return answer({ error: `body: { worldId: a world id, name: 1 to 80 characters }` }, 400);
  }
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'renameWorld',
    () => desk.renameWorld(lowercase(asker), true, read.worldId, read.name),
    SHAPES.rename,
  );
  if (!asked.ok) return asked.response;
  return 'problems' in asked.value
    ? refused(asked.value.problems)
    : answer({ worldId: asked.value.worldId, name: asked.value.name });
}
