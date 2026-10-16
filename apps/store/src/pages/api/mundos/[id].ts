/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16): the data of a world's own
 * page. GET /api/mundos/<worldId> needs NO session — the page is public for
 * now — and answers `{ worldId, home: { accountId, accountName } | null,
 * manage, url }`: `home` is the organization the house placed the world in,
 * `manage` is true only for a session that is a member or owner of it, or the
 * house (decided by the till from our own signed cookie, never the request),
 * and `url` is where the world is served (the guest link «Entrar» falls back
 * to). A world the fleet does not have is 404 for everyone; the fleet is the
 * one the worlds room reads (lib/fleet.ts), or the fixture's under
 * DATA_SOURCE=fixture.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { logEvent } from '../../../lib/telemetry';
import { answerWorld, readWorldId } from '../../../lib/worlds-homes';
import { desk, fleetWorlds } from './_fleet';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, params }) => {
  const id = params.id ?? '';
  // A malformed id is 404 without asking the fleet at all.
  const fleet =
    readWorldId(id) === undefined
      ? { ids: new Set<string>(), hosts: new Map<string, string>() }
      : await fleetWorlds();
  return answerWorld(
    desk(),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    id,
    fleet.ids,
    logEvent,
    fleet.hosts,
  );
};
