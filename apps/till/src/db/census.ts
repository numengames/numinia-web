/**
 * Who has signed in (cut «El censo», 2026-10-16), in migration 0007's
 * `wallet_sign_ins`: per wallet the first time and the last time, and
 * nothing else. numinia.com records a sign-in after the session is decided
 * (`signedIn`); the house — and nobody else (STD-053: «Only fellow members
 * see who it is») — reads the list to add people to an organization
 * (`citizens`). The list belongs to no organization, so reading it writes
 * no `house-read` line.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { readWallet } from '../lib/accounts';
import {
  CENSUS_PAGE,
  CENSUS_PROBLEMS,
  cursorOf,
  readCensusCursor,
  readCensusQuery,
} from '../lib/census';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { cents, column, instant, text, type Row, type TillDatabase } from './repository';

/** One person of the list: when they came first and last, what they published, and in how many organizations. */
export interface Citizen {
  readonly wallet: string;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  /** The name they published (cut «Tu nombre y tu cara»); absent, with the avatar, when none. */
  readonly name?: string;
  readonly avatar?: string | null;
  /** How many organizations they are a member or an owner of. */
  readonly organizations: number;
}

export interface CitizensList {
  readonly ok: true;
  readonly people: readonly Citizen[];
  /** How many people match the search, on every page. */
  readonly total: number;
  /** The cursor of the next page, or null on the last one. */
  readonly next: string | null;
}

export type CitizensAnswer = CitizensList | Refusal;

export type SignedInAnswer = { readonly ok: true } | Refusal;

/** The first time stays; the last moves forward, never back. */
const UPSERT_SIGN_IN = `
  INSERT INTO wallet_sign_ins (wallet, first_seen_at, last_seen_at) VALUES (?1, ?2, ?2)
  ON CONFLICT (wallet) DO UPDATE
     SET last_seen_at = max(last_seen_at, excluded.last_seen_at)`;

/**
 * The search ?1 (lowercase; '' for everyone) as text, never a pattern: a
 * piece of the wallet, or of the published name in any (ASCII) case.
 */
const MATCHES = `
  (?1 = '' OR instr(s.wallet, ?1) > 0 OR instr(lower(coalesce(p.name, '')), ?1) > 0)`;

const SELECT_CITIZENS = `
  SELECT s.wallet, s.first_seen_at, s.last_seen_at, p.name, p.avatar,
         (SELECT COUNT(*) FROM team_members AS m WHERE m.wallet = s.wallet) AS organizations
    FROM wallet_sign_ins AS s
    LEFT JOIN wallet_profiles AS p ON p.wallet = s.wallet
   WHERE ${MATCHES}
     AND (?2 IS NULL OR s.last_seen_at < ?2 OR (s.last_seen_at = ?2 AND s.wallet > ?3))
   ORDER BY s.last_seen_at DESC, s.wallet ASC
   LIMIT ?4`;

const COUNT_CITIZENS = `
  SELECT COUNT(*) AS total
    FROM wallet_sign_ins AS s
    LEFT JOIN wallet_profiles AS p ON p.wallet = s.wallet
   WHERE ${MATCHES}`;

/** `AccountDesk.signedIn`: the wallet signed in now. */
export async function recordSignIn(
  db: TillDatabase,
  sentWallet: unknown,
  now: Date,
): Promise<SignedInAnswer> {
  const wallet = readWallet(sentWallet);
  if (wallet === undefined) return refuse(PROBLEMS.wallet);
  await db.prepare(UPSERT_SIGN_IN).bind(wallet, now.toISOString()).run();
  return { ok: true };
}

function citizenOf(row: Row): Citizen {
  const name = column(row, 'name');
  return {
    wallet: text(row, 'wallet'),
    firstSeenAt: instant(row, 'first_seen_at'),
    lastSeenAt: instant(row, 'last_seen_at'),
    ...(name === null
      ? {}
      : {
          name: text(row, 'name'),
          avatar: column(row, 'avatar') === null ? null : text(row, 'avatar'),
        }),
    organizations: cents(row, 'organizations'),
  };
}

/**
 * `AccountDesk.citizens`: everyone who has signed in, newest last time
 * first, a page of 200 at most — to the house alone (`house` true).
 */
export async function citizens(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentQuery: unknown,
  sentCursor: unknown,
): Promise<CitizensAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const query = readCensusQuery(sentQuery);
  const cursor = readCensusCursor(sentCursor);
  if (wallet === undefined || house === undefined || query === undefined || cursor === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(query === undefined ? [CENSUS_PROBLEMS.query] : []),
      ...(cursor === undefined ? [CENSUS_PROBLEMS.cursor] : []),
    );
  }
  if (!house) return refuse(CENSUS_PROBLEMS.notHouse);
  const search = query.toLowerCase();
  const [page, counted] = await db.batch<Row>([
    db
      .prepare(SELECT_CITIZENS)
      .bind(search, cursor?.lastSeenAt ?? null, cursor?.wallet ?? null, CENSUS_PAGE + 1),
    db.prepare(COUNT_CITIZENS).bind(search),
  ]);
  const rows = page?.results ?? [];
  const people = rows.slice(0, CENSUS_PAGE).map(citizenOf);
  const last = people.at(-1);
  return {
    ok: true,
    people,
    total: cents(counted?.results[0] ?? {}, 'total'),
    next: rows.length > CENSUS_PAGE && last !== undefined ? cursorOf(last) : null,
  };
}
