/**
 * Who follows which community (cut «Seguir», 2026-10-17), in migration
 * 0014's `community_follows`: one row per (community, wallet), and nothing
 * else. Only the signed-in wallet writes its own row — numinia.com's API
 * route checks the session and passes its wallet, the till re-validates
 * every field. The count of a community is public (the page shows «N
 * personas la siguen»); who exactly follows is told to nobody.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { readWallet } from '../lib/accounts';
import { readCommunityId } from '../lib/community-teams';
import { FOLLOW_PROBLEMS, readCommunityIds } from '../lib/follows';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { cents, text, type Row, type TillDatabase } from './repository';

/** The wallet's follows after a change or on request: the community ids, first followed first. */
interface MyFollows {
  readonly ok: true;
  readonly communityIds: readonly string[];
}

export type MyFollowsAnswer = MyFollows | Refusal;

/** How many people follow each community id asked; an id nobody follows is 0. */
interface FollowCounts {
  readonly ok: true;
  readonly counts: Readonly<Record<string, number>>;
}

export type FollowCountsAnswer = FollowCounts | Refusal;

const INSERT_FOLLOW = `
  INSERT INTO community_follows (community_id, wallet, created_at) VALUES (?1, ?2, ?3)
  ON CONFLICT (community_id, wallet) DO NOTHING`;

const DELETE_FOLLOW = 'DELETE FROM community_follows WHERE community_id = ?1 AND wallet = ?2';

const SELECT_MINE =
  'SELECT community_id FROM community_follows WHERE wallet = ?1 ORDER BY created_at, community_id';

const COUNT_FOLLOWS = `
  SELECT community_id, COUNT(*) AS people
    FROM community_follows
   WHERE community_id IN (SELECT value FROM json_each(?1))
   GROUP BY community_id`;

async function mine(db: TillDatabase, wallet: string): Promise<MyFollows> {
  const { results } = await db.prepare(SELECT_MINE).bind(wallet).all<Row>();
  return { ok: true, communityIds: results.map((row) => text(row, 'community_id')) };
}

function readBoth(
  sentWallet: unknown,
  sentCommunityId: unknown,
): { readonly wallet: string; readonly communityId: string } | Refusal {
  const wallet = readWallet(sentWallet);
  const communityId = readCommunityId(sentCommunityId);
  if (wallet === undefined || communityId === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(communityId === undefined ? [FOLLOW_PROBLEMS.communityId] : []),
    );
  }
  return { wallet, communityId };
}

/** `AccountDesk.follow`: the wallet follows the community; saying it twice is once. */
export async function follow(
  db: TillDatabase,
  sentWallet: unknown,
  sentCommunityId: unknown,
  now: Date,
): Promise<MyFollowsAnswer> {
  const read = readBoth(sentWallet, sentCommunityId);
  if ('ok' in read) return read;
  await db.prepare(INSERT_FOLLOW).bind(read.communityId, read.wallet, now.toISOString()).run();
  return mine(db, read.wallet);
}

/** `AccountDesk.unfollow`: the wallet no longer follows; the row goes, no history kept. */
export async function unfollow(
  db: TillDatabase,
  sentWallet: unknown,
  sentCommunityId: unknown,
): Promise<MyFollowsAnswer> {
  const read = readBoth(sentWallet, sentCommunityId);
  if ('ok' in read) return read;
  await db.prepare(DELETE_FOLLOW).bind(read.communityId, read.wallet).run();
  return mine(db, read.wallet);
}

/** `AccountDesk.myFollows`: the community ids the wallet follows. */
export async function myFollows(db: TillDatabase, sentWallet: unknown): Promise<MyFollowsAnswer> {
  const wallet = readWallet(sentWallet);
  if (wallet === undefined) return refuse(PROBLEMS.wallet);
  return mine(db, wallet);
}

/** `AccountDesk.followCounts`: how many follow each community asked — public, no wallet needed. */
export async function followCounts(
  db: TillDatabase,
  sentCommunityIds: unknown,
): Promise<FollowCountsAnswer> {
  const communityIds = readCommunityIds(sentCommunityIds);
  if (communityIds === undefined) return refuse(FOLLOW_PROBLEMS.communityIds);
  const counts: Record<string, number> = Object.fromEntries(communityIds.map((id) => [id, 0]));
  if (communityIds.length === 0) return { ok: true, counts };
  const { results } = await db.prepare(COUNT_FOLLOWS).bind(JSON.stringify(communityIds)).all<Row>();
  for (const row of results) counts[text(row, 'community_id')] = cents(row, 'people');
  return { ok: true, counts };
}
