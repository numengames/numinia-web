/**
 * The names and avatars people publish (cut «Tu nombre y tu cara»,
 * 2026-10-16; numinia-archive STD-053), in migration 0006's
 * `wallet_profiles`: one's own read, published or replaced, and removed —
 * the row goes, and no history is kept. What the roles view adds to each
 * member comes from here too, and only for an organization's own members.
 *
 * Nothing is written before the person asks (STD-053: «Nobody is shown
 * before choosing»): there is no default name, and nothing else of theirs is
 * copied here. Every argument comes from a browser through numinia.com and
 * is read as untrusted (src/lib/profiles.ts); a refusal is an answer with
 * problems in words, never a throw.
 */

import { readWallet } from '../lib/accounts';
import { readProfileChange, type ProfileChange } from '../lib/profiles';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { column, instant, text, type Row, type TillDatabase } from './repository';

/** A name as its owner published it, with the avatar chosen (or none) and when. */
interface PublishedProfile {
  readonly name: string;
  readonly avatar: string | null;
  readonly updatedAt: string;
}

/** One's own profile, or null while one has published nothing. */
export type ProfileAnswer =
  { readonly ok: true; readonly profile: PublishedProfile | null } | Refusal;

/** What fellow members are shown of a member who published: the name and the avatar. */
interface MemberProfile {
  readonly name: string;
  readonly avatar: string | null;
}

const SELECT_PROFILE = 'SELECT name, avatar, updated_at FROM wallet_profiles WHERE wallet = ?1';

const UPSERT_PROFILE = `
  INSERT INTO wallet_profiles (wallet, name, avatar, updated_at) VALUES (?1, ?2, ?3, ?4)
  ON CONFLICT (wallet) DO UPDATE
     SET name = excluded.name, avatar = excluded.avatar, updated_at = excluded.updated_at`;

const DELETE_PROFILE = 'DELETE FROM wallet_profiles WHERE wallet = ?1';

/** The profiles of the members of the organization ?1, and of nobody else. */
const SELECT_MEMBER_PROFILES = `
  SELECT p.wallet, p.name, p.avatar
    FROM wallet_profiles AS p
    JOIN team_members AS m ON m.wallet = p.wallet
   WHERE m.account_id = ?1`;

function avatarOf(row: Row): string | null {
  return column(row, 'avatar') === null ? null : text(row, 'avatar');
}

function profileOf(row: Row): PublishedProfile {
  return {
    name: text(row, 'name'),
    avatar: avatarOf(row),
    updatedAt: instant(row, 'updated_at'),
  };
}

/** The upsert of a change: the row replaced whole, never a history. */
function upsert(
  db: TillDatabase,
  wallet: string,
  change: ProfileChange,
  now: Date,
): D1PreparedStatement {
  return db.prepare(UPSERT_PROFILE).bind(wallet, change.name, change.avatar, now.toISOString());
}

/** The wallet's own profile, as it stands now, or null. */
async function readOne(db: TillDatabase, wallet: string): Promise<PublishedProfile | null> {
  const row = await db.prepare(SELECT_PROFILE).bind(wallet).first<Row>();
  return row === null ? null : profileOf(row);
}

/** `AccountDesk.profile`: what the wallet published, to the wallet itself. */
export async function profileAnswer(db: TillDatabase, sentWallet: unknown): Promise<ProfileAnswer> {
  const wallet = readWallet(sentWallet);
  if (wallet === undefined) return refuse(PROBLEMS.wallet);
  return { ok: true, profile: await readOne(db, wallet) };
}

/**
 * `AccountDesk.setProfile`: publishes or replaces the wallet's name and
 * avatar (`{ name, avatar }`), or removes them (`null`) — a delete, so
 * nothing of the old name stays. Only the wallet's own row is ever touched:
 * the wallet is the session's, as numinia.com verified it.
 */
export async function changeProfile(
  db: TillDatabase,
  sentWallet: unknown,
  sentChange: unknown,
  now: Date,
): Promise<ProfileAnswer> {
  const wallet = readWallet(sentWallet);
  const change = readProfileChange(sentChange);
  if (wallet === undefined || Array.isArray(change)) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(Array.isArray(change) ? change : []),
    );
  }
  const [, read] = await db.batch<Row>([
    change === null ? db.prepare(DELETE_PROFILE).bind(wallet) : upsert(db, wallet, change, now),
    db.prepare(SELECT_PROFILE).bind(wallet),
  ]);
  const row = read?.results[0];
  return { ok: true, profile: row === undefined ? null : profileOf(row) };
}

/**
 * What the members of the organization `accountId` published, by wallet —
 * for its roles view, which only its members and the house are answered.
 * A member who published nothing is not in the map.
 */
export async function publishedIn(
  db: TillDatabase,
  accountId: string,
): Promise<ReadonlyMap<string, MemberProfile>> {
  const { results } = await db.prepare(SELECT_MEMBER_PROFILES).bind(accountId).all<Row>();
  return new Map(
    results.map((row) => [text(row, 'wallet'), { name: text(row, 'name'), avatar: avatarOf(row) }]),
  );
}

/**
 * The names published by the house's own wallets — the Oracles that answer for
 * an AI as the house (D-078) and are no member of the organization, so
 * `publishedIn` does not reach them. Only the wallets asked for; a wallet that
 * published nothing is not in the map.
 */
export async function publishedBy(
  db: TillDatabase,
  wallets: readonly string[],
): Promise<ReadonlyMap<string, MemberProfile>> {
  const rows = await Promise.all(
    [...new Set(wallets)].map(async (wallet) => [wallet, await readOne(db, wallet)] as const),
  );
  return new Map(
    rows.flatMap(([wallet, profile]) =>
      profile === null ? [] : [[wallet, { name: profile.name, avatar: profile.avatar }] as const],
    ),
  );
}
