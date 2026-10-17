/**
 * «Tus mundos» (cut I, 2026-10-17): the worlds of the communities you
 * belong to, as the till knows them — the organizations your wallet is in
 * (`overview`, the house's entries left out: those are not yours) and, for
 * each, the worlds the house placed in it (`worldsOf`). Read for the page
 * /mis-mundos/ and for the rail's counter (GET /api/mundos/mine), on demand,
 * never at build.
 *
 * The till decides WHAT from the wallet the store vouches for; this module
 * only asks and shapes. Any answer out of shape, any refusal, any failure
 * reads as «unavailable» (null): the screen says so plainly, never a wrong
 * list.
 */

import type { AccountDesk, Asker } from './accounts';
import { answer, notBound } from './worlds-homes';

/** One community of yours with the ids of its worlds (sorted, each once). */
export interface MyCommunityWorlds {
  readonly accountId: string;
  readonly name: string;
  readonly worldIds: readonly string[];
}

export interface MyWorlds {
  /** Your communities with worlds first, by name; the ones without any after. */
  readonly communities: readonly MyCommunityWorlds[];
  /** Every world, counted once. */
  readonly count: number;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

/**
 * The organizations the wallet belongs to, from the till's `overview`: the
 * teams, never the personal account and never one the house entered as the
 * house (`as: 'house'`). Null when the answer is not an overview.
 */
export function readMyTeams(
  overview: unknown,
): readonly { readonly id: string; readonly name: string }[] | null {
  if (!isRecord(overview) || !Array.isArray(overview['accounts'])) return null;
  const teams: { id: string; name: string }[] = [];
  for (const entry of overview['accounts'] as unknown[]) {
    if (!isRecord(entry) || entry['kind'] !== 'team' || entry['as'] === 'house') continue;
    if (!isText(entry['id'])) return null;
    teams.push({ id: entry['id'], name: isText(entry['name']) ? entry['name'] : entry['id'] });
  }
  return teams;
}

/** The till's `worldsOf`: the world ids, sorted and each once; null for a refusal or a wrong shape. */
export function readWorldIdsOf(raw: unknown): readonly string[] | null {
  if (!isRecord(raw) || raw['ok'] !== true || !Array.isArray(raw['worlds'])) return null;
  const ids = new Set<string>();
  for (const world of raw['worlds'] as unknown[]) {
    if (!isRecord(world) || !isText(world['worldId'])) return null;
    ids.add(world['worldId']);
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

/** The communities in the order the page lists them: with worlds first, then by name. */
export function orderCommunities(
  communities: readonly MyCommunityWorlds[],
): readonly MyCommunityWorlds[] {
  return [...communities].sort(
    (a, b) =>
      Number(b.worldIds.length > 0) - Number(a.worldIds.length > 0) ||
      a.name.localeCompare(b.name, 'es'),
  );
}

/** Your communities and their worlds, asked of the till; null when it could not be read. */
export async function myWorlds(desk: AccountDesk, wallet: string): Promise<MyWorlds | null> {
  const who = wallet.toLowerCase();
  let teams: ReturnType<typeof readMyTeams>;
  try {
    teams = readMyTeams(await desk.overview(who));
  } catch {
    return null;
  }
  if (teams === null) return null;
  const communities: MyCommunityWorlds[] = [];
  for (const team of teams) {
    let worldIds: readonly string[] | null;
    try {
      worldIds = readWorldIdsOf(await desk.worldsOf(who, false, team.id));
    } catch {
      return null;
    }
    if (worldIds === null) return null;
    communities.push({ accountId: team.id, name: team.name, worldIds });
  }
  const all = new Set(communities.flatMap((community) => community.worldIds));
  return { communities: orderCommunities(communities), count: all.size };
}

/**
 * GET /api/mundos/mine: `{ ok: true, count, communities }` for the session's
 * wallet. 401 without a session, 503 without a till, 502 when it could not
 * be read. Private to the browser that asked (worlds-homes' headers).
 */
export async function answerMyWorlds(
  desk: AccountDesk | null,
  asker: Asker | null,
): Promise<Response> {
  if (asker === null) return answer({ error: 'signed-out' }, 401);
  if (desk === null) return notBound();
  const mine = await myWorlds(desk, asker.wallet);
  if (mine === null) return answer({ error: 'till-failed' }, 502);
  return answer({ ok: true, count: mine.count, communities: mine.communities });
}
