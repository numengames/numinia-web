import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/getSession';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Returns the current user session (any auth method)
export async function GET(req: NextRequest) {
  const session = getUserSession(req);
  return NextResponse.json(session);
}
