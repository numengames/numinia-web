/**
 * GET /api/admin/users — List all users with computed ranks.
 * Requires: archon+
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { getUsers } from '@/lib/github-storage';
import { verifyCsrf } from '@/lib/session';
import { findRankOverride, isUserBanned } from '@/lib/rank-storage';
import { inferRank, mapRoleToRank } from '@/lib/rank';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  try {
    const users = await getUsers();

    const enriched = await Promise.all(
      users.map(async (user) => {
        const override = await findRankOverride(user.id);
        const banned = await isUserBanned(user.id);

        const rank = override?.rank ?? mapRoleToRank(user.role);

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          rank,
          banned,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }),
    );

    return NextResponse.json({ users: enriched });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
