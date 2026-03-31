import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();

  const adminCookie = cookieStore.get('admin_session');
  if (adminCookie) {
    const session = verifySession<{ address?: string; role?: string }>(adminCookie.value);
    if (session) {
      return NextResponse.json({ authenticated: true, address: session.address, role: session.role || 'admin' });
    }
  }

  const userCookie = cookieStore.get('user_session');
  if (userCookie) {
    const session = verifySession<{ address?: string; role?: string }>(userCookie.value);
    if (session) {
      return NextResponse.json({ authenticated: true, address: session.address, role: session.role || 'user' });
    }
  }

  return NextResponse.json({ authenticated: false });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  cookieStore.delete('user_session');
  return NextResponse.json({ success: true });
}
