import { NextRequest } from 'next/server';

// Unified session type for both GitHub OAuth and Ethereum wallet auth.
export type AdminSession = {
  isAdmin: boolean;
  // GitHub OAuth session fields
  userId?: string;
  username?: string;
  // Wallet session fields
  address?: string;
  // Common
  role: string;
};

// Checks both auth methods and returns a unified session object.
// Order: wallet (admin_session) takes priority over GitHub OAuth (session).
export function getAdminSession(req: NextRequest): AdminSession {
  // Try wallet auth first (admin_session cookie)
  const walletCookie = req.cookies.get('admin_session');
  if (walletCookie) {
    try {
      const data = JSON.parse(walletCookie.value);
      if (data.role === 'admin') {
        return {
          isAdmin: true,
          address: data.address,
          role: data.role,
        };
      }
    } catch {
      // invalid cookie, fall through
    }
  }

  // Fall back to GitHub OAuth (session cookie)
  const sessionCookie = req.cookies.get('session');
  if (sessionCookie) {
    try {
      const data = JSON.parse(sessionCookie.value);
      if (['admin', 'creator'].includes(data.role)) {
        return {
          isAdmin: true,
          userId: data.userId,
          username: data.username,
          role: data.role,
        };
      }
    } catch {
      // invalid cookie, fall through
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
  // Check wallet user_session
  const walletCookie = req.cookies.get('user_session');
  if (walletCookie) {
    try {
      const data = JSON.parse(walletCookie.value);
      return {
        authenticated: true,
        address: data.address,
        role: data.role || 'user',
      };
    } catch { /* invalid */ }
  }

  // Fall back to GitHub OAuth session
  const sessionCookie = req.cookies.get('session');
  if (sessionCookie) {
    try {
      const data = JSON.parse(sessionCookie.value);
      return {
        authenticated: true,
        userId: data.userId,
        username: data.username,
        role: data.role || 'user',
      };
    } catch { /* invalid */ }
  }

  return { authenticated: false, role: 'anonymous' };
}
