/**
 * Session introspection (MISSION-002 Step 0 spike).
 * GET → { address, rank } for a valid session cookie; 401 otherwise.
 * Verification is pure @numinia/auth (HMAC + zod), no vendor involved.
 *
 * Never cached: the answer is about this browser at this moment, and the
 * chrome asks it on every page (lib/session-client.ts).
 */

import type { APIRoute } from 'astro';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';

export const prerender = false;

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export const GET: APIRoute = async ({ cookies }) => {
  // Fail closed: unconfigured auth can never yield a session.
  if (!authConfigured()) {
    return Response.json({ error: 'Auth not configured' }, { status: 401, headers: NO_STORE });
  }
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return Response.json({ error: 'No session' }, { status: 401, headers: NO_STORE });
  }
  const result = await verifySession(token);
  if (!result.valid) {
    return Response.json(
      { error: 'Invalid session', reason: result.reason },
      { status: 401, headers: NO_STORE },
    );
  }
  return Response.json(
    { address: result.payload.sub, rank: result.payload.rank },
    { headers: NO_STORE },
  );
};
