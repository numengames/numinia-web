import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { updateAdventureProgress, getUserSeasonStatus } from '@/lib/season-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    console.error('Failed to update season progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 },
    );
  }
}
