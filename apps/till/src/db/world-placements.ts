/**
 * Which organization a world belongs to (cut «Mundos ↔ organizaciones»,
 * 2026-10-16), in migration 0008's `world_placements`: one organization per
 * world, placed by the house alone; the organization that pays a world is the
 * one that administers it. Worlds live in the fleet, so a placement holds the
 * fleet's world id and no more — it is not the billing table `worlds`.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw. Placing belongs to no
 * organization's log, so it writes no `house-read` line; the placement log
 * keeps every change instead.
 */

import { readAccountId, readWallet } from '../lib/accounts';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { PLACEMENT_PROBLEMS, readWorldId, readWorldIds } from '../lib/world-placements';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { cents, instant, text, type Row, type TillDatabase } from './repository';

/** Where one world stands: its organization, by name, and since when. */
interface Home {
  readonly worldId: string;
  readonly accountId: string;
  readonly accountName: string;
  readonly placedAt: string;
}

export type PlaceAnswer = { readonly ok: true; readonly placed: number } | Refusal;

export type PlacementsAnswer = { readonly ok: true; readonly homes: readonly Home[] } | Refusal;

export type WorldsOfAnswer =
  | {
      readonly ok: true;
      readonly worlds: readonly { readonly worldId: string; readonly accountId: string }[];
    }
  | Refusal;

export type HomeOfAnswer =
  | {
      readonly ok: true;
      readonly home: {
        readonly accountId: string;
        readonly accountName: string;
        readonly placedAt: string;
      } | null;
      /** The caller is a member or owner of the home organization, or the house. */
      readonly manage: boolean;
    }
  | Refusal;

const TEAM_EXISTS = 'SELECT 1 AS found FROM team_profiles WHERE account_id = ?1';

/** The line is written only when the world is not already where it is sent; it records where it left. */
const LOG_PLACEMENT = `
  INSERT INTO world_placement_log (world_id, account_id, from_account_id, placed_by, placed_at)
  SELECT ?1, ?2, (SELECT account_id FROM world_placements WHERE world_id = ?1), ?3, ?4
   WHERE NOT EXISTS (SELECT 1 FROM world_placements WHERE world_id = ?1 AND account_id = ?2)`;

const UPSERT_PLACEMENT = `
  INSERT INTO world_placements (world_id, account_id, placed_by, placed_at) VALUES (?1, ?2, ?3, ?4)
  ON CONFLICT (world_id) DO UPDATE
     SET account_id = excluded.account_id, placed_by = excluded.placed_by,
         placed_at = excluded.placed_at
   WHERE world_placements.account_id <> excluded.account_id`;

const SELECT_HOMES = `
  SELECT p.world_id, p.account_id, t.name, p.placed_at
    FROM world_placements AS p
    JOIN team_profiles AS t ON t.account_id = p.account_id
   ORDER BY p.world_id`;

const IS_MEMBER = 'SELECT 1 AS found FROM team_members WHERE account_id = ?1 AND wallet = ?2';

const SELECT_WORLDS_OF =
  'SELECT world_id, account_id FROM world_placements WHERE account_id = ?1 ORDER BY world_id';

const SELECT_HOME = `
  SELECT p.account_id, t.name, p.placed_at,
         EXISTS (SELECT 1 FROM team_members AS m
                  WHERE m.account_id = p.account_id AND m.wallet = ?2) AS member
    FROM world_placements AS p
    JOIN team_profiles AS t ON t.account_id = p.account_id
   WHERE p.world_id = ?1`;

async function teamExists(db: TillDatabase, accountId: string): Promise<boolean> {
  const found = await db.prepare(TEAM_EXISTS).bind(accountId).first<Row>();
  return found !== null;
}

/** `AccountDesk.placeWorld`: the house places 1 to 50 worlds in one organization. */
export async function placeWorld(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentWorlds: unknown,
  sentAccount: unknown,
  now: Date,
): Promise<PlaceAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const worlds = readWorldIds(sentWorlds);
  const accountId = readAccountId(sentAccount);
  if (
    wallet === undefined ||
    house === undefined ||
    worlds === undefined ||
    accountId === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(worlds === undefined ? [PLACEMENT_PROBLEMS.worlds] : []),
      ...(accountId === undefined ? [PLACEMENT_PROBLEMS.account] : []),
    );
  }
  if (!house) return refuse(PLACEMENT_PROBLEMS.notHouse);
  if (!(await teamExists(db, accountId))) return refuse(PLACEMENT_PROBLEMS.noAccount);
  const at = now.toISOString();
  await db.batch(
    worlds.flatMap((worldId) => [
      db.prepare(LOG_PLACEMENT).bind(worldId, accountId, wallet, at),
      db.prepare(UPSERT_PLACEMENT).bind(worldId, accountId, wallet, at),
    ]),
  );
  return { ok: true, placed: worlds.length };
}

/** `AccountDesk.placements`: where every placed world stands, to the house alone. */
export async function placements(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
): Promise<PlacementsAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  if (wallet === undefined || house === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  if (!house) return refuse(PLACEMENT_PROBLEMS.notHouse);
  const { results } = await db.prepare(SELECT_HOMES).all<Row>();
  return {
    ok: true,
    homes: results.map((row) => ({
      worldId: text(row, 'world_id'),
      accountId: text(row, 'account_id'),
      accountName: text(row, 'name'),
      placedAt: instant(row, 'placed_at'),
    })),
  };
}

/** `AccountDesk.worldsOf`: the worlds placed in one organization, to its members and the house. */
export async function worldsOf(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentAccount: unknown,
): Promise<WorldsOfAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const accountId = readAccountId(sentAccount);
  if (wallet === undefined || house === undefined || accountId === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(accountId === undefined ? [PLACEMENT_PROBLEMS.account] : []),
    );
  }
  if (house) {
    if (!(await teamExists(db, accountId))) return refuse(PLACEMENT_PROBLEMS.noAccount);
  } else if ((await db.prepare(IS_MEMBER).bind(accountId, wallet).first<Row>()) === null) {
    return refuse(PLACEMENT_PROBLEMS.notMember);
  }
  const { results } = await db.prepare(SELECT_WORLDS_OF).bind(accountId).all<Row>();
  return {
    ok: true,
    worlds: results.map((row) => ({
      worldId: text(row, 'world_id'),
      accountId: text(row, 'account_id'),
    })),
  };
}

/**
 * `AccountDesk.homeOf`: the organization one world belongs to — public, the
 * name of an organization is not a secret of its members — and whether the
 * caller (a wallet, or nobody) may see the management part: a member, an
 * owner, or the house.
 */
export async function homeOf(
  db: TillDatabase,
  sentWorld: unknown,
  sentWallet: unknown,
  sentHouse: unknown,
): Promise<HomeOfAnswer> {
  const worldId = readWorldId(sentWorld);
  const anonymous = sentWallet === undefined || sentWallet === null;
  const wallet = anonymous ? null : readWallet(sentWallet);
  const house = sentHouse === null ? false : readHouse(sentHouse);
  if (worldId === undefined || wallet === undefined || house === undefined) {
    return refuse(
      ...(worldId === undefined ? [PLACEMENT_PROBLEMS.world] : []),
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  const row = await db.prepare(SELECT_HOME).bind(worldId, wallet).first<Row>();
  if (row === null) return { ok: true, home: null, manage: house };
  return {
    ok: true,
    home: {
      accountId: text(row, 'account_id'),
      accountName: text(row, 'name'),
      placedAt: instant(row, 'placed_at'),
    },
    manage: house || cents(row, 'member') === 1,
  };
}
