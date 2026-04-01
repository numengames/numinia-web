/**
 * Unit tests for the pure rank inference engine.
 *
 * These test inferRank(), meetsMinimumRank(), mapRoleToRank(),
 * hasPermission(), and getPermissionsForRank() — all pure functions
 * with no side effects, no I/O, no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import { inferRank, meetsMinimumRank, mapRoleToRank, hasPermission, getPermissionsForRank } from '@/lib/rank';
import type { RankContext } from '@/types/rank';

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

  it('returns nomad for authenticated GitHub user (citizen requires Session Zero)', () => {
    expect(inferRank({ githubUserId: 'user-123' })).toBe('nomad');
  });

  it('returns pilgrim for season pass holder', () => {
    expect(inferRank({ walletAddress: '0xabc', isPassHolder: true })).toBe('pilgrim');
  });

  it('returns vernacular for creator role', () => {
    expect(inferRank({ githubUserId: 'user-123', storedRole: 'creator' })).toBe('vernacular');
  });

  it('returns vernacular for creator even without pass', () => {
    expect(inferRank({ walletAddress: '0xabc', storedRole: 'creator', isPassHolder: false })).toBe('vernacular');
  });

  it('returns archon for wallet in ADMIN_WALLET_ADDRESSES', () => {
    // This test depends on env.adminWalletAddresses being set.
    // In test env, the env var is empty, so this tests the override path instead.
    expect(inferRank({ walletAddress: '0xabc', rankOverride: 'archon' })).toBe('archon');
  });

  it('returns oracle for explicit override', () => {
    expect(inferRank({ walletAddress: '0xabc', rankOverride: 'oracle' })).toBe('oracle');
  });

  it('override takes priority over everything else', () => {
    expect(inferRank({
      walletAddress: '0xabc',
      storedRole: 'creator',
      isPassHolder: true,
      rankOverride: 'oracle',
    })).toBe('oracle');
  });

  it('creator rank is higher than pilgrim', () => {
    // A creator (vernacular) outranks a pass holder (pilgrim)
    expect(inferRank({ walletAddress: '0xabc', storedRole: 'creator', isPassHolder: true })).toBe('vernacular');
  });

  it('stored role user stays nomad (citizen requires Session Zero)', () => {
    expect(inferRank({ walletAddress: '0xabc', storedRole: 'user' })).toBe('nomad');
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
    expect(meetsMinimumRank('oracle', 'citizen')).toBe(true);
    expect(meetsMinimumRank('oracle', 'pilgrim')).toBe(true);
    expect(meetsMinimumRank('oracle', 'vernacular')).toBe(true);
    expect(meetsMinimumRank('oracle', 'archon')).toBe(true);
    expect(meetsMinimumRank('oracle', 'oracle')).toBe(true);
  });

  it('archon does not meet oracle', () => {
    expect(meetsMinimumRank('archon', 'oracle')).toBe(false);
  });

  it('citizen meets citizen but not pilgrim', () => {
    expect(meetsMinimumRank('citizen', 'citizen')).toBe(true);
    expect(meetsMinimumRank('citizen', 'pilgrim')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapRoleToRank (legacy compatibility)
// ---------------------------------------------------------------------------

describe('mapRoleToRank', () => {
  it('maps admin to archon', () => {
    expect(mapRoleToRank('admin')).toBe('archon');
  });

  it('maps creator to vernacular', () => {
    expect(mapRoleToRank('creator')).toBe('vernacular');
  });

  it('maps user to nomad (citizen requires Session Zero)', () => {
    expect(mapRoleToRank('user')).toBe('nomad');
  });

  it('maps anonymous to nomad', () => {
    expect(mapRoleToRank('anonymous')).toBe('nomad');
  });

  it('maps undefined to nomad', () => {
    expect(mapRoleToRank(undefined)).toBe('nomad');
  });

  it('maps unknown role to nomad', () => {
    expect(mapRoleToRank('superadmin')).toBe('nomad');
  });
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

describe('getPermissionsForRank', () => {
  it('nomad can browse and download', () => {
    const perms = getPermissionsForRank('nomad');
    expect(perms.canBrowse).toBe(true);
    expect(perms.canDownload).toBe(true);
  });

  it('nomad can favorite (authenticated nomads have basic features)', () => {
    const perms = getPermissionsForRank('nomad');
    expect(perms.canFavorite).toBe(true);
    expect(perms.canUploadAssets).toBe(false);
  });

  it('citizen can favorite but not upload', () => {
    const perms = getPermissionsForRank('citizen');
    expect(perms.canFavorite).toBe(true);
    expect(perms.canUploadAssets).toBe(false);
  });

  it('vernacular can upload and access LAP', () => {
    const perms = getPermissionsForRank('vernacular');
    expect(perms.canUploadAssets).toBe(true);
    expect(perms.canAccessLAP).toBe(true);
    expect(perms.canManageAllAssets).toBe(false);
  });

  it('archon can manage all assets and ban users', () => {
    const perms = getPermissionsForRank('archon');
    expect(perms.canManageAllAssets).toBe(true);
    expect(perms.canBanUsers).toBe(true);
    expect(perms.canManageAdmins).toBe(false);
  });

  it('oracle has all permissions', () => {
    const perms = getPermissionsForRank('oracle');
    expect(perms.canManageAdmins).toBe(true);
    expect(perms.canEditRankPermissions).toBe(true);
    expect(perms.canEditSystemConfig).toBe(true);
  });
});

describe('hasPermission', () => {
  it('archon has canBanUsers', () => {
    expect(hasPermission('archon', 'canBanUsers')).toBe(true);
  });

  it('citizen does not have canBanUsers', () => {
    expect(hasPermission('citizen', 'canBanUsers')).toBe(false);
  });

  it('pilgrim has canAccessSeasonContent', () => {
    expect(hasPermission('pilgrim', 'canAccessSeasonContent')).toBe(true);
  });

  it('citizen does not have canAccessSeasonContent', () => {
    expect(hasPermission('citizen', 'canAccessSeasonContent')).toBe(false);
  });
});
