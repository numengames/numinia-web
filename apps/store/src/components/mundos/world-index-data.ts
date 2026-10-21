/**
 * The index of worlds' reads (/mundos/ and a world's own page, v3 cut C):
 * the fleet's worlds (pages/api/mundos/_fleet.ts), whose each one is (the
 * till's public `homeOf`, asked like any visitor) and, in production, what
 * each world says of itself — how many are inside (its `/status`) and its
 * title and picture (its own page). The pure rules live in
 * lib/world-index.ts; this file only reads and keeps the answer.
 *
 * One answer is reused for 30 s per instance: the page is the same for
 * everyone, so a crowd of readers never becomes a crowd of requests to the
 * till or the worlds. Under DATA_SOURCE=fixture nothing leaves the machine:
 * the worlds are not asked, so no count and no picture — never an invented
 * one.
 */

import { communityAccountId } from '../../lib/community-teams';
import { probeWorlds, readFaces } from '../../lib/worlds-source';
import type { WorldFace } from '../../lib/worlds';
import {
  readOwner,
  worldCards,
  type CommunityAccounts,
  type FleetEntry,
  type WorldCard,
  type WorldOwner,
} from '../../lib/world-index';
import { desk, fleetEntries } from '../../pages/api/mundos/_fleet';
import { COMMUNITIES } from '../communities/register';

const TTL_MS = 30_000;
const PROBE_MS = 2_000;

type Index = { readonly ok: true; readonly cards: readonly WorldCard[] } | { readonly ok: false };

let kept: { readonly at: number; readonly index: Index } | null = null;

/** The register's communities with the till accounts that are theirs. */
async function communityAccounts(): Promise<readonly CommunityAccounts[]> {
  return Promise.all(
    COMMUNITIES.map(async (community) => ({
      id: community.id,
      name: community.name,
      founder: community.state === 'founder',
      accounts: [
        ...(community.team === undefined ? [] : [community.team]),
        await communityAccountId(community.id),
      ],
    })),
  );
}

async function read(): Promise<Index> {
  const till = desk();
  if (till === null) return { ok: false };
  let fleet: readonly FleetEntry[];
  try {
    fleet = (await fleetEntries()).filter((entry) => entry.phase !== 'deleting');
  } catch {
    return { ok: false };
  }
  const owners = new Map<string, WorldOwner | null | undefined>(
    await Promise.all(
      fleet.map(async (entry) => {
        try {
          return [entry.id, readOwner(await till.homeOf(entry.id, null, false))] as const;
        } catch {
          return [entry.id, undefined] as const;
        }
      }),
    ),
  );
  // A till that answered nobody at all is not «no worlds»: it says nothing.
  if (fleet.length > 0 && [...owners.values()].every((owner) => owner === undefined)) {
    return { ok: false };
  }
  const placed = fleet.flatMap((entry) =>
    owners.get(entry.id) && entry.domain !== null ? [{ id: entry.id, domain: entry.domain }] : [],
  );
  let inside: Record<string, number | null> = {};
  let ais: Record<string, number | null> = {};
  let faces: Record<string, WorldFace> = {};
  if (process.env.DATA_SOURCE !== 'fixture' && placed.length > 0) {
    const [probes, seen] = await Promise.all([
      probeWorlds(fetch, placed, PROBE_MS),
      readFaces(fetch, placed, PROBE_MS),
    ]);
    inside = Object.fromEntries(
      placed.map((world) => {
        const probe = probes[world.id];
        return [world.id, probe?.ok === true ? probe.users : null];
      }),
    );
    ais = Object.fromEntries(
      placed.map((world) => {
        const probe = probes[world.id];
        return [world.id, probe?.ok === true ? probe.ais : null];
      }),
    );
    faces = seen;
  }
  const known = new Map<string, WorldOwner | null>();
  for (const [id, owner] of owners) if (owner !== undefined) known.set(id, owner);
  return {
    ok: true,
    cards: worldCards({
      fleet,
      owners: known,
      communities: await communityAccounts(),
      inside,
      ais,
      faces,
    }),
  };
}

/** The index's cards, or why there are none; kept 30 s. Never throws. */
export async function loadWorldIndex(now: number = Date.now()): Promise<Index> {
  if (kept !== null && now - kept.at < TTL_MS) return kept.index;
  let index: Index;
  try {
    index = await read();
  } catch {
    index = { ok: false };
  }
  kept = { at: now, index };
  return index;
}
