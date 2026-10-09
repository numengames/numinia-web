/**
 * The worlds room (numinia-archive ADR-069): the only door to the fleet
 * console. Gated on the REAL session — rank read from our own signed token
 * and checked against the permission ladder (@numinia/domain), never from a
 * header or a query the caller controls. Only Oracles hold `manage-worlds`.
 *
 * GET  reads the fleet: orders and proposals from numinia-assets, cards and
 *      covers from the Summa, liveness from each world's public /status.
 * POST proposes ONE change as a pull request on the order book — never a
 *      write anywhere else. Without WORLDS_GITHUB_TOKEN it answers 503 and
 *      the room opens the same change on GitHub, under the Oracle's account.
 */

import type { APIRoute } from 'astro';
import { hasPermission, type Rank } from '@numinia/domain';
import { z } from 'zod';
import fixtureFleet from '../../../../fixtures/worlds/fleet.json';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';
import { runtimeEnv } from '../../../lib/runtime-env';
import { loadSumma } from '../../../lib/summa';
import {
  buildRows,
  draftToOrder,
  worldCards,
  type PendingChange,
  type Probe,
  type WorldCardInfo,
} from '../../../lib/worlds';
import {
  FleetError,
  probeFleet,
  ProposalError,
  proposeChange,
  readFleet,
  worldsToken,
  type Change,
  type FleetSnapshot,
} from '../../../lib/worlds-source';

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

interface Fixture extends FleetSnapshot {
  readonly cards: readonly WorldCardInfo[];
  readonly probes: Readonly<Record<string, Probe>>;
}
const FIXTURE = fixtureFleet as unknown as Fixture;

// One read of the order book per minute per isolate: GitHub's unauthenticated
// quota is small and shared, and the fleet does not change by the second.
const FLEET_TTL_MS = 60_000;
let fleetCache: { readonly at: number; readonly snapshot: FleetSnapshot } | null = null;

async function fleet(token: string | null, fresh = false): Promise<FleetSnapshot> {
  if (!fresh && fleetCache && Date.now() - fleetCache.at < FLEET_TTL_MS) return fleetCache.snapshot;
  const snapshot = await readFleet(fetch, token);
  fleetCache = { at: Date.now(), snapshot };
  return snapshot;
}

const unreadable = (error: unknown): Response =>
  Response.json(
    { error: 'fleet-unreadable', status: error instanceof FleetError ? error.status : 0 },
    { status: 502 },
  );

export const GET: APIRoute = async ({ cookies }) => {
  const session = await sessionOf(cookies.get(SESSION_COOKIE)?.value);
  // Fail closed: no session, or a rank without the permission, sees nothing.
  if (!session || !hasPermission(session.rank, 'manage-worlds')) return forbidden();

  const token = useFixture() ? null : worldsToken(runtimeEnv());
  let snapshot: FleetSnapshot;
  let cards: readonly WorldCardInfo[];
  let probes: Readonly<Record<string, Probe>>;
  if (useFixture()) {
    snapshot = FIXTURE;
    cards = FIXTURE.cards;
    probes = FIXTURE.probes;
  } else {
    try {
      snapshot = await fleet(token);
    } catch (error) {
      return unreadable(error);
    }
    cards = worldCards((await loadSumma()).entities);
    probes = await probeFleet(fetch, snapshot.orders);
  }

  return Response.json(
    {
      rank: session.rank,
      canPropose: token !== null,
      rows: buildRows({ orders: snapshot.orders, cards, probes, pending: snapshot.pending }),
      cards,
      invalid: snapshot.invalid,
      history: snapshot.history,
      readAt: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
};

const SLUG = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    draft: z.object({
      id: z.string().max(80),
      card: z.string().max(80),
      server: z.string().max(80),
      domain: z.string().max(253),
      image: z.string().max(200),
      memory: z.string().max(16),
      cpus: z.string().max(16),
      maxUploadMb: z.string().max(8),
    }),
  }),
  z.object({ action: z.enum(['stop', 'start', 'close']), id: SLUG }),
]);

const PROPOSAL_STATUS = { exists: 409, missing: 404, github: 502 } as const;

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await sessionOf(cookies.get(SESSION_COOKIE)?.value);
  if (!session || !hasPermission(session.rank, 'manage-worlds')) return forbidden();

  const token = useFixture() ? null : worldsToken(runtimeEnv());
  if (!token) return Response.json({ error: 'not-configured' }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });

  let change: Change;
  if (parsed.data.action === 'create') {
    const result = draftToOrder(parsed.data.draft);
    if ('problems' in result) {
      return Response.json({ error: 'invalid', problems: result.problems }, { status: 400 });
    }
    change = { action: 'create', order: result.order };
  } else {
    change = { action: parsed.data.action, id: parsed.data.id };
  }
  const id = change.action === 'create' ? change.order.id : change.id;

  // The Tower's rule: one change per world at a time.
  let pending: readonly PendingChange[];
  try {
    pending = (await fleet(token, true)).pending;
  } catch (error) {
    return unreadable(error);
  }
  const open = pending.find((candidate) => candidate.id === id);
  if (open) return Response.json({ error: 'pending', url: open.url }, { status: 409 });

  try {
    const proposal = await proposeChange(
      fetch,
      token,
      change,
      session.wallet,
      Date.now().toString(36),
    );
    fleetCache = null;
    return Response.json(proposal, { status: 201 });
  } catch (error) {
    if (error instanceof ProposalError) {
      return Response.json(
        { error: error.code, status: error.status },
        { status: PROPOSAL_STATUS[error.code] },
      );
    }
    throw error;
  }
};
