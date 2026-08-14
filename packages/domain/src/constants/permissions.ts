/**
 * Permission constants — the cumulative rank → permission ladder.
 * 22 permissions in 6 groups (ADR-014 documents the three reconstructed ones).
 */

import type { Permission, ResolvedPermissions } from '../types/permission.js';
import { RANKS, type Rank, type RankLevel } from '../types/rank.js';

/** Permissions newly granted AT each rank (cumulative with everything below). */
const RANK_GRANTS: Readonly<Record<Rank, readonly Permission[]>> = {
  nomad: ['browse', 'download', 'favorite'],
  citizen: ['edit-profile', 'session-zero', 'access-loot'],
  pilgrim: ['access-season-content', 'burn-ritual'],
  vernacular: [
    'upload-assets',
    'edit-own-metadata',
    'delete-own-assets',
    'view-own-stats',
    'access-lap',
  ],
  archon: [
    'manage-all-assets',
    'manage-seasons',
    'manage-users',
    'view-audit-log',
    'ban-users',
    'promote-vernacular',
  ],
  oracle: ['promote-archon', 'edit-rank-permissions', 'edit-system-config'],
};

export function rankLevel(rank: Rank): RankLevel {
  return RANKS.indexOf(rank) as RankLevel;
}

export function meetsMinimumRank(rank: Rank, minimum: Rank): boolean {
  return rankLevel(rank) >= rankLevel(minimum);
}

export function resolvePermissions(rank: Rank): ResolvedPermissions {
  const level = rankLevel(rank);
  const granted = new Set<Permission>();
  for (const candidate of RANKS) {
    if (rankLevel(candidate) <= level) {
      for (const permission of RANK_GRANTS[candidate]) {
        granted.add(permission);
      }
    }
  }
  return granted;
}

export function hasPermission(rank: Rank, permission: Permission): boolean {
  return resolvePermissions(rank).has(permission);
}
