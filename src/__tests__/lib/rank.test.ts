/**
 * Unit tests for the pure rank inference engine (v2 rules).
 *
 * Nomad reads. Citizen edits identity. Pilgrim purchases.
 * Vernacular creates. Archon moderates. Oracle governs.
 */

import { describe, it, expect } from 'vitest';
import { inferRank, meetsMinimumRank, mapRoleToRank, hasPermission, getPermissionsForRank } from '@/lib/rank';

// ---------------------------------------------------------------------------
// inferRank
// ---------------------------------------------------------------------------

describe('inferRank', () => {
  it('returns nomad for empty context', () => {
    expect(inferRank({})).toBe('nomad');
  });

  it('returns nomad for authenticated wallet (citizen requires Session Zero)', () => {
    expect(inferRank({ walletAddress: '0xabc' })).toBe('nomad');
  });

  it('returns nomad for authenticated GitHub user', () => {
    expect(inferRank({ githubUserId: 'user-123' })).toBe('nomad');
  });

  it('returns citizen when Session Zero is completed', () => {
    expect(inferRank({ walletAddress: '0xabc', hasCompletedSessionZero: true })).toBe('citizen');
  });

  it('returns pilgrim when user has purchased a digital good', () => {
    expect(inferRank({ walletAddress: '0xabc', hasPurchased: true })).toBe('pilgrim');
  });

  it('purchase trumps Session Zero (pilgrim > citizen)', () => {
    expect(inferRank({ walletAddress: '0xabc', hasPurchased: true, hasCompletedSessionZero: true })).toBe('pilgrim');
  });

  it('stored role creator no longer auto-promotes to vernacular', () => {
    expect(inferRank({ githubUserId: 'user-123', storedRole: 'creator' })).toBe('nomad');
  });

  it('returns archon for explicit override', () => {
    expect(inferRank({ walletAddress: '0xabc', rankOverride: 'archon' })).toBe('archon');
  });

  it('returns oracle for explicit override', () => {
    expect(inferRank({ walletAddress: '0xabc', rankOverride: 'oracle' })).toBe('oracle');
  });

  it('override takes priority over everything else', () => {
    expect(inferRank({
      walletAddress: '0xabc',
      storedRole: 'creator',
      hasPurchased: true,
      hasCompletedSessionZero: true,
      rankOverride: 'oracle',
    })).toBe('oracle');
  });

  it('vernacular only via override (not automatic)', () => {
    expect(inferRank({ walletAddress: '0xabc', rankOverride: 'vernacular' })).toBe('vernacular');
  });
});

// ---------------------------------------------------------------------------
// meetsMinimumRank
// ---------------------------------------------------------------------------

describe('meetsMinimumRank', () => {
  it('nomad meets nomad', () => {
    expect(meetsMinimumRank('nomad', 'nomad')).toBe(true);
  });

  it('nomad does not meet citizen', () => {
    expect(meetsMinimumRank('nomad', 'citizen')).toBe(false);
  });

  it('oracle meets everything', () => {
    expect(meetsMinimumRank('oracle', 'nomad')).toBe(true);
    expect(meetsMinimumRank('oracle', 'oracle')).toBe(true);
  });

  it('archon does not meet oracle', () => {
    expect(meetsMinimumRank('archon', 'oracle')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapRoleToRank (legacy compatibility)
// ---------------------------------------------------------------------------

describe('mapRoleToRank', () => {
  it('maps admin to archon', () => {
    expect(mapRoleToRank('admin')).toBe('archon');
  });

  it('maps creator to nomad (vernacular requires manual promotion)', () => {
    expect(mapRoleToRank('creator')).toBe('nomad');
  });

  it('maps user to nomad', () => {
    expect(mapRoleToRank('user')).toBe('nomad');
  });

  it('maps undefined to nomad', () => {
    expect(mapRoleToRank(undefined)).toBe('nomad');
  });
});

// ---------------------------------------------------------------------------
// Permissions v2
// ---------------------------------------------------------------------------

describe('permissions v2', () => {
  it('nomad: can browse, download, favorite — cannot edit profile', () => {
    const p = getPermissionsForRank('nomad');
    expect(p.canBrowse).toBe(true);
    expect(p.canDownload).toBe(true);
    expect(p.canFavorite).toBe(true);
    expect(p.canEditProfile).toBe(false);
    expect(p.canSessionZero).toBe(false);
    expect(p.canAccessLoot).toBe(false);
  });

  it('citizen: can edit profile, access loot, Session Zero', () => {
    const p = getPermissionsForRank('citizen');
    expect(p.canEditProfile).toBe(true);
    expect(p.canSessionZero).toBe(true);
    expect(p.canAccessLoot).toBe(true);
    expect(p.canUploadAssets).toBe(false);
  });

  it('pilgrim: can access season content and burn ritual', () => {
    const p = getPermissionsForRank('pilgrim');
    expect(p.canAccessSeasonContent).toBe(true);
    expect(p.canBurnRitual).toBe(true);
    expect(p.canUploadAssets).toBe(false);
  });

  it('vernacular: CRUD own assets, access LAP', () => {
    const p = getPermissionsForRank('vernacular');
    expect(p.canUploadAssets).toBe(true);
    expect(p.canEditOwnMetadata).toBe(true);
    expect(p.canDeleteOwnAssets).toBe(true);
    expect(p.canAccessLAP).toBe(true);
    expect(p.canManageAllAssets).toBe(false);
  });

  it('archon: manage all + ban + promote vernacular — cannot promote archon', () => {
    const p = getPermissionsForRank('archon');
    expect(p.canManageAllAssets).toBe(true);
    expect(p.canBanUsers).toBe(true);
    expect(p.canPromoteVernacular).toBe(true);
    expect(p.canPromoteArchon).toBe(false);
    expect(p.canEditRankPermissions).toBe(false);
  });

  it('oracle: all permissions including promote archon and system config', () => {
    const p = getPermissionsForRank('oracle');
    expect(p.canPromoteArchon).toBe(true);
    expect(p.canPromoteVernacular).toBe(true);
    expect(p.canEditRankPermissions).toBe(true);
    expect(p.canEditSystemConfig).toBe(true);
  });
});

describe('hasPermission', () => {
  it('archon has canBanUsers', () => {
    expect(hasPermission('archon', 'canBanUsers')).toBe(true);
  });

  it('nomad does not have canEditProfile', () => {
    expect(hasPermission('nomad', 'canEditProfile')).toBe(false);
  });

  it('pilgrim has canAccessSeasonContent', () => {
    expect(hasPermission('pilgrim', 'canAccessSeasonContent')).toBe(true);
  });
});
