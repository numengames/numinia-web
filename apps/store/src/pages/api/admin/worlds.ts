/**
 * The worlds room (numinia-archive ADR-069): the only door to the fleet
 * console. Gated on the REAL session — rank read from our own signed token
 * and checked against the permission ladder (@numinia/domain), never from a
 * header or a query the caller controls. Only Oracles hold `manage-worlds`.
 */

import type { APIRoute } from 'astro';
import { hasPermission, type Rank } from '@numinia/domain';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';

export const prerender = false;

async function rankOf(token: string | undefined): Promise<Rank | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  return result.valid ? result.payload.rank : null;
}

export const GET: APIRoute = async ({ cookies }) => {
  const rank = await rankOf(cookies.get(SESSION_COOKIE)?.value);
  // Fail closed: no session, or a rank without the permission, sees nothing.
  if (!rank || !hasPermission(rank, 'manage-worlds')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  // The fleet's orders are read in the next cut; the room opens empty.
  return Response.json({ rank, worlds: [] });
};
