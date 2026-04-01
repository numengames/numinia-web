/**
 * Rank system types for Numinia Digital Goods.
 *
 * Based on the STSI (Systems Thinking) framework and Numinia's
 * "Compendium of Attributes and Ranks" seminal document.
 *
 * Ranks give PERMISSIONS (static, cumulative).
 * Roles describe ACTIONS (dynamic, no permissions).
 * Guilds describe KNOWLEDGE (profile/qualification).
 * Factions describe FIELDS of development.
 */

// ---------------------------------------------------------------------------
// Rank hierarchy
// ---------------------------------------------------------------------------

/** The six ranks of Numinia, from least to most privileged. */
export type Rank = 'nomad' | 'citizen' | 'pilgrim' | 'vernacular' | 'archon' | 'oracle';

/** Ordered from lowest to highest. Index = numeric level. */
export const RANK_HIERARCHY: Rank[] = [
  'nomad',      // 0 — anonymous visitor
  'citizen',    // 1 — wallet connected
  'pilgrim',    // 2 — season pass holder / collaborator
  'vernacular', // 3 — trusted creator
  'archon',     // 4 — administrator
  'oracle',     // 5 — co-founder
];

/** Numeric level for each rank (for comparison). */
export const RANK_LEVEL: Record<Rank, number> = {
  nomad: 0,
  citizen: 1,
  pilgrim: 2,
  vernacular: 3,
  archon: 4,
  oracle: 5,
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** Every permission that can be gated by rank. */
export interface RankPermissions {
  // Nomad+ (read-only: browse, download, view favorites, view character sheet)
  canBrowse: boolean;
  canDownload: boolean;
  canFavorite: boolean; // save/load favorites list

  // Citizen+ (edit identity, access loot, Session Zero)
  canEditProfile: boolean;
  canSessionZero: boolean;
  canAccessLoot: boolean;

  // Pilgrim+ (purchased a digital good)
  canAccessSeasonContent: boolean;
  canBurnRitual: boolean;

  // Vernacular+ (CRUD own content)
  canUploadAssets: boolean;
  canEditOwnMetadata: boolean;
  canDeleteOwnAssets: boolean;
  canViewOwnStats: boolean;
  canAccessLAP: boolean;

  // Archon+ (moderate + manage all content + promote up to Vernacular)
  canManageAllAssets: boolean;
  canManageSeasons: boolean;
  canViewGlobalStats: boolean;
  canViewAuditLog: boolean;
  canBanUsers: boolean;
  canManageUsers: boolean;
  canPromoteVernacular: boolean;

  // Oracle only (max 4 — full admin + promote Archons)
  canPromoteArchon: boolean;
  canEditRankPermissions: boolean;
  canEditSystemConfig: boolean;
}

/**
 * Default permission matrix. Each rank includes all permissions of ranks below.
 * Oracles can override this via `data/system/rank-permissions.json`.
 */
export const DEFAULT_RANK_PERMISSIONS: Record<Rank, RankPermissions> = {
  nomad: {
    canBrowse: true,           canDownload: true,          canFavorite: true,
    canEditProfile: false,     canSessionZero: false,      canAccessLoot: false,
    canAccessSeasonContent: false, canBurnRitual: false,
    canUploadAssets: false,    canEditOwnMetadata: false,  canDeleteOwnAssets: false,
    canViewOwnStats: false,    canAccessLAP: false,
    canManageAllAssets: false,  canManageSeasons: false,   canViewGlobalStats: false,
    canViewAuditLog: false,    canBanUsers: false,         canManageUsers: false,
    canPromoteVernacular: false,
    canPromoteArchon: false,   canEditRankPermissions: false, canEditSystemConfig: false,
  },
  citizen: {
    canBrowse: true,           canDownload: true,          canFavorite: true,
    canEditProfile: true,      canSessionZero: true,       canAccessLoot: true,
    canAccessSeasonContent: false, canBurnRitual: false,
    canUploadAssets: false,    canEditOwnMetadata: false,  canDeleteOwnAssets: false,
    canViewOwnStats: false,    canAccessLAP: false,
    canManageAllAssets: false,  canManageSeasons: false,   canViewGlobalStats: false,
    canViewAuditLog: false,    canBanUsers: false,         canManageUsers: false,
    canPromoteVernacular: false,
    canPromoteArchon: false,   canEditRankPermissions: false, canEditSystemConfig: false,
  },
  pilgrim: {
    canBrowse: true,           canDownload: true,          canFavorite: true,
    canEditProfile: true,      canSessionZero: true,       canAccessLoot: true,
    canAccessSeasonContent: true, canBurnRitual: true,
    canUploadAssets: false,    canEditOwnMetadata: false,  canDeleteOwnAssets: false,
    canViewOwnStats: false,    canAccessLAP: false,
    canManageAllAssets: false,  canManageSeasons: false,   canViewGlobalStats: false,
    canViewAuditLog: false,    canBanUsers: false,         canManageUsers: false,
    canPromoteVernacular: false,
    canPromoteArchon: false,   canEditRankPermissions: false, canEditSystemConfig: false,
  },
  vernacular: {
    canBrowse: true,           canDownload: true,          canFavorite: true,
    canEditProfile: true,      canSessionZero: true,       canAccessLoot: true,
    canAccessSeasonContent: true, canBurnRitual: true,
    canUploadAssets: true,     canEditOwnMetadata: true,   canDeleteOwnAssets: true,
    canViewOwnStats: true,     canAccessLAP: true,
    canManageAllAssets: false,  canManageSeasons: false,   canViewGlobalStats: false,
    canViewAuditLog: false,    canBanUsers: false,         canManageUsers: false,
    canPromoteVernacular: false,
    canPromoteArchon: false,   canEditRankPermissions: false, canEditSystemConfig: false,
  },
  archon: {
    canBrowse: true,           canDownload: true,          canFavorite: true,
    canEditProfile: true,      canSessionZero: true,       canAccessLoot: true,
    canAccessSeasonContent: true, canBurnRitual: true,
    canUploadAssets: true,     canEditOwnMetadata: true,   canDeleteOwnAssets: true,
    canViewOwnStats: true,     canAccessLAP: true,
    canManageAllAssets: true,   canManageSeasons: true,    canViewGlobalStats: true,
    canViewAuditLog: true,     canBanUsers: true,          canManageUsers: true,
    canPromoteVernacular: true,
    canPromoteArchon: false,   canEditRankPermissions: false, canEditSystemConfig: false,
  },
  oracle: {
    canBrowse: true,           canDownload: true,          canFavorite: true,
    canEditProfile: true,      canSessionZero: true,       canAccessLoot: true,
    canAccessSeasonContent: true, canBurnRitual: true,
    canUploadAssets: true,     canEditOwnMetadata: true,   canDeleteOwnAssets: true,
    canViewOwnStats: true,     canAccessLAP: true,
    canManageAllAssets: true,   canManageSeasons: true,    canViewGlobalStats: true,
    canViewAuditLog: true,     canBanUsers: true,          canManageUsers: true,
    canPromoteVernacular: true,
    canPromoteArchon: true,    canEditRankPermissions: true, canEditSystemConfig: true,
  },
};

// ---------------------------------------------------------------------------
// Rank overrides (stored in data/system/rank-overrides.json)
// ---------------------------------------------------------------------------

export interface RankOverride {
  identifier: string;
  identifierType: 'wallet' | 'github';
  rank: Rank;
  assignedBy: string;
  assignedAt: string;
  reason: string;
}

export interface RankOverridesFile {
  overrides: RankOverride[];
}

// ---------------------------------------------------------------------------
// Bans (stored in data/moderation/bans.json)
// ---------------------------------------------------------------------------

export interface Ban {
  id: string;
  identifier: string;
  identifierType: 'wallet' | 'github';
  reason: string;
  bannedBy: string;
  bannedAt: string;
  expiresAt: string | null; // null = permanent
  active: boolean;
}

export interface BansFile {
  bans: Ban[];
}

// ---------------------------------------------------------------------------
// Context for rank inference (input to the pure inferRank function)
// ---------------------------------------------------------------------------

export interface RankContext {
  walletAddress?: string;
  githubUserId?: string;
  storedRole?: string;
  hasCompletedSessionZero?: boolean;
  hasPurchased?: boolean;
  rankOverride?: Rank;
}

// ---------------------------------------------------------------------------
// Mapping from legacy role to rank (backward compatibility)
// ---------------------------------------------------------------------------

export const LEGACY_ROLE_TO_RANK: Record<string, Rank> = {
  admin: 'archon',
  creator: 'nomad',  // vernacular now requires manual promotion
  user: 'nomad',
  anonymous: 'nomad',
};

/** Maximum number of simultaneous Oracles. */
export const MAX_ORACLES = 4;
