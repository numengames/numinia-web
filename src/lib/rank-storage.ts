/**
 * Rank storage — CRUD for rank overrides and bans in the GitHub data repo.
 *
 * Follows the same pattern as season-storage.ts:
 * - Uses fetchData / updateData from github-storage.ts
 * - Optimistic locking on writes (retry 3x on 409)
 * - In-memory cache with 1min TTL
 */

import { fetchData, updateData } from '@/lib/github-storage';
import type {
  RankOverride,
  RankOverridesFile,
  Ban,
  BansFile,
} from '@/types/rank';
import { MAX_ORACLES } from '@/types/rank';

// ---------------------------------------------------------------------------
// Data paths in the data repo
// ---------------------------------------------------------------------------

const RANK_OVERRIDES_PATH = 'data/system/rank-overrides.json';
const BANS_PATH = 'data/moderation/bans.json';

// ---------------------------------------------------------------------------
// Rank overrides
// ---------------------------------------------------------------------------

/** Fetch all rank overrides. Returns empty array if file doesn't exist. */
export async function getRankOverrides(): Promise<RankOverride[]> {
  try {
    const data = await fetchData<RankOverridesFile>(RANK_OVERRIDES_PATH);
    return data?.overrides ?? [];
  } catch {
    return [];
  }
}

/** Find a rank override for a specific identifier (wallet address or userId). */
export async function findRankOverride(
  identifier: string,
): Promise<RankOverride | undefined> {
  const overrides = await getRankOverrides();
  const normalized = identifier.toLowerCase();
  return overrides.find(o => o.identifier.toLowerCase() === normalized);
}

/** Add or update a rank override. Throws if oracle limit (4) would be exceeded. */
export async function saveRankOverride(override: RankOverride): Promise<void> {
  const overrides = await getRankOverrides();
  const normalized = override.identifier.toLowerCase();
  const idx = overrides.findIndex(o => o.identifier.toLowerCase() === normalized);

  // Enforce max 4 oracles
  if (override.rank === 'oracle') {
    const currentOracles = overrides.filter(o =>
      o.rank === 'oracle' && o.identifier.toLowerCase() !== normalized,
    );
    if (currentOracles.length >= MAX_ORACLES) {
      throw new Error(`Cannot exceed ${MAX_ORACLES} Oracles`);
    }
  }

  if (idx >= 0) {
    overrides[idx] = { ...override, identifier: normalized };
  } else {
    overrides.push({ ...override, identifier: normalized });
  }

  const file: RankOverridesFile = { overrides };
  await updateData(RANK_OVERRIDES_PATH, file, `Update rank override for ${normalized}`);
}

/** Remove a rank override by identifier. */
export async function removeRankOverride(identifier: string): Promise<void> {
  const overrides = await getRankOverrides();
  const normalized = identifier.toLowerCase();
  const filtered = overrides.filter(o => o.identifier.toLowerCase() !== normalized);

  if (filtered.length === overrides.length) return; // nothing to remove

  const file: RankOverridesFile = { overrides: filtered };
  await updateData(RANK_OVERRIDES_PATH, file, `Remove rank override for ${normalized}`);
}

// ---------------------------------------------------------------------------
// Bans
// ---------------------------------------------------------------------------

/** Fetch all bans. Returns empty array if file doesn't exist. */
export async function getBans(): Promise<Ban[]> {
  try {
    const data = await fetchData<BansFile>(BANS_PATH);
    return data?.bans ?? [];
  } catch {
    return [];
  }
}

/** Check if a user is currently banned (active + not expired). Oracles are never banned. */
export async function isUserBanned(identifier: string): Promise<boolean> {
  // Oracles cannot be banned
  const override = await findRankOverride(identifier);
  if (override?.rank === 'oracle') return false;

  const bans = await getBans();
  const normalized = identifier.toLowerCase();
  const now = new Date().toISOString();

  return bans.some(ban =>
    ban.active &&
    ban.identifier.toLowerCase() === normalized &&
    (ban.expiresAt === null || ban.expiresAt > now),
  );
}

/** Add a ban entry. Throws if target is an Oracle. */
export async function addBan(ban: Ban): Promise<void> {
  // Oracles cannot be banned
  const override = await findRankOverride(ban.identifier);
  if (override?.rank === 'oracle') {
    throw new Error('Cannot ban an Oracle');
  }

  const bans = await getBans();
  bans.push({ ...ban, identifier: ban.identifier.toLowerCase() });

  const file: BansFile = { bans };
  await updateData(BANS_PATH, file, `Ban ${ban.identifier.toLowerCase()}: ${ban.reason}`);
}

/** Deactivate a ban by its ID. Does not delete — sets active to false for audit trail. */
export async function removeBan(banId: string): Promise<void> {
  const bans = await getBans();
  const ban = bans.find(b => b.id === banId);
  if (!ban || !ban.active) return;

  ban.active = false;

  const file: BansFile = { bans };
  await updateData(BANS_PATH, file, `Unban ${ban.identifier}`);
}
