import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/getSession';
import { getActiveSeason, getUserSeasonStatus } from '@/lib/season-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const season = await getActiveSeason();
    if (!season) {
      return NextResponse.json({ season: null, userProgress: null });
    }

    // If the user is authenticated, include their progress
    const session = getUserSession(req);
    let userProgress = null;

    if (session.authenticated && session.address) {
      userProgress = await getUserSeasonStatus(season.id, session.address);
    }

    return NextResponse.json({ season, userProgress });
  } catch (error) {
    console.error('Failed to load season:', error);
    return NextResponse.json(
      { error: 'Failed to load season data' },
      { status: 500 },
    );
  }
}
