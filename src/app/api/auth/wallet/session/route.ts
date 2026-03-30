import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();

  // Check admin_session first (wallet admin)
  const adminCookie = cookieStore.get('admin_session');
  if (adminCookie) {
    try {
      const session = JSON.parse(adminCookie.value);
      return NextResponse.json({
        authenticated: true,
        address: session.address,
        role: session.role || 'admin',
      });
    } catch { /* fall through */ }
  }

  // Check user_session (wallet user)
  const userCookie = cookieStore.get('user_session');
  if (userCookie) {
    try {
      const session = JSON.parse(userCookie.value);
      return NextResponse.json({
        authenticated: true,
        address: session.address,
        role: session.role || 'user',
      });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ authenticated: false });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  cookieStore.delete('user_session');
  return NextResponse.json({ success: true });
}
