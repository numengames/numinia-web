/**
 * Session gate for pages whose CONTENT must not be public (MISSION-012).
 *
 * Real gating means the text never reaches a static file: a page that checks
 * a session in the browser has already shipped what it meant to hide. Pages
 * using this run on demand (`prerender = false`) and ask here first.
 */

import type { Rank } from '@numinia/domain';
import { authConfigured, SESSION_COOKIE, verifySession } from '../auth/server';

export interface Viewer {
  readonly address: string;
  readonly rank: Rank;
}

/** The viewer behind a request, or null when there is no valid session. */
export async function viewerFrom(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<Viewer | null> {
  if (!authConfigured()) return null;
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await verifySession(token);
  return result.valid ? { address: result.payload.sub, rank: result.payload.rank } : null;
}
