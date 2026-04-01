/**
 * POST   /api/admin/moderation/ban — Ban a user (archon+)
 * DELETE /api/admin/moderation/ban — Unban a user (archon+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { verifyCsrf } from '@/lib/session';
import { addBan, removeBan } from '@/lib/rank-storage';
import { logAudit } from '@/lib/audit';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const body = await req.json();
  const { identifier, identifierType, reason, expiresAt } = body as {
    identifier?: string;
    identifierType?: 'wallet' | 'github';
    reason?: string;
    expiresAt?: string | null;
  };

  if (!identifier || !reason) {
    return NextResponse.json({ error: 'identifier and reason are required' }, { status: 400 });
  }

  const actor = session.address ?? session.userId ?? 'unknown';
  const banId = randomUUID();

  try {
    await addBan({
    id: banId,
    identifier,
    identifierType: identifierType ?? 'wallet',
    reason,
    bannedBy: actor,
    bannedAt: new Date().toISOString(),
    expiresAt: expiresAt ?? null,
    active: true,
  });

  logAudit({
    action: 'ban',
    actor,
    target: identifier,
    metadata: { reason, expiresAt, banId },
  });

  return NextResponse.json({ success: true, banId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ban failed';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const body = await req.json();
  const { banId } = body as { banId?: string };

  if (!banId) {
    return NextResponse.json({ error: 'banId is required' }, { status: 400 });
  }

  const actor = session.address ?? session.userId ?? 'unknown';

  await removeBan(banId);

  logAudit({
    action: 'unban',
    actor,
    metadata: { banId },
  });

  return NextResponse.json({ success: true });
}
