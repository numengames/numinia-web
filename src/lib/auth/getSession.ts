import { NextRequest } from 'next/server';
import { getThirdwebAuth, TW_JWT_COOKIE } from '@/lib/thirdweb-auth';
import type { Rank, RankPermissions } from '@/types/rank';
import { mapRoleToRank, meetsMinimumRank, getPermissionsForRank } from '@/lib/rank';

// Unified session type — Thirdweb wallet auth only.
export type AdminSession = {
  isAdmin: boolean;
  address?: string;
  role: string;
};

/**
 * Decode JWT payload WITHOUT signature verification (sync, lightweight).
 * Used ONLY for non-critical reads (e.g. "show hidden assets to admin").
 * For mutation routes, use requireRank() which verifies the JWT signature.
 */
export function getAdminSession(req: NextRequest): AdminSession {
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
      // Invalid JWT — treat as unauthenticated
    }
  }

  return { isAdmin: false, role: 'anonymous' };
}

/**
 * Verify JWT signature and return admin session. Async — calls Thirdweb SDK.
 * Use this for any route that grants elevated access.
 */
export async function verifyAdminSession(req: NextRequest): Promise<AdminSession> {
  const twCookie = req.cookies.get(TW_JWT_COOKIE);
  if (!twCookie?.value) return { isAdmin: false, role: 'anonymous' };

  const auth = getThirdwebAuth();
  if (!auth) return { isAdmin: false, role: 'anonymous' };

  try {
    const result = await auth.verifyJWT({ jwt: twCookie.value });
    if (!result.valid || !result.parsedJWT.sub) {
      return { isAdmin: false, role: 'anonymous' };
    }

    const address = result.parsedJWT.sub.toLowerCase();
    const adminAddresses = (process.env.ADMIN_WALLET_ADDRESSES ?? '')
      .split(',').map(a => a.trim().toLowerCase()).filter(Boolean);

    if (adminAddresses.includes(address)) {
      return { isAdmin: true, address: result.parsedJWT.sub, role: 'admin' };
    }

    return { isAdmin: false, address: result.parsedJWT.sub, role: 'user' };
  } catch {
    return { isAdmin: false, role: 'anonymous' };
  }
}

// User session type — for any authenticated user (admin or regular)
export type UserSession = {
  authenticated: boolean;
  address?: string;
  role: string;
};

/**
 * Verify JWT and return user session. Async — calls Thirdweb SDK.
 * Replaces the old sync getUserSession() for all critical paths.
 */
async function verifyUserSession(req: NextRequest): Promise<UserSession> {
  const twCookie = req.cookies.get(TW_JWT_COOKIE);
  if (!twCookie?.value) return { authenticated: false, role: 'anonymous' };

  const auth = getThirdwebAuth();
  if (!auth) {
    // Thirdweb not configured — decode without verification (dev fallback)
    return decodeJwtPayload(twCookie.value);
  }

  try {
    const result = await auth.verifyJWT({ jwt: twCookie.value });
    if (!result.valid || !result.parsedJWT.sub) {
      return { authenticated: false, role: 'anonymous' };
    }
    return { authenticated: true, address: result.parsedJWT.sub, role: 'user' };
  } catch {
    return { authenticated: false, role: 'anonymous' };
  }
}

/**
 * Decode JWT payload WITHOUT signature verification (sync, lightweight).
 * Safe for read-only operations (e.g. seasons progress, favorites).
 * For mutations, use requireRank() which verifies the JWT signature.
 */
export function getUserSession(req: NextRequest): UserSession {
  const twCookie = req.cookies.get(TW_JWT_COOKIE);
  if (!twCookie?.value) return { authenticated: false, role: 'anonymous' };
  return decodeJwtPayload(twCookie.value);
}

/**
 * Decode JWT payload without verification (sync).
 * Also used as fallback when Thirdweb Auth is not configured (dev).
 */
function decodeJwtPayload(jwt: string): UserSession {
  try {
    const parts = jwt.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      if (payload.sub) {
        return { authenticated: true, address: payload.sub, role: 'user' };
      }
    }
  } catch {
    // malformed
  }
  return { authenticated: false, role: 'anonymous' };
}

// ---------------------------------------------------------------------------
// Rank-aware session
// ---------------------------------------------------------------------------

/** Session enriched with rank, permissions, and ban status. */
export type SessionWithRank = {
  authenticated: boolean;
  address?: string;
  role: string;
  rank: Rank;
  permissions: RankPermissions;
  banned: boolean;
};

/**
 * Get user session enriched with computed rank and permissions.
 * VERIFIES JWT signature via Thirdweb SDK before trusting the token.
 */
export async function getSessionWithRank(req: NextRequest): Promise<SessionWithRank> {
  const session = await verifyUserSession(req);

  if (!session.authenticated) {
    return {
      ...session,
      rank: 'nomad',
      permissions: getPermissionsForRank('nomad'),
      banned: false,
    };
  }

  // Lazy import to avoid circular deps
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
 * JWT signature is VERIFIED before checking rank.
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
