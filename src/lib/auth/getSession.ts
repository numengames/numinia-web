import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/session';

// Unified session type for both GitHub OAuth and Ethereum wallet auth.
export type AdminSession = {
  isAdmin: boolean;
  userId?: string;
  username?: string;
  address?: string;
  role: string;
};

// Checks both auth methods and returns a unified session object.
// Order: wallet (admin_session) takes priority over GitHub OAuth (session).
export function getAdminSession(req: NextRequest): AdminSession {
  // Try wallet auth first (admin_session cookie)
  const walletCookie = req.cookies.get('admin_session');
  if (walletCookie) {
    const data = verifySession<{ address?: string; role?: string }>(walletCookie.value);
    if (data?.role === 'admin') {
      return { isAdmin: true, address: data.address, role: data.role };
    }
  }

  // Fall back to GitHub OAuth (session cookie)
  const sessionCookie = req.cookies.get('session');
  if (sessionCookie) {
    const data = verifySession<{ userId?: string; username?: string; role?: string }>(sessionCookie.value);
    if (data && ['admin', 'creator'].includes(data.role || '')) {
      return { isAdmin: true, userId: data.userId, username: data.username, role: data.role || 'creator' };
    }
  }

  return { isAdmin: false, role: 'anonymous' };
}

// User session type — for any authenticated user (admin or regular)
export type UserSession = {
  authenticated: boolean;
  address?: string;
  userId?: string;
  username?: string;
  role: string;
};

// Checks for any authenticated user (wallet user_session or GitHub session)
export function getUserSession(req: NextRequest): UserSession {
  const walletCookie = req.cookies.get('user_session');
  if (walletCookie) {
    const data = verifySession<{ address?: string; role?: string }>(walletCookie.value);
    if (data) {
      return { authenticated: true, address: data.address, role: data.role || 'user' };
    }
  }

  const sessionCookie = req.cookies.get('session');
  if (sessionCookie) {
    const data = verifySession<{ userId?: string; username?: string; role?: string }>(sessionCookie.value);
    if (data) {
      return { authenticated: true, userId: data.userId, username: data.username, role: data.role || 'user' };
    }
  }

  return { authenticated: false, role: 'anonymous' };
}
