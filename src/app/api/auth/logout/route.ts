import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/logout');

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    cookieStore.delete('admin_session');
    cookieStore.delete('user_session');
    cookieStore.delete('csrf_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Logout error');
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
  }
}
