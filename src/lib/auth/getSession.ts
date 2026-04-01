import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/session';
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
