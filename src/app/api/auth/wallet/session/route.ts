import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { mapRoleToRank } from '@/lib/rank';
import type { Rank } from '@/types/rank';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();

  const adminCookie = cookieStore.get('admin_session');
  if (adminCookie) {
    const session = verifySession<{ address?: string; role?: string; rank?: Rank }>(adminCookie.value);
    if (session) {
      return NextResponse.json({
        authenticated: true,
        address: session.address,
        role: session.role || 'admin',
        rank: session.rank ?? mapRoleToRank(session.role || 'admin'),
      });
    }
  }

  const userCookie = cookieStore.get('user_session');
  if (userCookie) {
    const session = verifySession<{ address?: string; role?: string; rank?: Rank }>(userCookie.value);
    if (session) {
      return NextResponse.json({
        authenticated: true,
        address: session.address,
        role: session.role || 'user',
        rank: session.rank ?? mapRoleToRank(session.role || 'user'),
      });
    }
  }

  // Fall back to GitHub OAuth session (mirrors getAdminSession logic)
  const githubCookie = cookieStore.get('session');
  if (githubCookie) {
    const session = verifySession<{ userId?: string; username?: string; role?: string; rank?: Rank }>(githubCookie.value);
    if (session && ['admin', 'creator'].includes(session.role || '')) {
      return NextResponse.json({
        authenticated: true,
        userId: session.userId,
        username: session.username,
        role: session.role,
        rank: session.rank ?? mapRoleToRank(session.role || 'creator'),
      });
    }
  }

  return NextResponse.json({ authenticated: false, rank: 'nomad' });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('admin_session');
  cookieStore.delete('user_session');
  cookieStore.delete('csrf_token');
  return NextResponse.json({ success: true });
}
