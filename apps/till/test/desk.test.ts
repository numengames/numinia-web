import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { checkDraft, readDesk, scheduleDraft } from '../src/db/desk';
import { loadCloseInput, runClose, type TillDatabase } from '../src/db/repository';
import { SEED_TARIFF, type DeskDraft } from '../src/lib/tariff';
import { FakeMeter, NoMeter } from '../src/meter';
import { migratedTill } from './sqlite-d1';

/** Noon UTC on 13 October 2026, the day the till went live. */
const NOW = new Date('2026-10-13T12:00:00.000Z');
/** A wallet as numinia.com's session holds it: 0x and 40 lowercase hex digits. */
const ORACLE = `0x42e6${'a'.repeat(32)}ca26`;

const BY_PROBLEM = 'by must be a lowercase 0x wallet';
const MEANWHILE = 'another version was published meanwhile: read the desk again';
const DRAFT_PROBLEM = 'a draft must be an object of startsOn, sizes, rules and basis';
const BASIS_PROBLEM =
  'basis must be a note of at most 500 characters and an object of assumptions, 16 KB in all';
const RISE_PROBLEM = "a rise needs 30 days' notice: it starts on 2026-11-12 at the earliest";

/** Small, medium and large added to the seed's 2g, kept at 60/5 (the SPEC's example). */
const THREE_SIZES = {
  '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 },
  small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 },
  medium: { runningCentsPerDay: 75, stoppedCentsPerDay: 5 },
  large: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 },
};
const DEARER_2G = { ...THREE_SIZES, '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } };

function draft(overrides: Partial<DeskDraft> = {}): DeskDraft {
  return {
    startsOn: '2026-10-14',
    sizes: THREE_SIZES,
    rules: SEED_TARIFF.rules,
    basis: null,
    ...overrides,
  };
}

function versionRows(sqlite: DatabaseSync): Record<string, unknown>[] {
  return sqlite
    .prepare('SELECT * FROM tariff_versions ORDER BY id')
    .all()
    .map((row) => ({ ...row }));
}

/** An account and its worlds, with one charged day per (world, day, size). */
function chargedScene(days: readonly [string, string, string][]): ReturnType<typeof migratedTill> {
  const shim = migratedTill();
  shim.sqlite.exec(`
    INSERT INTO accounts (id, kind, created_at) VALUES ('acc', 'team', '2026-09-01T08:00:00.000Z');
    INSERT INTO worlds (id, account_id, first_seen_on)
      VALUES ('w-a', 'acc', '2026-09-01'), ('w-b', 'acc', '2026-09-01');
  `);
  const charge = shim.sqlite.prepare(
    `INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, world_id, machine, day,
                               minutes_running, minutes_stopped, size, tariff_version_id)
     VALUES (?, 'acc', 'world_day', -60, '2026-11-01T00:30:00.000Z', ?, 'vps-3-a', ?, 1440, 0, ?, 1)`,
  );
  for (const [worldId, day, size] of days) charge.run(`L-${worldId}-${day}`, worldId, day, size);
  return shim;
}

describe('reading the desk (MIS-184)', () => {
  it('shows every version, the one in force on the till’s date, and no size charged yet', async () => {
    const { db } = migratedTill();
    expect(await readDesk(db, NOW)).toEqual({
      today: '2026-10-13',
      inForceId: 1,
      versions: [SEED_TARIFF],
      sizesInUse: [],
    });
    // The UTC day before the seed starts, nothing is in force.
    expect(await readDesk(db, new Date('2026-10-12T23:59:59.999Z'))).toMatchObject({
      today: '2026-10-12',
      inForceId: null,
    });
  });

  it('lists the sizes charged to worlds in the close’s 35 days, each once, sorted', async () => {
    // On 1 November the window starts on 27 September.
    const { db } = chargedScene([
      ['w-a', '2026-10-31', 'medium'],
      ['w-a', '2026-10-20', '2g'],
      ['w-b', '2026-10-20', 'medium'],
      ['w-b', '2026-09-27', 'large'],
      ['w-a', '2026-09-26', 'retired'],
    ]);
    const today = new Date('2026-11-01T12:00:00.000Z');
    expect((await readDesk(db, today)).sizesInUse).toEqual(['2g', 'large', 'medium']);
    // A draft that stops pricing one of them is refused.
    const withoutLarge = draft({ startsOn: '2026-11-02', sizes: { '2g': THREE_SIZES['2g'] } });
    expect((await checkDraft(db, withoutLarge, today)).problems).toEqual([
      'size large is still charged to worlds: a version must keep pricing it',
      'size medium is still charged to worlds: a version must keep pricing it',
    ]);
    // Once the window has passed them, they may go.
    expect((await readDesk(db, new Date('2026-12-07T00:00:00.000Z'))).sizesInUse).toEqual([]);
  });
});

describe('checking a draft (MIS-184)', () => {
  it('answers as draftCheck on the till’s date and state, and writes nothing', async () => {
    const { db, sqlite } = migratedTill();
    const before = versionRows(sqlite);
    expect(await checkDraft(db, draft(), NOW)).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: 1,
      isRise: false,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: [],
    });
    expect(await checkDraft(db, draft({ sizes: DEARER_2G }), NOW)).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: 1,
      isRise: true,
      noticeDays: 30,
      earliestStart: '2026-11-12',
      problems: [RISE_PROBLEM],
    });
    // A new size, however dear, is a new product, not a rise.
    const xl = { ...SEED_TARIFF.sizes, xl: { runningCentsPerDay: 999, stoppedCentsPerDay: 99 } };
    expect(await checkDraft(db, draft({ sizes: xl }), NOW)).toMatchObject({
      isRise: false,
      problems: [],
    });
    expect(versionRows(sqlite)).toEqual(before);
  });

  it('answers what is not a draft with its problems, no version replaced and no rise', async () => {
    const { db } = migratedTill();
    expect(await checkDraft(db, 'a draft', NOW)).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: null,
      isRise: false,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: [DRAFT_PROBLEM],
    });
    expect(await checkDraft(db, { ...draft(), sizes: DEARER_2G, startsOn: 'soon' }, NOW)).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: null,
      isRise: false,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: ['startsOn must be a YYYY-MM-DD day'],
    });
  });
});

