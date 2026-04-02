/**
 * GET  /api/admin/users/[id] — User detail with rank and ban status (archon+)
 * PATCH /api/admin/users/[id] — Change rank override (oracle only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { getDataSource } from '@/lib/data-source';
import { verifyCsrf } from '@/lib/session';
import { findRankOverride, saveRankOverride, removeRankOverride, isUserBanned } from '@/lib/rank-storage';
import { mapRoleToRank } from '@/lib/rank';
import { logAudit } from '@/lib/audit';
import { RANK_HIERARCHY, RANK_LEVEL, type Rank } from '@/types/rank';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  const { id } = await context.params;
  const ds = getDataSource();
  const users = await ds.users.getAll();
  const user = users.find(u => u.id === id);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const override = await findRankOverride(user.id);
  const banned = await isUserBanned(user.id);
  const rank = override?.rank ?? mapRoleToRank(user.role);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      rank,
      banned,
      override: override ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  // Archon+ can change ranks, but scoped to ranks below their own
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const { rank, reason } = body as { rank?: string; reason?: string };

  if (!rank || !RANK_HIERARCHY.includes(rank as Rank)) {
    return NextResponse.json({ error: 'Invalid rank' }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: 'Reason required' }, { status: 400 });
  }

  const targetRank = rank as Rank;

  // Scope check: can only assign ranks STRICTLY below your own
  if (RANK_LEVEL[targetRank] >= RANK_LEVEL[session.rank]) {
    return NextResponse.json(
      { error: `Cannot assign rank '${targetRank}' — must be below your rank '${session.rank}'` },
      { status: 403 },
    );
  }

  // Cannot modify oracle rank via API
  if (targetRank === 'oracle') {
    return NextResponse.json({ error: 'Oracle rank can only be set via rank-overrides.json' }, { status: 403 });
  }

  // Look up user in GitHub users first, fall back to treating id as wallet address
  const ds = getDataSource();
  const users = await ds.users.getAll();
  const user = users.find(u => u.id === id);

  // The identifier for the rank override: GitHub user ID or wallet address
  const targetIdentifier = user?.id ?? id;
  const targetIdentifierType: 'github' | 'wallet' = user ? 'github' : 'wallet';
  const targetUsername = user?.username ?? `${id.slice(0, 6)}...${id.slice(-4)}`;

  const actor = session.address ?? 'unknown';

  try {
    await saveRankOverride({
      identifier: targetIdentifier,
      identifierType: targetIdentifierType,
      rank: targetRank,
      assignedBy: actor,
      assignedAt: new Date().toISOString(),
      reason,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save rank';
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  logAudit({
    action: 'rank-change',
    actor,
    target: targetIdentifier,
    metadata: { username: targetUsername, newRank: targetRank, reason },
  });

  return NextResponse.json({ success: true, rank: targetRank });
}
