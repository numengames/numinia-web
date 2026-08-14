/**
 * Permissions — 22 permissions in 6 cumulative groups (constitution §Ranks).
 *
 * The constitution names the groups and 19 of the 22; the remaining three
 * (`delete-own-assets`, `ban-users`, `promote-vernacular`) are reconstructed
 * from the legacy v2 permission matrix. Recorded in ADR-014.
 */

export const PERMISSION_GROUPS = [
  'browse',
  'identity',
  'season',
  'create',
  'admin',
  'oracle',
] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export const PERMISSIONS = [
  // browse (nomad+)
  'browse',
  'download',
  'favorite',
  // identity (citizen+)
  'edit-profile',
  'session-zero',
  'access-loot',
  // season (pilgrim+)
  'access-season-content',
  'burn-ritual',
  // create (vernacular+)
  'upload-assets',
  'edit-own-metadata',
  'delete-own-assets',
  'view-own-stats',
  'access-lap',
  // admin (archon+)
  'manage-all-assets',
  'manage-seasons',
  'manage-users',
  'view-audit-log',
  'ban-users',
  'promote-vernacular',
  // oracle
  'promote-archon',
  'edit-rank-permissions',
  'edit-system-config',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type ResolvedPermissions = ReadonlySet<Permission>;
