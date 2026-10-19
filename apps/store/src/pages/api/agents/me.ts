/**
 * «MCP remoto», story W1: GET /api/agents/me — who an organization's AI is,
 * asked with its access token (`Authorization: Bearer ntk_…`,
 * `?org=…&agent=…`), and the worlds of its organization with their address.
 * No session and no CORS: the relay or the bridge calls it, never a browser.
 * See lib/agent-me.ts for the contract and the answers.
 */

import type { APIRoute } from 'astro';
import { answerAgentMe } from '../../../lib/agent-me';
import { desk, fleetWorlds } from '../mundos/_fleet';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  answerAgentMe(desk(), request, {
    // The fleet is read only once the token is good.
    hosts: async () => (await fleetWorlds()).hosts,
    now: Math.floor(Date.now() / 1000),
  });
