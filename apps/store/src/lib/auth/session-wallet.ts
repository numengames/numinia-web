/**
 * The session's wallet for routes that serve ANY signed-in person (no rank
 * needed, «Saldo»): read from our own signed cookie, lowercased as the till
 * wants it, or null without a valid session — the route answers 401.
 */

import { authConfigured, verifySession } from './server';

export async function sessionWallet(token: string | undefined): Promise<string | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  return result.valid ? result.payload.sub.toLowerCase() : null;
}
