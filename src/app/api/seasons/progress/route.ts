import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { verifyCsrf } from '@/lib/session';
import { updateAdventureProgress, getUserSeasonStatus } from '@/lib/season-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/seasons/progress');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });
  }

  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }

  try {
    const { seasonId, address, adventureId } = await req.json();

    if (!seasonId || !address || !adventureId) {
      return NextResponse.json(
        { error: 'seasonId, address, and adventureId are required' },
        { status: 400 },
      );
    }

    const success = await updateAdventureProgress(seasonId, address, adventureId);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update progress. User may not have a pass.' },
        { status: 404 },
      );
    }

    const updated = await getUserSeasonStatus(seasonId, address);
    return NextResponse.json({ success: true, progress: updated });
  } catch (error) {
    log.error({ err: error }, 'Failed to update season progress');
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 },
    );
  }
}
