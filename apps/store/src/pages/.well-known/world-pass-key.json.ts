/**
 * «Entrar» (cut 5): GET /.well-known/world-pass-key.json — the public half of
 * the key that signs world passes, `{ alg: "Ed25519", kid, publicKey }`, for
 * a world's engine to verify a pass with (contract: lib/world-pass.ts). No
 * session, public, cached for an hour; 503 while the signing key is not set.
 */

import type { APIRoute } from 'astro';
import { runtimeEnv } from '../../lib/runtime-env';
import { publicKeyDocument } from '../../lib/world-pass';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const document = await publicKeyDocument(runtimeEnv()['WORLD_PASS_PRIVATE_KEY']);
    return Response.json(document, {
      headers: { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' },
    });
  } catch {
    return Response.json(
      { error: 'no-key' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
};
