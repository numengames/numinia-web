import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    cookieStore.delete('admin_session');
    cookieStore.delete('user_session');
    cookieStore.delete('csrf_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
  }
}
