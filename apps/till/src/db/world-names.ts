/**
 * A world's own display name (card t_a856c570, 2026-10-18): the house
 * renames an existing world from the Lab's admin UI, in migration 0017's
 * `world_names` — one row per world, replaced on a later rename. Not the
 * fleet's own title (a card's or a world's own page); this is the house's
 * override, read back on every load of the room so the new name survives a
 * reload. Every argument comes from numinia.com and is read as untrusted.
 */

import { readWallet } from '../lib/accounts';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { NAME_PROBLEMS, readWorldName } from '../lib/world-names';
import { readWorldId } from '../lib/world-placements';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { instant, text, type Row, type TillDatabase } from './repository';

/** One world's own name, and since when. */
interface Named {
  readonly worldId: string;
  readonly name: string;
  readonly renamedAt: string;
}

export type RenameAnswer =
  { readonly ok: true; readonly worldId: string; readonly name: string } | Refusal;

export type WorldNamesAnswer = { readonly ok: true; readonly names: readonly Named[] } | Refusal;

const UPSERT_NAME = `
  INSERT INTO world_names (world_id, name, renamed_by, renamed_at) VALUES (?1, ?2, ?3, ?4)
  ON CONFLICT (world_id) DO UPDATE
     SET name = excluded.name, renamed_by = excluded.renamed_by, renamed_at = excluded.renamed_at`;

const SELECT_NAMES = 'SELECT world_id, name, renamed_at FROM world_names ORDER BY world_id';

/** `AccountDesk.renameWorld`: the house renames one existing world; the name persists. */
export async function renameWorld(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentWorld: unknown,
  sentName: unknown,
  now: Date,
): Promise<RenameAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const worldId = readWorldId(sentWorld);
  const name = readWorldName(sentName);
  if (wallet === undefined || house === undefined || worldId === undefined || name === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(worldId === undefined ? [NAME_PROBLEMS.world] : []),
      ...(name === undefined ? [NAME_PROBLEMS.name] : []),
    );
  }
  if (!house) return refuse(NAME_PROBLEMS.notHouse);
  await db.prepare(UPSERT_NAME).bind(worldId, name, wallet, now.toISOString()).run();
  return { ok: true, worldId, name };
}

/** `AccountDesk.worldNames`: every world the house has renamed, to the house alone. */
export async function worldNames(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
): Promise<WorldNamesAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  if (wallet === undefined || house === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  if (!house) return refuse(NAME_PROBLEMS.notHouse);
  const { results } = await db.prepare(SELECT_NAMES).all<Row>();
  return {
    ok: true,
    names: results.map((row) => ({
      worldId: text(row, 'world_id'),
      name: text(row, 'name'),
      renamedAt: instant(row, 'renamed_at'),
    })),
  };
}
