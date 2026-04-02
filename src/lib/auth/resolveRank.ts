/**
 * Server-side rank resolution.
 *
 * Orchestrates: session data + rank overrides + season progress + ban check
 * to produce the final { rank, permissions, banned } result.
 */

import { NextRequest } from 'next/server';
import type { Rank, RankPermissions } from '@/types/rank';
import { inferRank, getPermissionsForRank, mapRoleToRank } from '@/lib/rank';
import { findRankOverride, isUserBanned } from '@/lib/rank-storage';
import type { UserSession } from '@/lib/auth/getSession';

// ---------------------------------------------------------------------------
// Lazy import to avoid circular dependency with season-storage
// ---------------------------------------------------------------------------

async function checkPassHolder(address: string): Promise<boolean> {
  try {
    const { getActiveSeason, getUserSeasonStatus } = await import('@/lib/season-storage');
    const season = await getActiveSeason();
    if (!season) return false;
    const status = await getUserSeasonStatus(season.id, address);
    return status.hasPass;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedRank {
  rank: Rank;
  permissions: RankPermissions;
  banned: boolean;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the full rank for a session.
 * Reads rank overrides, checks season pass status, infers rank, checks bans.
 */
export async function resolveUserRank(
  session: UserSession,
): Promise<ResolvedRank> {
  const identifier = session.address;

  // No identifier → nomad
  if (!identifier) {
    return {
      rank: 'nomad',
      permissions: getPermissionsForRank('nomad'),
      banned: false,
    };
  }

  // Check for explicit rank override
  const override = await findRankOverride(identifier);

  // Check if user has purchased any digital good (season pass, etc.)
  const address = 'address' in session ? session.address : undefined;
  const hasPurchased = address ? await checkPassHolder(address) : false;

  // Infer rank
  const rank = inferRank({
    walletAddress: address,
    storedRole: session.role,
    hasPurchased,
    hasCompletedSessionZero: false, // TODO: check when Session Zero is implemented
    rankOverride: override?.rank,
  });

  // Check ban status
  const banned = await isUserBanned(identifier);

  return {
    rank,
    permissions: getPermissionsForRank(rank),
    banned,
  };
}

// ---------------------------------------------------------------------------
// Ban check utility for API routes
// ---------------------------------------------------------------------------

/**
 * Check if the current request user is banned.
 * Returns a 403 Response if banned, null if OK.
 *
 * Usage at the top of any API route:
 *   const banResponse = await checkBanAndReject(req);
 *   if (banResponse) return banResponse;
 */
export async function checkBanAndReject(
  req: NextRequest,
): Promise<Response | null> {
  // Try to extract identifier from cookies
  const { getUserSession } = await import('@/lib/auth/getSession');
  const session = getUserSession(req);

  if (!session.authenticated) return null; // anonymous users can't be banned

  const identifier = session.address;
  if (!identifier) return null;

  const banned = await isUserBanned(identifier);
  if (banned) {
    return Response.json(
      { error: 'Account suspended', code: 'BANNED' },
      { status: 403 },
    );
  }

  return null;
}
