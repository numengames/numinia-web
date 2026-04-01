/**
 * Pure rank inference engine for the Numinia rank system.
 *
 * All functions here are PURE — no side effects, no file reads, no async.
 * The caller provides the context; this module returns the computed rank.
 *
 * Based on the STSI framework: ranks give permissions (static, cumulative).
 *
 * Nomad reads. Citizen edits identity. Pilgrim purchases.
 * Vernacular creates. Archon moderates. Oracle governs.
 */

import {
  type Rank,
  type RankContext,
  type RankPermissions,
  RANK_LEVEL,
  DEFAULT_RANK_PERMISSIONS,
  LEGACY_ROLE_TO_RANK,
} from '@/types/rank';
import { env } from '@/lib/env';

// ---------------------------------------------------------------------------
// Rank inference
// ---------------------------------------------------------------------------

/**
 * Compute the rank for a user given their context signals.
 *
 * Priority (highest first):
 * 1. Explicit override from rank-overrides.json (oracle, archon, vernacular)
 * 2. Wallet in ADMIN_WALLET_ADDRESSES env var → archon (backward compat)
 * 3. Has purchased a digital good → pilgrim
 * 4. Has completed Session Zero → citizen
 * 5. Authenticated (wallet or GitHub) → nomad
 * 6. Default → nomad
 *
 * Note: vernacular is ONLY by manual promotion (no auto-detection).
 */
export function inferRank(context: RankContext): Rank {
  // 1. Explicit rank override takes absolute priority
  if (context.rankOverride) {
    return context.rankOverride;
  }

  // 2. Wallet in admin env var → archon (backward compatibility)
  if (context.walletAddress) {
    const normalized = context.walletAddress.toLowerCase();
    if (env.adminWalletAddresses.includes(normalized)) {
      return 'archon';
    }
  }

  // 3. Has purchased any digital good → pilgrim
  if (context.hasPurchased) {
    return 'pilgrim';
  }

  // 4. Has completed Session Zero → citizen
  if (context.hasCompletedSessionZero) {
    return 'citizen';
  }

  // 5. Authenticated → nomad (registered but no guild/faction yet)
  if (context.walletAddress || context.githubUserId) {
    return 'nomad';
  }

  // 6. Default (not authenticated)
  return 'nomad';
}

// ---------------------------------------------------------------------------
// Rank comparison
// ---------------------------------------------------------------------------

/** Returns true if `userRank` meets or exceeds `requiredRank`. */
export function meetsMinimumRank(userRank: Rank, requiredRank: Rank): boolean {
  return RANK_LEVEL[userRank] >= RANK_LEVEL[requiredRank];
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Get the permission set for a rank.
 *
 * Uses hardcoded defaults. In future, this will accept an optional
 * override matrix from `data/system/rank-permissions.json`.
 */
export function getPermissionsForRank(rank: Rank): RankPermissions {
  return DEFAULT_RANK_PERMISSIONS[rank];
}

/** Check a single permission for a rank. */
export function hasPermission(
  rank: Rank,
  permission: keyof RankPermissions,
): boolean {
  return DEFAULT_RANK_PERMISSIONS[rank][permission];
}

// ---------------------------------------------------------------------------
// Legacy mapping
// ---------------------------------------------------------------------------

/** Map a legacy `role` string to a Rank. Unknown roles → 'nomad'. */
export function mapRoleToRank(role: string | undefined): Rank {
  if (!role) return 'nomad';
  return LEGACY_ROLE_TO_RANK[role] ?? 'nomad';
}