describe('scheduling a draft (MIS-184)', () => {
  it('writes the next version with the till’s instant, the wallet and why, and leaves the seed as it was', async () => {
    const { db, sqlite } = migratedTill();
    const seedRow = versionRows(sqlite);
    const basis = {
      note: 'Tres tamaños por personas a la vez (ADR-070)',
      assumptions: {
        machine: 'VPS-3',
        occupancy: 0.5,
        copies: 'full',
        fleet: { small: 20, medium: 10, large: 3 },
        extras: [0, null, true, 'ñ'],
      },
    };
    const v2 = {
      id: 2,
      startsOn: '2026-10-14',
      createdAt: '2026-10-13T12:00:00.000Z',
      createdBy: ORACLE,
      sizes: THREE_SIZES,
      rules: SEED_TARIFF.rules,
      basis,
    };
    expect(await scheduleDraft(db, draft({ basis }), ORACLE, NOW)).toEqual({
      ok: true,
      version: v2,
    });
    expect(versionRows(sqlite)).toEqual([
      ...seedRow,
      {
        id: 2,
        starts_on: '2026-10-14',
        created_at: '2026-10-13T12:00:00.000Z',
        created_by: ORACLE,
        sizes: JSON.stringify(THREE_SIZES),
        rules: JSON.stringify(SEED_TARIFF.rules),
        basis: JSON.stringify(basis),
      },
    ]);
    // Read back whole, basis included; the seed stays in force until the new version's day.
    expect(await readDesk(db, NOW)).toEqual({
      today: '2026-10-13',
      inForceId: 1,
      versions: [SEED_TARIFF, v2],
      sizesInUse: [],
    });
    expect((await readDesk(db, new Date('2026-10-14T00:00:00.000Z'))).inForceId).toBe(2);
  });

  it('refuses with every problem in words, writing nothing', async () => {
    const { db, sqlite } = chargedScene([['w-a', '2026-10-12', '2g']]);
    const before = versionRows(sqlite);
    const refusals: [unknown, unknown, string[]][] = [
      [draft(), ORACLE.toUpperCase(), [BY_PROBLEM]],
      [draft(), `0x42E6${'a'.repeat(32)}cA26`, [BY_PROBLEM]],
      [draft(), `${ORACLE}0`, [BY_PROBLEM]],
      [draft(), 'seed: example figures (DBT-026)', [BY_PROBLEM]],
      [draft(), undefined, [BY_PROBLEM]],
      [draft(), 42, [BY_PROBLEM]],
      [
        draft({ startsOn: '2026-10-13' }),
        ORACLE,
        ['a version scheduled on 2026-10-13 starts on 2026-10-14 at the earliest'],
      ],
      [draft({ sizes: DEARER_2G }), ORACLE, [RISE_PROBLEM]],
      [
        draft({ sizes: { small: THREE_SIZES.small } }),
        ORACLE,
        ['size 2g is still charged to worlds: a version must keep pricing it'],
      ],
      [draft({ basis: { note: 'x'.repeat(501) } }), ORACLE, [BASIS_PROBLEM]],
      [{ ...draft(), by: ORACLE }, ORACLE, ['unknown draft keys: by']],
      ['a draft', 'nobody', [DRAFT_PROBLEM, BY_PROBLEM]],
    ];
    for (const [sent, by, problems] of refusals) {
      expect(await scheduleDraft(db, sent, by, NOW)).toEqual({ ok: false, problems });
    }
    expect(versionRows(sqlite)).toEqual(before);
  });

  it('takes a rise on the first day its notice allows, and a cut from tomorrow', async () => {
    const { db, sqlite } = migratedTill();
    expect(
      await scheduleDraft(db, draft({ sizes: DEARER_2G, startsOn: '2026-11-11' }), ORACLE, NOW),
    ).toEqual({ ok: false, problems: [RISE_PROBLEM] });
    expect(
      await scheduleDraft(db, draft({ sizes: DEARER_2G, startsOn: '2026-11-12' }), ORACLE, NOW),
    ).toMatchObject({ ok: true, version: { id: 2, startsOn: '2026-11-12', basis: null } });
    const cut = { '2g': { runningCentsPerDay: 50, stoppedCentsPerDay: 5 } };
    expect(await scheduleDraft(db, draft({ sizes: cut }), ORACLE, NOW)).toMatchObject({
      ok: true,
      version: { id: 3, startsOn: '2026-10-14', sizes: cut },
    });
    expect(versionRows(sqlite).map((row) => [row['id'], row['starts_on'], row['basis']])).toEqual([
      [1, '2026-10-13', null],
      [2, '2026-11-12', null],
      [3, '2026-10-14', null],
    ]);
    // The cut is in force tomorrow; the rise takes over on its own day.
    const view = await readDesk(db, new Date('2026-10-14T00:00:00.000Z'));
    expect(view.inForceId).toBe(3);
    expect((await readDesk(db, new Date('2026-11-12T00:00:00.000Z'))).inForceId).toBe(2);
  });

  it('lets one of two publishes at once win; the other is told to read again', async () => {
    const { db, sqlite } = migratedTill();
    const [first, second] = await Promise.all([
      scheduleDraft(db, draft({ basis: { note: 'first' } }), ORACLE, NOW),
      scheduleDraft(db, draft({ basis: { note: 'second' } }), ORACLE, NOW),
    ]);
    expect(first).toMatchObject({ ok: true, version: { id: 2, basis: { note: 'first' } } });
    expect(second).toEqual({ ok: false, problems: [MEANWHILE] });
    expect(versionRows(sqlite).map((row) => [row['id'], row['basis']])).toEqual([
      [1, null],
      [2, '{"note":"first"}'],
    ]);
  });

  it('writes nothing over a version published between its read and its write, whatever its id', async () => {
    for (const theirs of [2, 9]) {
      const { db, sqlite } = migratedTill();
      const racing: TillDatabase = {
        prepare: (query) => db.prepare(query),
        batch: async <T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> => {
          const answers = await db.batch<T>(statements);
          sqlite
            .prepare(
              `INSERT INTO tariff_versions (id, starts_on, created_at, created_by, sizes, rules)
               VALUES (?, '2026-10-20', '2026-10-13T11:59:59.000Z', 'another desk', ?, ?)`,
            )
            .run(theirs, JSON.stringify(SEED_TARIFF.sizes), JSON.stringify(SEED_TARIFF.rules));
          return answers;
        },
      };
      expect(await scheduleDraft(racing, draft(), ORACLE, NOW)).toEqual({
        ok: false,
        problems: [MEANWHILE],
      });
      expect(versionRows(sqlite).map((row) => [row['id'], row['created_by']])).toEqual([
        [1, 'seed: example figures (DBT-026)'],
        [theirs, 'another desk'],
      ]);
    }
  });

  it('is charged from by the nightly close, which reads the same versions but not their basis', async () => {
    const { db, sqlite } = migratedTill();
    sqlite.exec(`
      INSERT INTO accounts (id, kind, created_at) VALUES ('acc', 'team', '2026-10-13T08:00:00.000Z');
      INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, vat_cents)
        VALUES ('T1', 'acc', 'topup', 1000, '2026-10-13T09:00:00.000Z', 210);
      INSERT INTO worlds (id, account_id, first_seen_on) VALUES ('w-small', 'acc', '2026-10-14');
    `);
    await scheduleDraft(db, draft({ basis: { note: 'three sizes' } }), ORACLE, NOW);
    const night = new Date('2026-10-15T00:30:00.000Z');
    const input = await loadCloseInput(db, new NoMeter(), night);
    expect(input.versions).toEqual(
      (await readDesk(db, night)).versions.map(({ basis: _basis, ...prices }) => prices),
    );
    const meter = new FakeMeter([
      {
        worldId: 'w-small',
        machine: 'vps-3-a',
        day: '2026-10-14',
        size: 'small',
        minutesRunning: 1440,
        minutesStopped: 0,
        endState: 'running',
      },
    ]);
    const run = await runClose(db, meter, night);
    expect(
      run.output.lines.map((line) => [line.day, line.size, line.amountCents, line.tariffVersionId]),
    ).toEqual([['2026-10-14', 'small', -20, 2]]);
    expect((await readDesk(db, night)).sizesInUse).toEqual(['small']);
  });

  it('fails closed on a basis written by hand that is not a note; the close charges on', async () => {
    const { db, sqlite } = migratedTill();
    sqlite.exec(`
      INSERT INTO accounts (id, kind, created_at) VALUES ('acc', 'team', '2026-10-13T08:00:00.000Z');
      INSERT INTO worlds (id, account_id, first_seen_on) VALUES ('w-a', 'acc', '2026-10-14');
    `);
    // An object, so the column's CHECK takes it; not a note, so the desk would never write it.
    sqlite
      .prepare(
        `INSERT INTO tariff_versions (id, starts_on, created_at, created_by, sizes, rules, basis)
         VALUES (2, '2026-10-14', '2026-10-13T12:00:00.000Z', 'by hand', ?, ?, '{"why":"by hand"}')`,
      )
      .run(JSON.stringify(THREE_SIZES), JSON.stringify(SEED_TARIFF.rules));
    const basisFault = /tariff basis: basis must be a note/;
    await expect(readDesk(db, NOW)).rejects.toThrow(basisFault);
    await expect(checkDraft(db, draft(), NOW)).rejects.toThrow(basisFault);
    await expect(scheduleDraft(db, draft(), ORACLE, NOW)).rejects.toThrow(basisFault);
    const meter = new FakeMeter([
      {
        worldId: 'w-a',
        machine: 'vps-3-a',
        day: '2026-10-14',
        size: 'medium',
        minutesRunning: 1440,
        minutesStopped: 0,
        endState: 'running',
      },
    ]);
    const run = await runClose(db, meter, new Date('2026-10-15T00:30:00.000Z'));
    expect(run.output.lines.map((line) => [line.amountCents, line.tariffVersionId])).toEqual([
      [-75, 2],
    ]);
  });

  it('fails when the database answers fewer reads than it was asked', async () => {
    const { db } = migratedTill();
    const short: TillDatabase = {
      prepare: (query) => db.prepare(query),
      batch: async <T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> =>
        (await db.batch<T>(statements)).slice(1),
    };
    await expect(readDesk(short, NOW)).rejects.toThrow(/2 reads, 1 answers/);
  });
});
