/**
 * GET /api/admin/users — List all known users with computed ranks.
 * Merges: GitHub OAuth users + rank overrides (Oracles/Archons) + pass holders.
 * Requires: archon+
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { getUsers } from '@/lib/github-storage';
import { getRankOverrides, isUserBanned } from '@/lib/rank-storage';
import { mapRoleToRank } from '@/lib/rank';
import type { Rank } from '@/types/rank';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UserListItem {
  id: string;
  username: string;
  source: 'github' | 'wallet';
  rank: Rank;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  try {
    const [githubUsers, overrides] = await Promise.all([
      getUsers(),
      getRankOverrides(),
    ]);

    const seen = new Set<string>();
    const allUsers: UserListItem[] = [];

    // 1. GitHub OAuth users
    for (const user of githubUsers) {
      seen.add(user.id.toLowerCase());
      const override = overrides.find(o => o.identifier.toLowerCase() === user.id.toLowerCase());
      const banned = await isUserBanned(user.id);
      allUsers.push({
        id: user.id,
        username: user.username,
        source: 'github',
        rank: override?.rank ?? mapRoleToRank(user.role),
        banned,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }

    // 2. Wallet-based rank overrides (Oracles, Archons not in GitHub users)
    for (const override of overrides) {
      if (seen.has(override.identifier.toLowerCase())) continue;
      seen.add(override.identifier.toLowerCase());
      const banned = await isUserBanned(override.identifier);
      const shortAddr = override.identifier.length > 10
        ? `${override.identifier.slice(0, 6)}...${override.identifier.slice(-4)}`
        : override.identifier;
      allUsers.push({
        id: override.identifier,
        username: shortAddr,
        source: 'wallet',
        rank: override.rank,
        banned,
        createdAt: override.assignedAt,
        updatedAt: override.assignedAt,
      });
    }

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
