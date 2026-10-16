/**
 * The worlds room (numinia-archive ADR-069): the only door to the fleet
 * console. Gated on the REAL session — rank read from our own signed token
 * and checked against the permission ladder (@numinia/domain), never from a
 * header or a query the caller controls. Only Oracles hold `manage-worlds`.
 *
 * GET reads the fleet: each machine through its door (its worlds and their
 * phase, what it did — public facts, no key), cards and covers from the
 * Summa, liveness from each world's public /status, and the Numinia
 * Engine's newest published build. It writes nothing, and
 * there is nothing to write with: a change goes from the Oracle's browser
 * straight to the machine, signed by the Oracle's wallet, and the machine
 * checks the signature itself (lib/fleet.ts). This Worker holds no key to
 * any machine.
 */

import type { APIRoute } from 'astro';
import { hasPermission, type Rank } from '@numinia/domain';
import legacyBook from '../../../data/legacy-worlds.json';
import fixtureFleet from '../../../../fixtures/worlds/fleet.json';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';
import { gatherFleet, readMachine, type MachineView } from '../../../lib/fleet';
import { loadSumma } from '../../../lib/summa';
import {
  FLEET_MACHINES,
  buildRows,
  worldCards,
  type EngineRelease,
  type LegacyWorld,
  type Probe,
  type WorldCardInfo,
  type WorldFace,
} from '../../../lib/worlds';
import { latestEngine, probeFleet, probeWorlds, readFaces } from '../../../lib/worlds-source';

export const prerender = false;

interface Session {
  readonly wallet: string;
  readonly rank: Rank;
}

async function sessionOf(token: string | undefined): Promise<Session | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  return result.valid ? { wallet: result.payload.sub, rank: result.payload.rank } : null;
}

const forbidden = (): Response => Response.json({ error: 'Forbidden' }, { status: 403 });

// Frozen at build, like the Summa's own switch: CI and screenshots read the fixture.
const useFixture = (): boolean => process.env.DATA_SOURCE === 'fixture';

interface Fixture {
  readonly machines: readonly MachineView[];
  readonly cards: readonly WorldCardInfo[];
  readonly probes: Readonly<Record<string, Probe>>;
  readonly legacy: readonly LegacyWorld[];
  readonly faces: Readonly<Record<string, WorldFace>>;
  /** The Numinia Engine's newest build, as its release would say. */
  readonly engine?: EngineRelease | null;
}
const FIXTURE = fixtureFleet as unknown as Fixture;
// The worlds the old machine runs by hand: watched, never changed.
const LEGACY = (legacyBook as unknown as { readonly worlds: readonly LegacyWorld[] }).worlds;

export const GET: APIRoute = async ({ cookies }) => {
  const session = await sessionOf(cookies.get(SESSION_COOKIE)?.value);
  // Fail closed: no session, or a rank without the permission, sees nothing.
  if (!session || !hasPermission(session.rank, 'manage-worlds')) return forbidden();

  let views: readonly MachineView[];
  let cards: readonly WorldCardInfo[];
  let probes: Readonly<Record<string, Probe>>;
  let legacy: readonly LegacyWorld[];
  let faces: Readonly<Record<string, WorldFace>>;
  let engine: EngineRelease | null;
  if (useFixture()) {
    views = FIXTURE.machines;
    cards = FIXTURE.cards;
    probes = FIXTURE.probes;
    legacy = FIXTURE.legacy;
    faces = FIXTURE.faces;
    engine = FIXTURE.engine ?? null;
  } else {
    const [read, summa, newest] = await Promise.all([
      Promise.all(FLEET_MACHINES.map((machine) => readMachine(fetch, machine.alias))),
      loadSumma(),
      latestEngine(fetch),
    ]);
    views = read;
    cards = worldCards(summa.entities);
    legacy = LEGACY;
    engine = newest;
    const { orders } = gatherFleet(views);
    // A world without a card is named and pictured by its own page.
    const carded = new Set(cards.map((card) => card.slug));
    const bare = [
      ...orders.filter((order) => order.state === 'running' && !carded.has(order.card)),
      ...legacy,
    ];
    const [ordered, watched, faced] = await Promise.all([
      probeFleet(fetch, orders),
      probeWorlds(fetch, legacy),
      readFaces(fetch, bare),
    ]);
    probes = { ...watched, ...ordered };
    faces = faced;
  }

  const fleet = gatherFleet(views);
  return Response.json(
    {
      rank: session.rank,
      // The Oracle's own wallet: the room fills it into a machine's bootstrap
      // line and checks the wallet that signs is this one.
      wallet: session.wallet,
      machines: fleet.machines,
      rows: buildRows({
        orders: fleet.orders,
        phases: fleet.phases,
        leaving: fleet.leaving,
        arriving: fleet.arriving,
        cards,
        probes,
        legacy,
        faces,
        machines: fleet.machines,
        engine,
      }),
      cards,
      history: fleet.history,
      // The Numinia Engine's newest build: what a new world of it, an import
      // of its zip and «Actualizar» use; null while no release is published.
      engine,
      readAt: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
};
