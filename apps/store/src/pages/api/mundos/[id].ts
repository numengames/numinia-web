/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16): the data of a world's own
 * page. GET /api/mundos/<worldId> needs NO session — the page is public for
 * now — and answers `{ worldId, home: { accountId, accountName } | null,
 * manage }`: `home` is the organization the house placed the world in, and
 * `manage` is true only for a session that is a member or owner of it, or the
 * house (decided by the till from our own signed cookie, never the request).
 * A world the fleet does not have is 404 for everyone; the fleet is the one
 * the worlds room reads (lib/fleet.ts), or the fixture's under
 * DATA_SOURCE=fixture.
 */

import type { APIRoute } from 'astro';
import legacyBook from '../../../data/legacy-worlds.json';
import fixtureFleet from '../../../../fixtures/worlds/fleet.json';
import { accountsFrom } from '../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { readMachine, type MachineView } from '../../../lib/fleet';
import { runtimeBinding } from '../../../lib/runtime-env';
import { FLEET_MACHINES } from '../../../lib/worlds';
import { answerWorld, fleetWorldIds, readWorldId } from '../../../lib/worlds-homes';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

// The worlds the old machine runs by hand: watched, never changed.
const LEGACY = (legacyBook as unknown as { readonly worlds: readonly { readonly id: string }[] })
  .worlds;
const FIXTURE = fixtureFleet as unknown as {
  readonly machines: readonly MachineView[];
  readonly legacy: readonly { readonly id: string }[];
};

/** The ids the fleet has: the fixture's under DATA_SOURCE=fixture, else each machine's door. */
async function fleetIds(): Promise<ReadonlySet<string>> {
  if (process.env.DATA_SOURCE === 'fixture') return fleetWorldIds(FIXTURE.machines, FIXTURE.legacy);
  const views = await Promise.all(
    FLEET_MACHINES.map((machine) => readMachine(fetch, machine.alias)),
  );
  return fleetWorldIds(views, LEGACY);
}

export const GET: APIRoute = async ({ cookies, params }) => {
  const id = params.id ?? '';
  // A malformed id is 404 without asking the fleet at all.
  const known = readWorldId(id) === undefined ? new Set<string>() : await fleetIds();
  return answerWorld(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), id, known);
};
