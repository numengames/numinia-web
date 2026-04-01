/**
 * GET /api/admin/moderation/log — Moderation action log (archon+)
 * Returns ban/unban/rank-change events from audit logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { fetchData } from '@/lib/github-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODERATION_ACTIONS = ['ban', 'unban', 'rank-change'];

export async function GET(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  try {
    // Read current month's audit log
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const path = `data/audit/${monthKey}.json`;

    const events = await fetchData<Array<{
      action: string;
      actor: string;
      target?: string;
      metadata?: Record<string, unknown>;
      timestamp: string;
    }>>(path);

    const moderationEvents = (Array.isArray(events) ? events : [])
      .filter(e => MODERATION_ACTIONS.includes(e.action))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return NextResponse.json({ events: moderationEvents });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
