/**
 * How many people (and, beside them, AIs) are inside each community's
 * home right now — numbers only. Live and each community's page ask here; this asks each home's
 * public `/status` like any visitor (the engine lists every visitor's name
 * and position there: the count is kept, the rest dropped, lib/worlds.ts
 * `readProbe`).
 *
 * Public and keyless. One answer per instance is reused for 30 s, so a
 * crowd of readers never turns into a crowd of requests to the worlds.
 */

import type { APIRoute } from 'astro';
import { REGISTER } from '../../components/communities/register';
import { countedSedes } from '../../lib/communities';
import { probeWorlds } from '../../lib/worlds-source';

export const prerender = false;

const TTL_MS = 30_000;

// Frozen at build, like the Summa's own switch: CI and screenshots never reach the worlds.
const useFixture = (): boolean => process.env.DATA_SOURCE === 'fixture';

let cached: {
  readonly at: number;
  readonly inside: Readonly<Record<string, number | null>>;
  readonly ais: Readonly<Record<string, number | null>>;
} | null = null;

type Counts = Readonly<Record<string, number | null>>;

async function readInside(): Promise<{ inside: Counts; ais: Counts }> {
  const sedes = countedSedes(REGISTER);
  if (useFixture()) {
    return {
      inside: Object.fromEntries(sedes.map((sede) => [sede.id, 0])),
      ais: Object.fromEntries(sedes.map((sede) => [sede.id, null])),
    };
  }
  const probes = await probeWorlds(fetch, sedes, 2500);
  // A home that does not answer is not «empty»: it says nothing (null); one
  // that does not count its AIs (an older engine) says nothing of them.
  const of = (pick: (probe: { users: number; ais: number | null }) => number | null): Counts =>
    Object.fromEntries(
      sedes.map((sede) => {
        const probe = probes[sede.id];
        return [sede.id, probe?.ok === true ? pick(probe) : null];
      }),
    );
  return { inside: of((probe) => probe.users), ais: of((probe) => probe.ais) };
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cached === null || now - cached.at > TTL_MS) cached = { at: now, ...(await readInside()) };
  return Response.json(
    { inside: cached.inside, ais: cached.ais },
    { headers: { 'cache-control': 'public, max-age=30' } },
  );
};
