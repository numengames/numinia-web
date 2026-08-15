/**
 * Session introspection (MISSION-002 Step 0 spike).
 * GET → { address, rank } for a valid session cookie; 401 otherwise.
 * Verification is pure @numinia/auth (HMAC + zod), no vendor involved.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE, verifySession } from '../../../lib/auth/server';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return Response.json({ error: 'No session' }, { status: 401 });
  }
  const result = await verifySession(token);
  if (!result.valid) {
    return Response.json({ error: 'Invalid session', reason: result.reason }, { status: 401 });
  }
  return Response.json({ address: result.payload.sub, rank: result.payload.rank });
};
