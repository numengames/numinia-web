/**
 * Login endpoint (MISSION-002 Step 0 spike).
 * GET  → SIWE login payload for an address (nonce issued server-side).
 * POST → verify the signed payload with thirdweb; on success set our own
 *        httpOnly HMAC session cookie (rank: nomad). 401 on anything else.
 */

import type { APIRoute } from 'astro';
import {
  AuthDomainError,
  authConfigured,
  getAuth,
  issueSession,
  SESSION_COOKIE,
} from '../../../lib/auth/server';

export const prerender = false;

/** SIWE binds to the host the browser shows; unknown hosts answer an honest 400. */
function authFor(url: URL): ReturnType<typeof getAuth> | Response {
  try {
    return getAuth(url.host);
  } catch (error) {
    if (error instanceof AuthDomainError) {
      return Response.json({ error: 'Unrecognized host' }, { status: 400 });
    }
    throw error;
  }
}

export const GET: APIRoute = async ({ url }) => {
  if (!authConfigured()) {
    return Response.json({ error: 'Auth not configured' }, { status: 503 });
  }
  const address = url.searchParams.get('address');
  const chainId = url.searchParams.get('chainId');
  if (!address) {
    return Response.json({ error: 'address is required' }, { status: 400 });
  }
  const auth = authFor(url);
  if (auth instanceof Response) return auth;
  const payload = await auth.generatePayload(
    chainId ? { address, chainId: Number(chainId) } : { address },
  );
  return Response.json(payload);
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!authConfigured()) {
    return Response.json({ error: 'Auth not configured' }, { status: 503 });
  }
  const auth = authFor(url);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { payload, signature } = (body ?? {}) as { payload?: unknown; signature?: unknown };
  if (typeof payload !== 'object' || payload === null || typeof signature !== 'string') {
    return Response.json({ error: 'payload and signature are required' }, { status: 400 });
  }

  const verified = await auth.verifyPayload({
    // Malformed shapes fail verification inside thirdweb; we stay fail-closed.
    payload: payload as Parameters<ReturnType<typeof getAuth>['verifyPayload']>[0]['payload'],
    signature: signature as `0x${string}`,
  });
  if (!verified.valid) {
    return Response.json({ error: 'Invalid login payload' }, { status: 401 });
  }

  cookies.set(SESSION_COOKIE, await issueSession(verified.payload.address), {
    httpOnly: true,
    sameSite: 'strict',
    secure: !import.meta.env.DEV,
    path: '/',
    maxAge: 60 * 60,
  });
  return Response.json({ ok: true });
};
