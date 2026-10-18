/**
 * A world's own display name (card t_a856c570, 2026-10-18): the pure rules,
 * migration 0017 on the D1 shim, and the account desk as numinia.com's
 * binding calls it. One describe per rule or per door.
 */

import { describe, expect, it } from 'vitest';
import type { RenameAnswer, WorldNamesAnswer } from '../src/db/world-names';
import { PROBLEMS } from '../src/db/accounts';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { NAME_PROBLEMS, WORLD_NAME_MAX, readWorldName } from '../src/lib/world-names';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

const renamedOf = (answer: RenameAnswer): { worldId: string; name: string } => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return { worldId: answer.worldId, name: answer.name };
};

const namesOf = (answer: WorldNamesAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.names;
};

const count = (sqlite: Shim['sqlite'], table: string): number =>
  Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']);

describe('the rules of a world name', () => {
  it('reads 1 to 80 characters, trimmed, with no control character', () => {
    expect(WORLD_NAME_MAX).toBe(80);
    expect(readWorldName('Agora Plaza')).toBe('Agora Plaza');
    expect(readWorldName('a'.repeat(80))).toBe('a'.repeat(80));
    for (const value of [
      '',
      'a'.repeat(81),
      ' leading',
      'trailing ',
      'a\tb',
      'a\nb',
      7,
      null,
      undefined,
      {},
    ]) {
      expect(readWorldName(value), JSON.stringify(value)).toBeUndefined();
    }
  });

  it('words its refusals plainly', () => {
    expect(NAME_PROBLEMS).toEqual({
      notHouse: 'only the house renames a world',
      world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
      name: 'name must be 1 to 80 characters, with no leading or trailing blank',
    });
  });
});

describe('migration 0017: one name per world, the house alone writes it', () => {
  it('is a STRICT table with the world id as its key', () => {
    const { sqlite } = migratedTill();
    expect(
      sqlite
        .prepare(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('world_names') ORDER BY cid`,
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { name: 'world_id', type: 'TEXT', notnull: 1, pk: 1 },
      { name: 'name', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'renamed_by', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'renamed_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
  });

  it('refuses at the database an id, a name or a wallet out of shape', () => {
    const { sqlite } = migratedTill();
    const insert = (id: string, name: string, by = HOUSE): void => {
      sqlite
        .prepare(
          'INSERT INTO world_names (world_id, name, renamed_by, renamed_at) VALUES (?, ?, ?, ?)',
        )
        .run(id, name, by, '2026-10-18T09:30:00.000Z');
    };
    expect(() => insert('Reset', 'Reset')).toThrow(/CHECK constraint failed/);
    expect(() => insert('reset', '')).toThrow(/CHECK constraint failed/);
    expect(() => insert('reset', ' padded ')).toThrow(/CHECK constraint failed/);
    expect(() => insert('reset', 'ok', 'nobody')).toThrow(/CHECK constraint failed/);
    expect(count(sqlite, 'world_names')).toBe(0);
  });
});

describe('the account desk: renaming a world', () => {
  it('renames a world for the house alone, and renaming again replaces it', async () => {
    const { desk, sqlite } = scene();
    expect(renamedOf(await desk.renameWorld(HOUSE, true, 'reset', 'La Reserva'))).toEqual({
      worldId: 'reset',
      name: 'La Reserva',
    });
    expect(
      sqlite
        .prepare('SELECT world_id, name, renamed_by FROM world_names')
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ world_id: 'reset', name: 'La Reserva', renamed_by: HOUSE }]);
    renamedOf(await desk.renameWorld(HOUSE, true, 'reset', 'La Reserva Nueva'));
    expect(count(sqlite, 'world_names')).toBe(1);
    expect(namesOf(await desk.worldNames(HOUSE, true))[0]?.name).toBe('La Reserva Nueva');
  });

  it('refuses anyone who is not the house, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    const notHouse = { ok: false, problems: [NAME_PROBLEMS.notHouse] };
    expect(await desk.renameWorld(PABLO, undefined, 'reset', 'x')).toEqual(notHouse);
    expect(await desk.renameWorld(PABLO, false, 'reset', 'x')).toEqual(notHouse);
    expect(count(sqlite, 'world_names')).toBe(0);
  });

  it('answers a bad argument in words', async () => {
    const { desk } = scene();
    expect(await desk.renameWorld('nobody', 'yes', 'Reset', ' ')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house, NAME_PROBLEMS.world, NAME_PROBLEMS.name],
    });
  });
});

describe('the account desk: every renamed world (the house)', () => {
  it('lists every rename, by world, newest write winning per id', async () => {
    const { desk } = scene();
    renamedOf(await desk.renameWorld(HOUSE, true, 'reset', 'La Reserva'));
    renamedOf(await desk.renameWorld(HOUSE, true, 'ai', 'Inferencia Activa'));
    expect(namesOf(await desk.worldNames(HOUSE, true)).map((n) => n.worldId)).toEqual([
      'ai',
      'reset',
    ]);
  });

  it('answers an empty list before any rename, and refuses everyone but the house', async () => {
    const { desk } = scene();
    expect(await desk.worldNames(HOUSE, true)).toEqual({ ok: true, names: [] });
    const notHouse = { ok: false, problems: [NAME_PROBLEMS.notHouse] };
    expect(await desk.worldNames(PABLO)).toEqual(notHouse);
    expect(await desk.worldNames(PABLO, false)).toEqual(notHouse);
    expect(await desk.worldNames('nobody', 1)).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house],
    });
  });
});
