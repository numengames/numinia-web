/**
 * The census API (ADR-018, MISSION-016) — rank management as governed acts.
 * GET reads a citizen's public census record; POST grants a rank. Both are
 * gated on the REAL session and the permission ladder; every write lands as
 * a commit in the private state repo with the acting wallet in its trailer.
 *
 * Governance rules encoded here, not in the UI:
 *  - `manage-users` opens the census; granting ARCHON needs `promote-archon`.
 *  - The census can never mint an Oracle — that rank lives only in the
 *    ADMIN_WALLET_ADDRESSES allowlist (ADR-011).
 *  - Without the state repo configured (D23 pending), everything is 503.
 */

import type { APIRoute } from 'astro';
import { hasPermission, RANKS, type Rank } from '@numinia/domain';
import { censusPath, CensusRecordSchema, StateConflictError } from '@numinia/state';
import { z } from 'zod';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';
import { getStateStore } from '../../../lib/state/server';

export const prerender = false;

const WALLET = /^0x[0-9a-fA-F]{40}$/;

interface Session {
  readonly wallet: string;
  readonly rank: Rank;
}

async function sessionOf(token: string | undefined): Promise<Session | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  return result.valid ? { wallet: result.payload.sub, rank: result.payload.rank } : null;
}

export const GET: APIRoute = async ({ cookies, url }) => {
  const session = await sessionOf(cookies.get(SESSION_COOKIE)?.value);
  if (!session || !hasPermission(session.rank, 'manage-users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const store = getStateStore();
  if (!store) {
    return Response.json({ error: 'The census is not configured yet (D23)' }, { status: 503 });
  }
  const wallet = url.searchParams.get('wallet') ?? '';
  if (!WALLET.test(wallet)) {
    return Response.json({ error: 'wallet must be a 0x-prefixed address' }, { status: 400 });
  }
  const found = await store.read(censusPath(wallet.toLowerCase()), CensusRecordSchema);
  return Response.json({ record: found?.record ?? null });
};

const grantSchema = z.object({
  wallet: z.string().regex(WALLET, 'wallet must be a 0x-prefixed address'),
  // 'oracle' is deliberately not grantable here (ADR-011: allowlist only).
  rank: z.enum(RANKS.filter((rank) => rank !== 'oracle') as [Rank, ...Rank[]]),
});

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await sessionOf(cookies.get(SESSION_COOKIE)?.value);
  if (!session || !hasPermission(session.rank, 'manage-users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const store = getStateStore();
  if (!store) {
    return Response.json({ error: 'The census is not configured yet (D23)' }, { status: 503 });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }
  if (parsed.data.rank === 'archon' && !hasPermission(session.rank, 'promote-archon')) {
    return Response.json({ error: 'Promoting an Archon takes an Oracle' }, { status: 403 });
  }

  const wallet = parsed.data.wallet.toLowerCase();
  const actor = session.wallet.toLowerCase();
  const path = censusPath(wallet);
  const now = new Date().toISOString();

  // Read-modify-write with one retry: a concurrent grant re-reads the sha.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await store.read(path, CensusRecordSchema);
    const record = CensusRecordSchema.parse({
      wallet,
      rank: parsed.data.rank,
      since: existing?.record.since ?? now,
      updatedAt: now,
      actor,
    });
    try {
      await store.write(path, record, {
        message: `census: ${wallet} becomes ${parsed.data.rank}`,
        actor,
        ...(existing ? { sha: existing.sha } : {}),
      });
      return Response.json({ record }, { status: existing ? 200 : 201 });
    } catch (error) {
      if (!(error instanceof StateConflictError) || attempt === 1) throw error;
    }
  }
  // Unreachable: the loop returns or throws. TypeScript wants an ending.
  return Response.json({ error: 'Conflict' }, { status: 409 });
};
