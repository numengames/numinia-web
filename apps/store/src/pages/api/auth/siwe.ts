/**
 * Spike: SIWE (EIP-4361) verification with viem in an Astro endpoint.
 * No personal data is persisted: the nonce and the resulting session live
 * only in httpOnly cookies. Fails closed on any malformed or invalid input.
 *
 * Spike scope: EOA signatures via local recovery (no RPC). Contract-wallet
 * support (EIP-1271) belongs to the ADR-006 auth session.
 */

import type { APIRoute } from 'astro';
import { recoverMessageAddress } from 'viem';
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from 'viem/siwe';

export const prerender = false;

const NONCE_COOKIE = 'siwe_nonce';
const SESSION_COOKIE = 'numinia_session';

export const GET: APIRoute = ({ cookies }) => {
  const nonce = generateSiweNonce();
  cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api/auth/siwe',
    maxAge: 300,
  });
  return Response.json({ nonce });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { message?: unknown; signature?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, signature } = body;
  if (typeof message !== 'string' || typeof signature !== 'string') {
    return Response.json({ error: 'message and signature are required' }, { status: 400 });
  }

  const expectedNonce = cookies.get(NONCE_COOKIE)?.value;
  if (!expectedNonce) {
    return Response.json({ error: 'Nonce missing or expired' }, { status: 401 });
  }

  const parsed = parseSiweMessage(message);
  const valid = validateSiweMessage({ message: parsed, nonce: expectedNonce });
  if (!valid || !parsed.address) {
    return Response.json({ error: 'Invalid SIWE message' }, { status: 401 });
  }

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (recovered.toLowerCase() !== parsed.address.toLowerCase()) {
    return Response.json({ error: 'Signature does not match address' }, { status: 401 });
  }

  cookies.delete(NONCE_COOKIE, { path: '/api/auth/siwe' });
  cookies.set(SESSION_COOKIE, recovered, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60,
  });
  return Response.json({ address: recovered });
};
