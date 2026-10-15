/**
 * The head count (STD-053 PRS-004): how many people an organization has,
 * asked for with no wallet. What numinia.com shows to someone who is not a
 * member of an organization: a number and nothing else — no wallet, no
 * role, no name. The id is read as untrusted, and an id that names no
 * organization (a personal account included) is refused in words.
 */

import { readAccountId } from '../lib/accounts';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { whole } from './organizations';
import type { Row, TillDatabase } from './repository';

export type HeadcountAnswer =
  { readonly ok: true; readonly accountId: string; readonly members: number } | Refusal;

const COUNT_MEMBERS = `
  SELECT (SELECT COUNT(*) FROM team_members WHERE account_id = ?1) AS members
    FROM team_profiles WHERE account_id = ?1`;

/** How many people the organization `sentAccount` has, or why it has no count to give. */
export async function headcount(db: TillDatabase, sentAccount: unknown): Promise<HeadcountAnswer> {
  const accountId = readAccountId(sentAccount);
  if (accountId === undefined) return refuse(PROBLEMS.accountId);
  const row = await db.prepare(COUNT_MEMBERS).bind(accountId).first<Row>();
  if (row === null) return refuse(PROBLEMS.notTeam);
  return { ok: true, accountId, members: whole(row, 'members') };
}
