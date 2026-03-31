import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const sessionData = verifySession<{ userId?: string; username?: string; email?: string; role?: string }>(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        userId: sessionData.userId,
        username: sessionData.username,
        email: sessionData.email,
        role: sessionData.role,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
