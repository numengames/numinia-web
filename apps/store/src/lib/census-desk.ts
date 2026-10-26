/**
 * The census desk's grant, as the route answers it (STD-003 RNK-004, RNK-006,
 * RNK-009). The route hands over the session, the store and the clock; this
 * file reads the target, asks `judgeGrant`, asks the owner's wallet to sign
 * again when an Oracle moves (two steps, one door: the first POST answers 428
 * with the lines to sign, the second carries the proof) and writes the commit.
 * Server only (zod lives in @numinia/state).
 */

import { RANKS, type Rank } from '@numinia/domain';
import {
  censusPath,
  CensusRecordSchema,
  StateConflictError,
  type CensusRecord,
  type GitStateStore,
} from '@numinia/state';
import { z } from 'zod';
import { appointedOracles, judgeGrant, oracleActMessage, rankFromRecord } from './census-rules';
import {
  actDigest,
  checkFresh,
  FRESH_TTL_MS,
  issueFreshToken,
  type FreshDeps,
} from './fresh-signature';

const WALLET = /^0x[0-9a-fA-F]{40}$/;

const grantSchema = z.object({
  wallet: z.string().regex(WALLET, 'wallet must be a 0x-prefixed address'),
  rank: z.enum(RANKS),
  fresh: z.object({ token: z.string().min(1), signature: z.string().min(1) }).optional(),
});

export interface DeskDeps {
  readonly store: Pick<GitStateStore, 'read' | 'write' | 'list'>;
  /** The owners: ADMIN_WALLET_ADDRESSES, lower case. */
  readonly owners: ReadonlySet<string>;
  readonly fresh: FreshDeps | null;
  readonly now: () => number;
  readonly log: (event: Readonly<Record<string, unknown>>) => void;
}

export interface DeskSession {
  readonly wallet: string;
  readonly rank: Rank;
}

const refuse = (status: number, error: string): Response => Response.json({ error }, { status });

export async function answerGrant(
  deps: DeskDeps,
  session: DeskSession,
  body: unknown,
  chainId: number | null,
): Promise<Response> {
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) return refuse(400, parsed.error.issues[0]?.message ?? 'Invalid');
  const wallet = parsed.data.wallet.toLowerCase();
  const actor = session.wallet.toLowerCase();
  const path = censusPath(wallet);

  const existing = await deps.store.read(path, CensusRecordSchema);
  const current: Rank = existing ? rankFromRecord(existing.record, deps.owners) : 'nomad';
  const arriving = parsed.data.rank === 'oracle' && current !== 'oracle';
  let appointed = 0;
  if (arriving) {
    try {
      appointed = await appointedOracles(deps.store, deps.owners);
    } catch {
      return refuse(503, 'The Oracles could not be counted; nobody is appointed blind');
    }
  }
  const verdict = judgeGrant({
    actor: { wallet: actor, rank: session.rank },
    target: { wallet, rank: current },
    rank: parsed.data.rank,
    owners: deps.owners,
    appointed,
  });
  if (!verdict.ok) return refuse(verdict.status, verdict.error);

  if (verdict.fresh) {
    if (deps.fresh === null) return refuse(503, 'Signing is not configured');
    const act = { wallet, rank: parsed.data.rank };
    if (!parsed.data.fresh) {
      const expiresAt = deps.fresh.now() + FRESH_TTL_MS;
      const message = oracleActMessage(act, arriving, expiresAt);
      const token = await issueFreshToken(deps.fresh.secret, {
        wallet: actor,
        act: await actDigest(act),
        message,
        chainId,
        expiresAt,
      });
      return Response.json(
        {
          error: 'signature-required',
          sign: { message, token, expiresAt: new Date(expiresAt).toISOString() },
        },
        { status: 428 },
      );
    }
    if ((await checkFresh(deps.fresh, actor, act, parsed.data.fresh)) !== 'ok') {
      return refuse(403, 'The signature does not match this act');
    }
  }

  const now = new Date(deps.now()).toISOString();
  const commit = async (before: typeof existing): Promise<Response> => {
    const record: CensusRecord = CensusRecordSchema.parse({
      wallet,
      rank: parsed.data.rank,
      since: before?.record.since ?? now,
      updatedAt: now,
      actor,
      ...(parsed.data.rank === 'oracle' ? { appointedBy: actor } : {}),
    });
    await deps.store.write(path, record, {
      message: `census: ${wallet} becomes ${parsed.data.rank}`,
      actor,
      ...(before ? { sha: before.sha } : {}),
    });
    deps.log({
      level: 'info',
      kind: 'authz_change',
      actor,
      target: wallet,
      from: current,
      to: parsed.data.rank,
    });
    return Response.json({ record }, { status: before ? 200 : 201 });
  };
  // A concurrent grant moved the file's sha: read it again and try once more.
  try {
    return await commit(existing);
  } catch (error) {
    if (!(error instanceof StateConflictError)) throw error;
    return commit(await deps.store.read(path, CensusRecordSchema));
  }
}
