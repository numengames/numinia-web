/**
 * «Entrar» (cut 5): POST /api/mundos/<worldId>/pass — the address to send the
 * browser to, with the world pass after `#` when the session is of the
 * world's organization (or the house). See lib/world-pass-answer.ts; the
 * contract of the pass is in lib/world-pass.ts.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../../lib/auth/server';
import { sessionAsker } from '../../../../lib/auth/session-wallet';
import { runtimeEnv } from '../../../../lib/runtime-env';
import { answerPass } from '../../../../lib/world-pass-answer';
import { desk, fleetWorlds } from '../_fleet';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, params, request, url }) => {
  const env = runtimeEnv();
  const { hosts } = await fleetWorlds();
  return answerPass(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), {
    worldId: params.id ?? '',
    hosts,
    origin: url.origin,
    requestOrigin: request.headers.get('origin'),
    privateKey: env['WORLD_PASS_PRIVATE_KEY'],
    secret: env['AUTH_SESSION_SECRET'],
    now: Math.floor(Date.now() / 1000),
  });
};
