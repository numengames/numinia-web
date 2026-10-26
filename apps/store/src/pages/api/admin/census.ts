/**
 * The census API — rank management as governed acts.
 * GET reads a citizen's public census record; POST grants a rank. Both are
 * gated on the REAL session and the permission ladder; every write lands as
 * a commit in the private state repo with the acting wallet in its trailer.
 *
 * Governance rules encoded here, not in the UI:
 *  - `manage-users` opens the census; granting ARCHON needs `promote-archon`.
 *  - Only an owner (ADMIN_WALLET_ADDRESSES) appoints or removes an Oracle,
 *    with a fresh wallet signature; nobody acts upward (lib/census-rules.ts).
 *  - Without the state repo configured (D23 pending), everything is 503.
 */

import type { APIRoute } from 'astro';
import { hasPermission, type Rank } from '@numinia/domain';
import { censusPath, CensusRecordSchema } from '@numinia/state';
import {
  authConfigured,
  freshSignatureDeps,
  oracleWallets,
  SESSION_COOKIE,
  verifySession,
} from '../../../lib/auth/server';
import { answerGrant } from '../../../lib/census-desk';
import { rankFromRecord } from '../../../lib/census-rules';
import { logEvent } from '../../../lib/telemetry';
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
  const owners = new Set(oracleWallets());
  return Response.json({
    // An Oracle of the census is shown for what it is worth now (RNK-009).
    record: found ? { ...found.record, rank: rankFromRecord(found.record, owners) } : null,
    owner: owners.has(session.wallet.toLowerCase()),
  });
};

export const POST: APIRoute = async ({ cookies, request, url }) => {
  const session = await sessionOf(cookies.get(SESSION_COOKIE)?.value);
  if (!session || !hasPermission(session.rank, 'manage-users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const store = getStateStore();
  if (!store) {
    return Response.json({ error: 'The census is not configured yet (D23)' }, { status: 503 });
  }
  const body: unknown = await request.json().catch(() => null);
  const chain = Number(url.searchParams.get('chain'));
  return answerGrant(
    {
      store,
      owners: new Set(oracleWallets()),
      fresh: freshSignatureDeps(),
      now: () => Date.now(),
      log: logEvent,
    },
    session,
    body,
    Number.isInteger(chain) && chain > 0 ? chain : null,
  );
};
