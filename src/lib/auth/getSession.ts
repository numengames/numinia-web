import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/session';
import { getThirdwebAuth, TW_JWT_COOKIE } from '@/lib/thirdweb-auth';
import type { Rank, RankPermissions } from '@/types/rank';
import { mapRoleToRank, meetsMinimumRank, getPermissionsForRank } from '@/lib/rank';

// Unified session type for both GitHub OAuth and Ethereum wallet auth.
export type AdminSession = {
  isAdmin: boolean;
  userId?: string;
  username?: string;
  address?: string;
  role: string;
};

// Checks all auth methods and returns a unified session object.
// Order: Thirdweb JWT → wallet (admin_session) → GitHub OAuth (session).
export function getAdminSession(req: NextRequest): AdminSession {
  // 1. Check Thirdweb JWT — admin status resolved via ADMIN_WALLET_ADDRESSES
  const twCookie = req.cookies.get(TW_JWT_COOKIE);
  if (twCookie?.value) {
    try {
      const parts = twCookie.value.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        if (payload.sub) {
          const address = payload.sub.toLowerCase();
          const adminAddresses = (process.env.ADMIN_WALLET_ADDRESSES ?? '')
            .split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
          if (adminAddresses.includes(address)) {
            return { isAdmin: true, address: payload.sub, role: 'admin' };
          }
        }
      }
    } catch {
      // Invalid JWT — fall through
    }
  }

  // 2. Legacy wallet auth (admin_session cookie)
  const walletCookie = req.cookies.get('admin_session');
  if (walletCookie) {
    const data = verifySession<{ address?: string; role?: string }>(walletCookie.value);
    if (data?.role === 'admin') {
      return { isAdmin: true, address: data.address, role: data.role };
    }
  }

  // 3. Legacy GitHub OAuth (session cookie)
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

// Checks for any authenticated user.
// Priority: Thirdweb JWT → wallet user_session → GitHub session
export function getUserSession(req: NextRequest): UserSession {
  // 1. Check Thirdweb JWT (new auth — async verification done at rank level)
  //    For sync getUserSession, we decode the JWT payload without full verification.
  //    Full verification happens in getSessionWithRank() which is async.
  const twCookie = req.cookies.get(TW_JWT_COOKIE);
  if (twCookie?.value) {
    try {
      // JWT structure: header.payload.signature — decode payload
      const parts = twCookie.value.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        if (payload.sub) {
          return { authenticated: true, address: payload.sub, role: 'user' };
        }
      }
    } catch {
      // Invalid JWT — fall through to legacy auth
    }
  }

  // 2. Legacy wallet auth (user_session cookie)
  const walletCookie = req.cookies.get('user_session');
  if (walletCookie) {
    const data = verifySession<{ address?: string; role?: string }>(walletCookie.value);
    if (data) {
      return { authenticated: true, address: data.address, role: data.role || 'user' };
    }
  }

  // 3. Legacy GitHub OAuth (session cookie)
  const sessionCookie = req.cookies.get('session');
  if (sessionCookie) {
    const data = verifySession<{ userId?: string; username?: string; role?: string }>(sessionCookie.value);
    if (data) {
      return { authenticated: true, userId: data.userId, username: data.username, role: data.role || 'user' };
    }
  }

  return { authenticated: false, role: 'anonymous' };
}

// ---------------------------------------------------------------------------
// Rank-aware session (Phase 0+1 additions — does NOT replace above functions)
// ---------------------------------------------------------------------------

/** Session enriched with rank, permissions, and ban status. */
export type SessionWithRank = {
  authenticated: boolean;
  address?: string;
  userId?: string;
  username?: string;
  role: string;
  rank: Rank;
  permissions: RankPermissions;
  banned: boolean;
};

/**
 * Get user session enriched with computed rank and permissions.
 * Reads rank overrides + season progress + bans from the data repo.
 */
export async function getSessionWithRank(req: NextRequest): Promise<SessionWithRank> {
  const session = getUserSession(req);

  if (!session.authenticated) {
    return {
      ...session,
      rank: 'nomad',
      permissions: getPermissionsForRank('nomad'),
      banned: false,
    };
  }

  // Lazy import to avoid circular deps + keep this file synchronous for existing callers
  const { resolveUserRank } = await import('@/lib/auth/resolveRank');
  const resolved = await resolveUserRank(session);

  return {
    ...session,
    rank: resolved.rank,
    permissions: resolved.permissions,
    banned: resolved.banned,
  };
}

/**
 * Require a minimum rank for an API route. Returns SessionWithRank on success.
 *
 * Replaces the pattern:
 *   const session = getAdminSession(req);
 *   if (!session.isAdmin) return new Response(null, { status: 401 });
 *
 * With:
 *   const session = await requireRank(req, 'archon');
 *   // throws RankError if insufficient
 *
 * @throws {Response} 401 if not authenticated, 403 if rank too low or banned
 */
export async function requireRank(
  req: NextRequest,
  minimum: Rank,
): Promise<SessionWithRank> {
  const session = await getSessionWithRank(req);

  if (!session.authenticated) {
    throw Response.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 },
    );
  }

  if (session.banned) {
    throw Response.json(
      { error: 'Account suspended', code: 'BANNED' },
      { status: 403 },
    );
  }

  if (!meetsMinimumRank(session.rank, minimum)) {
    throw Response.json(
      { error: `Rank '${minimum}' or higher required`, code: 'INSUFFICIENT_RANK', requiredRank: minimum, currentRank: session.rank },
      { status: 403 },
    );
  }

  return session;
}
