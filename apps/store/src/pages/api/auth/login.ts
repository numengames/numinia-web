/**
 * Login endpoint (MISSION-002 Step 0 spike).
 * GET  → SIWE login payload for an address (nonce issued server-side).
 * POST → verify the signed payload with thirdweb AND the accepted legal
 *        corpus (MIS-086); on success set our own httpOnly HMAC session
 *        cookie (rank: nomad). 401/400 on anything else.
 *
 * No session is created without a current acceptance: the UI gate can be
 * bypassed, this endpoint cannot.
 */

import type { APIRoute } from 'astro';
import {
  AuthDomainError,
  authConfigured,
  getAuth,
  issueSession,
  SESSION_COOKIE,
} from '../../../lib/auth/server';
import { isCurrentLegalAcceptance, LEGAL_CORPUS_VERSION } from '../../../lib/legal';

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
  const { payload, signature, terms } = (body ?? {}) as {
    payload?: unknown;
    signature?: unknown;
    terms?: unknown;
  };
  if (typeof payload !== 'object' || payload === null || typeof signature !== 'string') {
    return Response.json({ error: 'payload and signature are required' }, { status: 400 });
  }
  // Fail closed: a stale acceptance is no acceptance — the client must show
  // the current corpus again and send back exactly this version.
  if (!isCurrentLegalAcceptance(terms)) {
    return Response.json(
      { error: 'Legal acceptance is required', required: LEGAL_CORPUS_VERSION },
      { status: 400 },
    );
  }

  const verified = await auth.verifyPayload({
    // Malformed shapes fail verification inside thirdweb; we stay fail-closed.
    payload: payload as Parameters<ReturnType<typeof getAuth>['verifyPayload']>[0]['payload'],
    signature: signature as `0x${string}`,
  });
  if (!verified.valid) {
    return Response.json({ error: 'Invalid login payload' }, { status: 401 });
  }

  cookies.set(SESSION_COOKIE, await issueSession(verified.payload.address, LEGAL_CORPUS_VERSION), {
    httpOnly: true,
    sameSite: 'strict',
    secure: !import.meta.env.DEV,
    path: '/',
    maxAge: 60 * 60,
  });
  return Response.json({ ok: true });
};
