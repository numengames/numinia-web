/**
 * Who may move whom in the census (STD-003: «Nobody acts upward», the ceiling
 * on moving someone by hand, RNK-009 «Only an owner appoints an Oracle»).
 * Pure: the route reads the session and the store, this file decides.
 *
 *  - An owner is a wallet of ADMIN_WALLET_ADDRESSES; no screen edits that list.
 *  - Only an owner appoints or removes an Oracle, with a fresh signature, and
 *    owners plus appointed Oracles never come to more than MAX_ORACLES.
 *  - An appointed Oracle holds the rank only while the owner who appointed
 *    them is still an owner (`rankFromRecord`).
 *  - Nobody changes an owner or their own rank from the census.
 *  - Nobody acts upward: the actor outranks the target's rank and the rank
 *    they give; granting Archon takes `promote-archon`.
 */

import { hasPermission, rankLevel, type Rank } from '@numinia/domain';
import { censusPath, CensusRecordSchema, type GitStateStore } from '@numinia/state';

/** STD-003 RNK-003: owners and appointed Oracles together. */
export const MAX_ORACLES = 4;

/** The census files' names: one lower-case wallet each. */
const CENSUS_FILE = /^(0x[0-9a-f]{40})\.json$/;
/** The most census files read to count the Oracles. */
const COUNT_READ_MAX = 1_000;

/** What a census record says about rank, as far as the platform honours it. */
export function rankFromRecord(
  record: { readonly rank: Rank; readonly appointedBy?: string | undefined },
  owners: ReadonlySet<string>,
): Rank {
  if (record.rank !== 'oracle') return record.rank;
  return record.appointedBy !== undefined && owners.has(record.appointedBy) ? 'oracle' : 'nomad';
}

export interface GrantQuery {
  readonly actor: { readonly wallet: string; readonly rank: Rank };
  readonly target: { readonly wallet: string; readonly rank: Rank };
  readonly rank: Rank;
  readonly owners: ReadonlySet<string>;
  /** Oracles appointed from the census that still hold the rank. */
  readonly appointed: number;
}

export type GrantVerdict =
  | { readonly ok: true; readonly fresh: boolean }
  | { readonly ok: false; readonly status: 403 | 409; readonly error: string };

const no = (status: 403 | 409, error: string): GrantVerdict => ({ ok: false, status, error });

export function judgeGrant(query: GrantQuery): GrantVerdict {
  const { actor, target, owners } = query;
  if (!hasPermission(actor.rank, 'manage-users')) return no(403, 'Forbidden');
  if (owners.has(target.wallet)) return no(403, 'An owner is never changed from the census');
  if (target.wallet === actor.wallet) return no(403, 'Nobody changes their own rank');

  if (query.rank === 'oracle' || target.rank === 'oracle') {
    if (!owners.has(actor.wallet)) return no(403, 'Only an owner appoints or removes an Oracle');
    const arriving = query.rank === 'oracle' && target.rank !== 'oracle';
    if (arriving && owners.size + query.appointed >= MAX_ORACLES) {
      return no(409, `The Oracles come to ${MAX_ORACLES} at most, owners included`);
    }
    return { ok: true, fresh: true };
  }

  // Only Archons and Oracles hold manage-users, and every rank an Archon may
  // give but Archon itself lies below theirs: the target and `promote-archon`
  // are what is left to check.
  if (rankLevel(target.rank) >= rankLevel(actor.rank)) return no(403, 'Nobody acts upward');
  if (query.rank === 'archon' && !hasPermission(actor.rank, 'promote-archon')) {
    return no(403, 'Promoting an Archon takes an Oracle');
  }
  return { ok: true, fresh: false };
}

/** The three lines the owner's wallet signs for an Oracle act (English: a wallet shows them as they are). */
export function oracleActMessage(
  act: { readonly wallet: string; readonly rank: Rank },
  appointing: boolean,
  expiresAt: number,
): string {
  const time = new Date(expiresAt).toISOString().slice(11, 16);
  return [
    appointing ? 'Numinia: appoint an Oracle' : 'Numinia: change an Oracle',
    appointing
      ? `${act.wallet} becomes an Oracle, with every power of an owner except appointing Oracles.`
      : `${act.wallet} stops being an Oracle and becomes ${act.rank}.`,
    `Sign before ${time} UTC.`,
  ].join('\n');
}

/**
 * How many Oracles the census holds that still count (appointed by a wallet
 * that is still an owner). Throws when a read fails: a count nobody can say
 * must not let a fifth Oracle in.
 */
export async function appointedOracles(
  census: Pick<GitStateStore, 'list' | 'read'>,
  owners: ReadonlySet<string>,
): Promise<number> {
  const names = (await census.list('census')).slice(0, COUNT_READ_MAX);
  const wallets = names.flatMap((name) => CENSUS_FILE.exec(name)?.[1] ?? []);
  const found = await Promise.all(
    wallets.map(async (wallet) => {
      const read = await census.read(censusPath(wallet), CensusRecordSchema);
      return read !== null && rankFromRecord(read.record, owners) === 'oracle' ? 1 : 0;
    }),
  );
  return found.reduce<number>((sum, one) => sum + one, 0);
}
