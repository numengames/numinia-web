/**
 * «IAs de organización»: POST /api/agents/pass — the world pass an
 * organization's AI asks for, signed with its own key, no session and no CORS
 * (its bridge calls it, never a browser). See lib/agent-pass.ts for the
 * contract, the answers and the replay rule.
 */

import type { APIRoute } from 'astro';
import { answerAgentPass } from '../../../lib/agent-pass';
import { runtimeEnv } from '../../../lib/runtime-env';
import { desk, fleetWorlds } from '../mundos/_fleet';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const env = runtimeEnv();
  const { hosts } = await fleetWorlds();
  return answerAgentPass(desk(), request, {
    hosts,
    privateKey: env['WORLD_PASS_PRIVATE_KEY'],
    secret: env['AUTH_SESSION_SECRET'],
    now: Math.floor(Date.now() / 1000),
  });
};
