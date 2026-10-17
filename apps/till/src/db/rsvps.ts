/**
 * Who is going to which encounter (cut «Tu agenda», 2026-10-17), in
 * migration 0012's `ritual_rsvps`: one row per (ritual, wallet), and nothing
 * else. Only the signed-in wallet writes its own row — numinia.com's API
 * route checks the session and passes its wallet, the till re-validates
 * every field. The count of an encounter is public (the page shows «N
 * personas van»); who exactly is going is told to nobody.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { readWallet } from '../lib/accounts';
import { RSVP_PROBLEMS, readRitualId, readRitualIds } from '../lib/rsvps';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { cents, text, type Row, type TillDatabase } from './repository';

/** The wallet's RSVPs after a change or on request: the ritual ids, soonest said first. */
interface MyRsvps {
  readonly ok: true;
  readonly ritualIds: readonly string[];
}

export type MyRsvpsAnswer = MyRsvps | Refusal;

/** How many people said they are going, per ritual id asked; an id nobody goes to is 0. */
interface RsvpCounts {
  readonly ok: true;
  readonly counts: Readonly<Record<string, number>>;
}

export type RsvpCountsAnswer = RsvpCounts | Refusal;

const INSERT_RSVP = `
  INSERT INTO ritual_rsvps (ritual_id, wallet, created_at) VALUES (?1, ?2, ?3)
  ON CONFLICT (ritual_id, wallet) DO NOTHING`;

const DELETE_RSVP = 'DELETE FROM ritual_rsvps WHERE ritual_id = ?1 AND wallet = ?2';

const SELECT_MINE =
  'SELECT ritual_id FROM ritual_rsvps WHERE wallet = ?1 ORDER BY created_at, ritual_id';

const COUNT_RSVPS = `
  SELECT ritual_id, COUNT(*) AS people
    FROM ritual_rsvps
   WHERE ritual_id IN (SELECT value FROM json_each(?1))
   GROUP BY ritual_id`;

async function mine(db: TillDatabase, wallet: string): Promise<MyRsvps> {
  const { results } = await db.prepare(SELECT_MINE).bind(wallet).all<Row>();
  return { ok: true, ritualIds: results.map((row) => text(row, 'ritual_id')) };
}

/** `AccountDesk.rsvp`: the wallet says it is going; saying it twice is once. */
export async function rsvp(
  db: TillDatabase,
  sentWallet: unknown,
  sentRitualId: unknown,
  now: Date,
): Promise<MyRsvpsAnswer> {
  const wallet = readWallet(sentWallet);
  const ritualId = readRitualId(sentRitualId);
  if (wallet === undefined || ritualId === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(ritualId === undefined ? [RSVP_PROBLEMS.ritualId] : []),
    );
  }
  await db.prepare(INSERT_RSVP).bind(ritualId, wallet, now.toISOString()).run();
  return mine(db, wallet);
}

/** `AccountDesk.unrsvp`: the wallet is no longer going; the row goes, no history kept. */
export async function unrsvp(
  db: TillDatabase,
  sentWallet: unknown,
  sentRitualId: unknown,
): Promise<MyRsvpsAnswer> {
  const wallet = readWallet(sentWallet);
  const ritualId = readRitualId(sentRitualId);
  if (wallet === undefined || ritualId === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(ritualId === undefined ? [RSVP_PROBLEMS.ritualId] : []),
    );
  }
  await db.prepare(DELETE_RSVP).bind(ritualId, wallet).run();
  return mine(db, wallet);
}

/** `AccountDesk.myRsvps`: the ritual ids the wallet said it is going to. */
export async function myRsvps(db: TillDatabase, sentWallet: unknown): Promise<MyRsvpsAnswer> {
  const wallet = readWallet(sentWallet);
  if (wallet === undefined) return refuse(PROBLEMS.wallet);
  return mine(db, wallet);
}

/** `AccountDesk.rsvpCounts`: how many are going to each ritual asked — public, no wallet needed. */
export async function rsvpCounts(
  db: TillDatabase,
  sentRitualIds: unknown,
): Promise<RsvpCountsAnswer> {
  const ritualIds = readRitualIds(sentRitualIds);
  if (ritualIds === undefined) return refuse(RSVP_PROBLEMS.ritualIds);
  const counts: Record<string, number> = Object.fromEntries(ritualIds.map((id) => [id, 0]));
  if (ritualIds.length === 0) return { ok: true, counts };
  const { results } = await db.prepare(COUNT_RSVPS).bind(JSON.stringify(ritualIds)).all<Row>();
  for (const row of results) counts[text(row, 'ritual_id')] = cents(row, 'people');
  return { ok: true, counts };
}
