import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '../src/types/permission.js';
import { RANKS } from '../src/types/rank.js';
import {
  hasPermission,
  meetsMinimumRank,
  rankLevel,
  resolvePermissions,
} from '../src/constants/permissions.js';

describe('resolvePermissions (cumulative ladder)', () => {
  it('nomad can browse, download and favorite — nothing else', () => {
    const p = resolvePermissions('nomad');
    expect([...p].sort()).toEqual(['browse', 'download', 'favorite']);
  });

  it('every rank keeps all permissions of the ranks below it', () => {
    for (let i = 1; i < RANKS.length; i++) {
      const lowerRank = RANKS[i - 1];
      const rank = RANKS[i];
      if (lowerRank === undefined || rank === undefined) throw new Error('unreachable');
      const lower = resolvePermissions(lowerRank);
      const current = resolvePermissions(rank);
      for (const permission of lower) {
        expect(current.has(permission), `${rank} lost "${permission}" from ${lowerRank}`).toBe(
          true,
        );
      }
      expect(current.size).toBeGreaterThan(lower.size);
    }
  });

  it('oracle holds all 22 permissions', () => {
    expect(resolvePermissions('oracle').size).toBe(PERMISSIONS.length);
    expect(PERMISSIONS).toHaveLength(22);
  });

  it('grants land at the right rank', () => {
    expect(hasPermission('citizen', 'session-zero')).toBe(true);
    expect(hasPermission('nomad', 'session-zero')).toBe(false);
    expect(hasPermission('pilgrim', 'burn-ritual')).toBe(true);
    expect(hasPermission('citizen', 'burn-ritual')).toBe(false);
    expect(hasPermission('vernacular', 'upload-assets')).toBe(true);
    expect(hasPermission('pilgrim', 'upload-assets')).toBe(false);
    expect(hasPermission('archon', 'ban-users')).toBe(true);
    expect(hasPermission('vernacular', 'ban-users')).toBe(false);
    expect(hasPermission('oracle', 'promote-archon')).toBe(true);
    expect(hasPermission('archon', 'promote-archon')).toBe(false);
  });

  it('archon can promote vernacular but never archon (legacy v2 rule)', () => {
    expect(hasPermission('archon', 'promote-vernacular')).toBe(true);
    expect(hasPermission('archon', 'edit-rank-permissions')).toBe(false);
  });
});

describe('rank ordering', () => {
  it('rankLevel follows the ladder 0..5', () => {
    expect(RANKS.map(rankLevel)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('meetsMinimumRank is reflexive, monotonic, and strict downward', () => {
    expect(meetsMinimumRank('nomad', 'nomad')).toBe(true);
    expect(meetsMinimumRank('oracle', 'nomad')).toBe(true);
    expect(meetsMinimumRank('nomad', 'citizen')).toBe(false);
    expect(meetsMinimumRank('archon', 'oracle')).toBe(false);
    expect(meetsMinimumRank('pilgrim', 'citizen')).toBe(true);
  });
});
