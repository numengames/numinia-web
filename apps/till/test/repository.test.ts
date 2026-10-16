import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import meterFixture from '../fixtures/meter.json';
import {
  loadCloseInput,
  runClose,
  writeCloseOutput,
  type TillDatabase,
} from '../src/db/repository';
import { closeDays, type CloseOutput, type MeterReading } from '../src/lib/close';
import { SEED_TARIFF, scheduleProblems, type TariffVersion } from '../src/lib/tariff';
import { MINUTES_PER_DAY, addDays, daysFrom } from '../src/lib/utc-day';
import { FakeMeter, NoMeter, parseMeterReadings } from '../src/meter';
import { D1_LIMITS, limitsEnforced, migratedTill, migrationFiles, sqliteD1 } from './sqlite-d1';

const CREATED = '2026-10-13T08:00:00.000Z';

function addAccount(sqlite: DatabaseSync, id: string, kind = 'team'): void {
  sqlite
    .prepare('INSERT INTO accounts (id, kind, created_at) VALUES (?, ?, ?)')
    .run(id, kind, CREATED);
}

function addWorld(sqlite: DatabaseSync, id: string, accountId: string, firstSeenOn: string): void {
  sqlite
    .prepare('INSERT INTO worlds (id, account_id, first_seen_on) VALUES (?, ?, ?)')
    .run(id, accountId, firstSeenOn);
}

function addTopup(
  sqlite: DatabaseSync,
  id: string,
  accountId: string,
  amountCents: number,
  at: string,
): number {
  const outcome = sqlite
    .prepare(
      `INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, vat_cents, stripe_payment_id, stripe_invoice_id)
       VALUES (?, ?, 'topup', ?, ?, ?, ?, ?)`,
    )
    .run(id, accountId, amountCents, at, Math.round(amountCents * 0.21), `pi_${id}`, `in_${id}`);
  return Number(outcome.changes);
}

const INSERT_DAY = `INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, world_id, machine, day,
  minutes_running, minutes_stopped, size, tariff_version_id)
  VALUES (?, ?, 'world_day', ?, '2026-10-27T00:30:00.000Z', ?, 'vps-2-a', ?, 1440, 0, '2g', 1)`;

function rows(sqlite: DatabaseSync, sql: string): Record<string, unknown>[] {
  return sqlite
    .prepare(sql)
    .all()
    .map((row) => ({ ...row }));
}

function snapshot(sqlite: DatabaseSync): Record<string, Record<string, unknown>[]> {
  return {
    lines: rows(sqlite, 'SELECT * FROM ledger_lines ORDER BY at, id'),
    periods: rows(sqlite, 'SELECT * FROM at_zero_periods ORDER BY account_id, started_at'),
    marks: rows(sqlite, 'SELECT * FROM keep_marks ORDER BY world_id'),
    reports: rows(sqlite, 'SELECT * FROM close_reports ORDER BY world_id, day, reason'),
  };
}

function balance(sqlite: DatabaseSync, accountId: string): number {
  const row = sqlite
    .prepare('SELECT SUM(amount_cents) AS cents FROM ledger_lines WHERE account_id = ?')
    .get(accountId);
  return Number(row?.['cents']);
}

/** 00:30 UTC on `today`: the firing that closes the day before. */
function nightOf(today: string): Date {
  return new Date(`${today}T00:30:00.000Z`);
}

function reading(
  worldId: string,
  day: string,
  minutesRunning: number,
  minutesStopped: number,
): MeterReading {
  return {
    worldId,
    machine: 'vps-2-a',
    day,
    size: '2g',
    minutesRunning,
    minutesStopped,
    endState: minutesStopped === 0 ? 'running' : 'stopped',
  };
}

/** Two accounts with a 10 € top-up each and the fixture's two worlds, first seen on 24 October 2026. */
function fleetScene(): ReturnType<typeof migratedTill> {
  const shim = migratedTill();
  addAccount(shim.sqlite, 'acc-lumen', 'team');
  addAccount(shim.sqlite, 'acc-leo', 'personal');
  addTopup(shim.sqlite, 'T-lumen', 'acc-lumen', 1000, '2026-10-20T10:00:00.000Z');
  addTopup(shim.sqlite, 'T-leo', 'acc-leo', 1000, '2026-10-20T11:00:00.000Z');
  addWorld(shim.sqlite, 'w-lumen-plaza', 'acc-lumen', '2026-10-24');
  addWorld(shim.sqlite, 'w-leo-friends', 'acc-leo', '2026-10-24');
  return shim;
}

const fixtureMeter = (): FakeMeter => new FakeMeter(parseMeterReadings(meterFixture));

describe('the migration', () => {
  it('builds STRICT tables and seeds the tariff the code knows', async () => {
    expect(migrationFiles()).toEqual([
      '0001_ledger.sql',
      '0002_tariff_basis.sql',
      '0003_accounts_and_checkouts.sql',
      '0004_organization_roles.sql',
      '0005_role_log_acts.sql',
      '0006_wallet_profiles.sql',
      '0007_wallet_sign_ins.sql',
      '0008_world_placements.sql',
      '0009_numen_games_roles.sql',
      '0010_organization_settings.sql',
    ]);
    const { db, sqlite } = migratedTill();
    const tables = rows(
      sqlite,
      "SELECT name, strict FROM pragma_table_list WHERE schema = 'main' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables).toEqual(
      [
        'account_wallets',
        'accounts',
        'at_zero_periods',
        'checkouts',
        'close_reports',
        'keep_marks',
        'ledger_lines',
        'organization_settings',
        'stripe_cursor',
        'tariff_versions',
        'team_log',
        'team_member_roles',
        'team_members',
        'team_profiles',
        'team_roles',
        'wallet_profiles',
        'wallet_sign_ins',
        'world_placement_log',
        'world_placements',
        'worlds',
      ].map((name) => ({ name, strict: 1 })),
    );
    const input = await loadCloseInput(db, new NoMeter(), nightOf('2026-10-14'));
    // The close charges from prices and rules: it does not read why a version was published.
    const { basis: _basis, ...seedPrices } = SEED_TARIFF;
    expect(input.versions).toEqual([seedPrices]);
    expect(input.versions[0]).not.toHaveProperty('basis');
  });

  it('holds no LIKE or GLOB pattern, which D1 caps at 50 bytes', () => {
    const { sqlite } = migratedTill();
    const schema = rows(sqlite, 'SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL').map((row) =>
      String(row['sql']),
    );
    expect(schema.length).toBeGreaterThan(10);
    expect(schema.filter((sql) => /\b(GLOB|LIKE)\b/i.test(sql))).toEqual([]);
  });

  it('adds why a version was published (0002): NULL, or a JSON object of 16384 characters at most', () => {
    const { sqlite } = migratedTill();
    expect(
      rows(
        sqlite,
        `SELECT name, type, "notnull" FROM pragma_table_info('tariff_versions') WHERE name = 'basis'`,
      ),
    ).toEqual([{ name: 'basis', type: 'TEXT', notnull: 0 }]);
    expect(rows(sqlite, 'SELECT id, basis FROM tariff_versions')).toEqual([{ id: 1, basis: null }]);
    const insert = (id: number, basis: string | null): void => {
      sqlite
        .prepare(
          `INSERT INTO tariff_versions (id, starts_on, created_at, created_by, sizes, rules, basis)
           VALUES (?, '2026-10-20', '2026-10-13T12:00:00.000Z', 'oracle', ?, ?, ?)`,
        )
        .run(id, JSON.stringify(SEED_TARIFF.sizes), JSON.stringify(SEED_TARIFF.rules), basis);
    };
    // `{"note":"` and `"}` take 11 characters: this basis has exactly 16384.
    const longest = `{"note":"${'é'.repeat(16384 - 11)}"}`;
    insert(2, null);
    insert(3, '{"note":"three sizes","assumptions":{"occupancy":0.5}}');
    insert(4, longest);
    for (const refused of [
      '["a note"]',
      '"a note"',
      'a note',
      '{"note":',
      longest.replace('é', 'éé'),
    ]) {
      expect(() => insert(5, refused)).toThrow(/CHECK constraint failed/);
    }
    expect(() =>
      sqlite
        .prepare(`UPDATE tariff_versions SET basis = '{"note":"rewritten"}' WHERE id = 1`)
        .run(),
    ).toThrow('append-only');
    expect(rows(sqlite, 'SELECT id, length(basis) AS characters FROM tariff_versions')).toEqual([
      { id: 1, characters: null },
      { id: 2, characters: null },
      { id: 3, characters: 54 },
      { id: 4, characters: 16384 },
    ]);
  });

  it.skipIf(!limitsEnforced)('runs, like every test here, under D1’s limits', () => {
    const { sqlite } = sqliteD1();
    expect(sqlite.limits.likePatternLength).toBe(D1_LIMITS.likePatternLength);
    expect(sqlite.limits.variableNumber).toBe(D1_LIMITS.variableNumber);
    const pattern = '[0-9]'.repeat(11);
    expect(() => sqlite.prepare(`SELECT '1' GLOB '${pattern}' AS ok`).get()).toThrow(
      /pattern too complex/,
    );
  });
});

describe('append-only, enforced by the database (MIS-177)', () => {
  it('refuses to change or delete a ledger line, through D1 too', async () => {
    const { db, sqlite } = migratedTill();
    addAccount(sqlite, 'acc');
    addTopup(sqlite, 'T1', 'acc', 1000, '2026-10-20T10:00:00.000Z');
    const before = snapshot(sqlite);
    expect(() =>
      sqlite.prepare("UPDATE ledger_lines SET amount_cents = 1 WHERE id = 'T1'").run(),
    ).toThrow('append-only');
    expect(() => sqlite.prepare("DELETE FROM ledger_lines WHERE id = 'T1'").run()).toThrow(
      'append-only',
    );
    await expect(db.prepare('DELETE FROM ledger_lines').run()).rejects.toThrow('append-only');
    await expect(
      db.prepare("UPDATE ledger_lines SET at = '2026-10-21T10:00:00.000Z'").run(),
    ).rejects.toThrow('append-only');
    expect(snapshot(sqlite)).toEqual(before);
  });

  it('refuses to change or delete a tariff version', () => {
    const { sqlite } = migratedTill();
    expect(() =>
      sqlite.prepare("UPDATE tariff_versions SET starts_on = '2026-01-01'").run(),
    ).toThrow('append-only');
    expect(() => sqlite.prepare('DELETE FROM tariff_versions').run()).toThrow('append-only');
    expect(rows(sqlite, 'SELECT id, starts_on FROM tariff_versions')).toEqual([
      { id: 1, starts_on: '2026-10-13' },
    ]);
  });

  it('lets no REPLACE overwrite a line: an insert that collides with one is dropped', () => {
    const { sqlite } = migratedTill();
    addAccount(sqlite, 'acc');
    addWorld(sqlite, 'w-a', 'acc', '2026-10-24');
    addTopup(sqlite, 'T1', 'acc', 1000, '2026-10-20T10:00:00.000Z');
    sqlite.prepare(INSERT_DAY).run('D1', 'acc', -60, 'w-a', '2026-10-25');
    const before = snapshot(sqlite);
    const replace = (sql: string, ...values: (string | number)[]): number =>
      Number(sqlite.prepare(sql).run(...values).changes);
    // Same id, other amount.
    expect(
      replace(
        INSERT_DAY.replace('INSERT', 'INSERT OR REPLACE'),
        'D1',
        'acc',
        -1,
        'w-a',
        '2026-10-26',
      ),
    ).toBe(0);
    // Same world and day, other id.
    expect(
      replace(
        INSERT_DAY.replace('INSERT', 'INSERT OR REPLACE'),
        'D2',
        'acc',
        -1,
        'w-a',
        '2026-10-25',
      ),
    ).toBe(0);
    // Same Stripe payment, other line.
    expect(
      replace(
        `INSERT OR REPLACE INTO ledger_lines (id, account_id, kind, amount_cents, at, vat_cents, stripe_payment_id)
         VALUES ('T2', 'acc', 'topup', 5, '2026-10-21T10:00:00.000Z', 1, 'pi_T1')`,
      ),
    ).toBe(0);
    expect(addTopup(sqlite, 'T1', 'acc', 9999, '2026-10-22T10:00:00.000Z')).toBe(0);
    expect(snapshot(sqlite)).toEqual(before);
  });

  it('refuses a REPLACE of a tariff version, and a version id that does not grow', () => {
    const { sqlite } = migratedTill();
    const insert = (id: number | null, startsOn: string): void => {
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO tariff_versions (id, starts_on, created_at, created_by, sizes, rules)
           VALUES (?, ?, '2026-10-20T10:00:00.000Z', 'oracle:pablo', ?, ?)`,
        )
        .run(id, startsOn, JSON.stringify(SEED_TARIFF.sizes), JSON.stringify(SEED_TARIFF.rules));
    };
    expect(() => insert(1, '2026-12-01')).toThrow('append-only');
    insert(3, '2026-12-01');
    expect(() => insert(2, '2026-12-01')).toThrow('tariff version ids only grow');
    insert(null, '2026-12-01');
    expect(rows(sqlite, 'SELECT id FROM tariff_versions ORDER BY id')).toEqual([
      { id: 1 },
      { id: 3 },
      { id: 4 },
    ]);
  });

  it('takes a correction as a new line that names the line it corrects', () => {
    const { sqlite } = migratedTill();
    addAccount(sqlite, 'acc');
    addAccount(sqlite, 'acc-other');
    addWorld(sqlite, 'w-a', 'acc', '2026-10-24');
    sqlite.prepare(INSERT_DAY).run('D1', 'acc', -60, 'w-a', '2026-10-25');
    const correct = sqlite.prepare(
      `INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, "by", reason, corrects_line_id)
       VALUES (?, ?, 'adjustment', ?, '2026-10-27T09:00:00.000Z', 'oracle:pablo', 'the machine counted a day twice', ?)`,
    );
    correct.run('C1', 'acc', 60, 'D1');
    expect(
      rows(sqlite, 'SELECT id, amount_cents, corrects_line_id FROM ledger_lines ORDER BY id'),
    ).toEqual([
      { id: 'C1', amount_cents: 60, corrects_line_id: 'D1' },
      { id: 'D1', amount_cents: -60, corrects_line_id: null },
    ]);
    expect(() => correct.run('C2', 'acc-other', 60, 'D1')).toThrow(
      'a correction names a line of its own account',
    );
    expect(balance(sqlite, 'acc')).toBe(0);
  });
});

describe('what a line may be', () => {
  const scene = (): DatabaseSync => {
    const { sqlite } = migratedTill();
    addAccount(sqlite, 'acc');
    addAccount(sqlite, 'acc-other');
    addWorld(sqlite, 'w-a', 'acc', '2026-10-24');
    addTopup(sqlite, 'T1', 'acc', 1000, '2026-10-20T10:00:00.000Z');
    addTopup(sqlite, 'T-other', 'acc-other', 1000, '2026-10-20T10:00:00.000Z');
    sqlite.prepare(INSERT_DAY).run('D1', 'acc', -60, 'w-a', '2026-10-25');
    return sqlite;
  };
  const line = (columns: Record<string, string | number | null>): string => {
    const all = { id: 'X', account_id: 'acc', at: '2026-10-27T09:00:00.000Z', ...columns };
    const names = Object.keys(all).map((name) => (name === 'by' ? '"by"' : name));
    const values = Object.values(all).map((value) =>
      value === null ? 'NULL' : typeof value === 'number' ? String(value) : `'${value}'`,
    );
    return `INSERT INTO ledger_lines (${names.join(', ')}) VALUES (${values.join(', ')})`;
  };

  it.each([
    [
      'cents that are not whole',
      line({ kind: 'topup', amount_cents: 10.5, vat_cents: 2 }),
      /cannot store REAL value/,
    ],
    [
      'a top-up of nothing',
      line({ kind: 'topup', amount_cents: 0, vat_cents: 0 }),
      /CHECK constraint failed/,
    ],
    [
      'a top-up without its VAT',
      line({ kind: 'topup', amount_cents: 1000, vat_cents: null }),
      /CHECK constraint failed/,
    ],
    [
      'a top-up carrying a world',
      line({ kind: 'topup', amount_cents: 1000, vat_cents: 210, world_id: 'w-a' }),
      /CHECK/,
    ],
    [
      'an empty Stripe id',
      line({ kind: 'topup', amount_cents: 1000, vat_cents: 210, stripe_payment_id: '' }),
      /CHECK/,
    ],
    [
      'a world-day that pays the account',
      line({
        kind: 'world_day',
        amount_cents: 5,
        world_id: 'w-a',
        machine: 'm',
        day: '2026-10-26',
        minutes_running: 1,
        minutes_stopped: 0,
        size: '2g',
        tariff_version_id: 1,
      }),
      /CHECK/,
    ],
    [
      'a world-day longer than a UTC day',
      line({
        kind: 'world_day',
        amount_cents: -60,
        world_id: 'w-a',
        machine: 'm',
        day: '2026-10-26',
        minutes_running: 1441,
        minutes_stopped: 0,
        size: '2g',
        tariff_version_id: 1,
      }),
      /CHECK/,
    ],
    [
      'a world-day whose running and stopped minutes add up to more than a day',
      line({
        kind: 'world_day',
        amount_cents: -33,
        world_id: 'w-a',
        machine: 'm',
        day: '2026-10-26',
        minutes_running: 720,
        minutes_stopped: 721,
        size: '2g',
        tariff_version_id: 1,
      }),
      /CHECK/,
    ],
    [
      'a world-day on no calendar day',
      line({
        kind: 'world_day',
        amount_cents: -60,
        world_id: 'w-a',
        machine: 'm',
        day: '2026-02-30',
        minutes_running: 1,
        minutes_stopped: 0,
        size: '2g',
        tariff_version_id: 1,
      }),
      /CHECK/,
    ],
    [
      'a world-day without its tariff version',
      line({
        kind: 'world_day',
        amount_cents: -60,
        world_id: 'w-a',
        machine: 'm',
        day: '2026-10-26',
        minutes_running: 1,
        minutes_stopped: 0,
        size: '2g',
        tariff_version_id: null,
      }),
      /CHECK/,
    ],
    [
      'a world-day charged to another account',
      line({
        account_id: 'acc-other',
        kind: 'world_day',
        amount_cents: -60,
        world_id: 'w-a',
        machine: 'm',
        day: '2026-10-26',
        minutes_running: 1,
        minutes_stopped: 0,
        size: '2g',
        tariff_version_id: 1,
      }),
      /charged to the world's own account/,
    ],
    [
      'an adjustment with no reason',
      line({ kind: 'adjustment', amount_cents: 100, by: 'oracle:pablo', reason: ' ' }),
      /CHECK/,
    ],
    [
      'an adjustment of nothing',
      line({ kind: 'adjustment', amount_cents: 0, by: 'oracle:pablo', reason: 'why' }),
      /CHECK/,
    ],
    ['a positive refund', line({ kind: 'refund', amount_cents: 100, lot_line_id: 'T1' }), /CHECK/],
    [
      'a refund of no lot',
      line({ kind: 'refund', amount_cents: -100, lot_line_id: null }),
      /names a lot of its own account/,
    ],
    [
      'a refund of a world-day',
      line({ kind: 'chargeback', amount_cents: -100, lot_line_id: 'D1' }),
      /names a lot of its own account/,
    ],
    [
      "a refund of another account's lot",
      line({ kind: 'refund', amount_cents: -100, lot_line_id: 'T-other' }),
      /names a lot of its own account/,
    ],
    ['an unknown kind', line({ kind: 'gift', amount_cents: 100 }), /CHECK/],
    [
      'an instant in another form',
      line({ kind: 'topup', amount_cents: 1000, vat_cents: 210, at: '2026-10-27T09:00:00Z' }),
      /CHECK/,
    ],
    [
      'an unknown account',
      line({ account_id: 'acc-nobody', kind: 'topup', amount_cents: 1000, vat_cents: 210 }),
      /FOREIGN KEY/,
    ],
  ])('refuses %s', (_what, sql, error) => {
    const sqlite = scene();
    const before = snapshot(sqlite);
    expect(() => sqlite.exec(sql)).toThrow(error);
    expect(snapshot(sqlite)).toEqual(before);
  });

  it('takes a refund and a chargeback of a lot, a positive adjustment and a top-up without Stripe ids', () => {
    const sqlite = scene();
    sqlite.exec(
      line({
        id: 'R1',
        kind: 'refund',
        amount_cents: -100,
        lot_line_id: 'T1',
        stripe_event_id: 'evt_1',
      }),
    );
    sqlite.exec(line({ id: 'R2', kind: 'chargeback', amount_cents: -100, lot_line_id: 'T1' }));
    sqlite.exec(
      line({
        id: 'G1',
        kind: 'adjustment',
        amount_cents: 300,
        by: 'oracle:pablo',
        reason: 'goodwill',
      }),
    );
    sqlite.exec(line({ id: 'R3', kind: 'refund', amount_cents: -100, lot_line_id: 'G1' }));
    sqlite.exec(line({ id: 'T2', kind: 'topup', amount_cents: 500, vat_cents: 105 }));
    expect(balance(sqlite, 'acc')).toBe(1000 - 60 - 100 - 100 + 300 - 100 + 500);
  });
});

describe('the nightly close through the database (MIS-178)', () => {
  it('writes one line per measured world and day, and a second run writes nothing', async () => {
    const { db, sqlite } = fleetScene();
    const first = await runClose(db, fixtureMeter(), nightOf('2026-10-27'));
    expect(first.today).toBe('2026-10-27');
    expect(first.linesWritten).toBe(5);
    expect(
      rows(
        sqlite,
        "SELECT world_id, day, amount_cents, minutes_running, minutes_stopped, tariff_version_id FROM ledger_lines WHERE kind = 'world_day' ORDER BY world_id, day",
      ),
    ).toEqual([
      {
        world_id: 'w-leo-friends',
        day: '2026-10-24',
        amount_cents: -5,
        minutes_running: 0,
        minutes_stopped: 1440,
        tariff_version_id: 1,
      },
      {
        world_id: 'w-leo-friends',
        day: '2026-10-25',
        amount_cents: -5,
        minutes_running: 0,
        minutes_stopped: 1440,
        tariff_version_id: 1,
      },
      {
        world_id: 'w-lumen-plaza',
        day: '2026-10-24',
        amount_cents: -60,
        minutes_running: 1440,
        minutes_stopped: 0,
        tariff_version_id: 1,
      },
      {
        world_id: 'w-lumen-plaza',
        day: '2026-10-25',
        amount_cents: -60,
        minutes_running: 1440,
        minutes_stopped: 0,
        tariff_version_id: 1,
      },
      {
        world_id: 'w-lumen-plaza',
        day: '2026-10-26',
        amount_cents: -33,
        minutes_running: 720,
        minutes_stopped: 720,
        tariff_version_id: 1,
      },
    ]);
    expect(first.output.pending).toEqual([{ worldId: 'w-leo-friends', day: '2026-10-26' }]);
    expect(balance(sqlite, 'acc-lumen')).toBe(1000 - 60 - 60 - 33);
    expect(balance(sqlite, 'acc-leo')).toBe(1000 - 5 - 5);

    const before = snapshot(sqlite);
    const again = await runClose(db, fixtureMeter(), nightOf('2026-10-27'));
    expect(again).toMatchObject({ linesWritten: 0, rowsChanged: 0 });
    expect(again.output.lines).toEqual([]);
    expect(snapshot(sqlite)).toEqual(before);
  });

  it('writes nothing when a concurrent second run decided the same', async () => {
    const { db, sqlite } = fleetScene();
    addAccount(sqlite, 'acc-zero');
    addWorld(sqlite, 'w-zero', 'acc-zero', '2026-10-13');
    // Both runs read the same state before either writes.
    const input = await loadCloseInput(db, fixtureMeter(), nightOf('2026-11-30'));
    const output = closeDays(input);
    expect(output.lines.length).toBeGreaterThan(0);
    expect(output.periodsOpened.length).toBeGreaterThan(0);
    expect(output.keep.length).toBeGreaterThan(0);
    expect(output.reports.length).toBeGreaterThan(0);
    const first = await writeCloseOutput(db, input.today, output);
    expect(first.rowsChanged).toBeGreaterThan(0);
    const after = snapshot(sqlite);
    expect(await writeCloseOutput(db, input.today, output)).toEqual({
      linesWritten: 0,
      rowsChanged: 0,
    });
    expect(snapshot(sqlite)).toEqual(after);
  });

  it('charges a day the meter answers late, up to 35 days back, and reports older ones once', async () => {
    const { db, sqlite } = migratedTill();
    addAccount(sqlite, 'acc');
    addTopup(sqlite, 'T1', 'acc', 10_000, '2026-10-13T10:00:00.000Z');
    addWorld(sqlite, 'w-a', 'acc', '2026-10-14');
    const silent = await runClose(db, new NoMeter(), nightOf('2026-11-30'));
    expect(silent.linesWritten).toBe(0);
    expect(silent.output.pending).toHaveLength(35);
    expect(rows(sqlite, 'SELECT day, reason FROM close_reports ORDER BY day')).toEqual(
      daysFrom('2026-10-14', '2026-10-25').map((day) => ({ day, reason: 'unmeasured' })),
    );
    const late = new FakeMeter([
      reading('w-a', '2026-10-26', 1440, 0),
      reading('w-a', '2026-10-25', 1440, 0),
    ]);
    const answered = await runClose(db, late, nightOf('2026-11-30'));
    expect(answered.output.lines.map((line) => line.day)).toEqual(['2026-10-26']);
    expect(answered.output.reports).toEqual([]);
    expect(rows(sqlite, 'SELECT COUNT(*) AS n FROM close_reports')).toEqual([{ n: 12 }]);
  });

  it('keeps an account’s worlds at zero, then a top-up ends it from the next day and starts nothing', async () => {
    const { db, sqlite } = migratedTill();
    addAccount(sqlite, 'acc');
    addTopup(sqlite, 'T1', 'acc', 100, '2026-10-20T10:00:00.000Z');
    addWorld(sqlite, 'w-z', 'acc', '2026-10-24');

    const night1 = await runClose(
      db,
      new FakeMeter(
        daysFrom('2026-10-24', '2026-10-26').map((day) => reading('w-z', day, MINUTES_PER_DAY, 0)),
      ),
      nightOf('2026-10-27'),
    );
    expect(balance(sqlite, 'acc')).toBe(100 - 60 - 60 - 60);
    expect(night1.output.stopForBalance).toEqual([
      { accountId: 'acc', worldId: 'w-z', machine: 'vps-2-a' },
    ]);
    expect(
      rows(sqlite, 'SELECT account_id, starts_on, started_at, ends_on FROM at_zero_periods'),
    ).toEqual([
      {
        account_id: 'acc',
        starts_on: '2026-10-27',
        started_at: '2026-10-27T00:30:00.000Z',
        ends_on: null,
      },
    ]);
    expect(rows(sqlite, 'SELECT world_id, delete_on, marked_on FROM keep_marks')).toEqual([
      { world_id: 'w-z', delete_on: '2027-01-25', marked_on: '2026-10-27' },
    ]);

    // Stopped after saving at 00:30: thirty minutes running are charged, the stopped ones are not.
    const night2 = await runClose(
      db,
      new FakeMeter([{ ...reading('w-z', '2026-10-27', 30, 1410), endState: 'stopped' }]),
      nightOf('2026-10-28'),
    );
    expect(night2.output.lines.map((line) => line.amountCents)).toEqual([-1]);
    expect(night2.output.stopForBalance).toEqual([]);
    expect(night2.output.keep).toEqual([]);

    addTopup(sqlite, 'T2', 'acc', 2000, '2026-10-28T10:00:00.000Z');
    const night4 = await runClose(
      db,
      new FakeMeter(
        daysFrom('2026-10-28', '2026-10-29').map((day) => reading('w-z', day, 0, 1440)),
      ),
      nightOf('2026-10-30'),
    );
    expect(night4.output.lines.map((line) => [line.day, line.amountCents])).toEqual([
      ['2026-10-28', 0],
      ['2026-10-29', -5],
    ]);
    expect(night4.output.stopForBalance).toEqual([]);
    expect(rows(sqlite, 'SELECT ends_on, ended_by_line_id FROM at_zero_periods')).toEqual([
      { ends_on: '2026-10-28', ended_by_line_id: 'T2' },
    ]);
    expect(rows(sqlite, 'SELECT * FROM keep_marks')).toEqual([]);
    expect(balance(sqlite, 'acc')).toBe(100 - 180 - 1 + 2000 - 5);
  });

  it('keeps every charged line, version and amount, when a new tariff version starts', async () => {
    const { db, sqlite } = fleetScene();
    await runClose(db, fixtureMeter(), nightOf('2026-10-26'));
    const charged = rows(sqlite, "SELECT * FROM ledger_lines WHERE kind = 'world_day' ORDER BY id");
    expect(
      charged.map((line) => [line['day'], line['amount_cents'], line['tariff_version_id']]),
    ).toEqual(
      expect.arrayContaining([
        ['2026-10-25', -60, 1],
        ['2026-10-24', -60, 1],
      ]),
    );

    const rise: TariffVersion = {
      ...SEED_TARIFF,
      id: 2,
      startsOn: '2026-10-26',
      createdAt: '2026-09-25T10:00:00.000Z',
      createdBy: 'oracle:pablo',
      sizes: { '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } },
    };
    expect(scheduleProblems([SEED_TARIFF], rise, '2026-09-25')).toEqual([]);
    sqlite
      .prepare(
        'INSERT INTO tariff_versions (id, starts_on, created_at, created_by, sizes, rules) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        rise.id,
        rise.startsOn,
        rise.createdAt,
        rise.createdBy,
        JSON.stringify(rise.sizes),
        JSON.stringify(rise.rules),
      );

    const next = await runClose(db, fixtureMeter(), nightOf('2026-10-27'));
    expect(
      next.output.lines.map((line) => [
        line.worldId,
        line.day,
        line.amountCents,
        line.tariffVersionId,
      ]),
    ).toEqual([['w-lumen-plaza', '2026-10-26', -38, 2]]);
    expect(
      rows(
        sqlite,
        "SELECT * FROM ledger_lines WHERE kind = 'world_day' AND day < '2026-10-26' ORDER BY id",
      ),
    ).toEqual(charged);
  });
});

describe('the repository’s own guards', () => {
  it('refuses to write a malformed line, and writes nothing at all', async () => {
    const { db, sqlite } = fleetScene();
    const input = await loadCloseInput(db, fixtureMeter(), nightOf('2026-10-27'));
    const output = closeDays(input);
    const [first, ...rest] = output.lines;
    expect(first).toBeDefined();
    if (first === undefined) return;
    const bad: CloseOutput = { ...output, lines: [{ ...first, amountCents: 5 }, ...rest] };
    const before = snapshot(sqlite);
    await expect(writeCloseOutput(db, input.today, bad)).rejects.toThrow(
      /refusing to write line .*a world-day is zero or negative/,
    );
    expect(snapshot(sqlite)).toEqual(before);
  });

  it('sends no batch for a night with nothing to write', async () => {
    const { db } = migratedTill();
    let batches = 0;
    const counting: TillDatabase = {
      prepare: (query) => db.prepare(query),
      batch: async (statements) => {
        batches += 1;
        return db.batch(statements);
      },
    };
    const run = await runClose(counting, new NoMeter(), nightOf('2026-10-27'));
    expect(run).toMatchObject({ linesWritten: 0, rowsChanged: 0 });
    expect(batches).toBe(1); // the read
  });

  it('fails when the database answers fewer reads than it was asked', async () => {
    const { db } = migratedTill();
    const short: TillDatabase = {
      prepare: (query) => db.prepare(query),
      batch: async <T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> =>
        (await db.batch<T>(statements)).slice(1),
    };
    await expect(loadCloseInput(short, new NoMeter(), nightOf('2026-10-27'))).rejects.toThrow(
      /9 reads, 8 answers/,
    );
  });

  it('fails closed on a row that is not what the schema promises', async () => {
    const loose = (setup: string): TillDatabase => {
      const { db, sqlite } = sqliteD1();
      sqlite.exec(`
        CREATE TABLE tariff_versions (id, starts_on, created_at, created_by, sizes, rules);
        CREATE TABLE accounts (id);
        CREATE TABLE worlds (id, account_id, first_seen_on);
        CREATE TABLE ledger_lines (id, account_id, kind, amount_cents, at, world_id, day);
        CREATE TABLE at_zero_periods (account_id, starts_on, started_at, ends_on);
        CREATE TABLE close_reports (world_id, day, reason);
        CREATE TABLE keep_marks (world_id, account_id, delete_on);
        ${setup}
      `);
      return db;
    };
    const seed = `INSERT INTO tariff_versions VALUES (1, '2026-10-13', '2026-10-13T00:00:00.000Z', 'seed', '${JSON.stringify(SEED_TARIFF.sizes)}', '${JSON.stringify(SEED_TARIFF.rules)}');`;
    const load = (setup: string): Promise<unknown> =>
      loadCloseInput(loose(seed + setup), new NoMeter(), nightOf('2026-10-27'));
    await expect(load('')).resolves.toMatchObject({ today: '2026-10-27' });
    await expect(load('INSERT INTO accounts VALUES (7);')).rejects.toThrow(
      'till database: id is not text',
    );
    await expect(load("INSERT INTO accounts VALUES ('');")).rejects.toThrow(
      'till database: id is not text',
    );
    await expect(
      load("INSERT INTO accounts VALUES ('a'); INSERT INTO worlds VALUES ('w', 'a', 'soon');"),
    ).rejects.toThrow('till database: first_seen_on is not a day');
    await expect(
      load(
        "INSERT INTO ledger_lines VALUES ('l', 'a', 'topup', 10.5, '2026-10-20T10:00:00.000Z', NULL, NULL);",
      ),
    ).rejects.toThrow('till database: balance_cents is not whole cents');
    await expect(
      load("INSERT INTO at_zero_periods VALUES ('a', '2026-10-20', 'yesterday', NULL);"),
    ).rejects.toThrow('till database: started_at is not an instant');
    await expect(
      load("INSERT INTO close_reports VALUES ('w', '2026-10-20', 'lost');"),
    ).rejects.toThrow('till database: unknown reason lost');
    await expect(
      loadCloseInput(
        loose(
          "INSERT INTO tariff_versions VALUES (1, '2026-10-13', '2026-10-13T00:00:00.000Z', 'seed', '{}', '{}');",
        ),
        new NoMeter(),
        nightOf('2026-10-27'),
      ),
    ).rejects.toThrow(/tariff sizes/);
    // A query that does not return the column the till reads.
    const renamed = loose(seed + "INSERT INTO accounts VALUES ('a');");
    const drifted: TillDatabase = {
      prepare: (query) =>
        renamed.prepare(
          query.replace('SELECT id FROM accounts', 'SELECT id AS name FROM accounts'),
        ),
      batch: (statements) => renamed.batch(statements),
    };
    await expect(loadCloseInput(drifted, new NoMeter(), nightOf('2026-10-27'))).rejects.toThrow(
      'till database: no column id',
    );
  });

  it('reads the periods and marks the close needs, and an ended stretch inside the window', async () => {
    const { db, sqlite } = migratedTill();
    addAccount(sqlite, 'acc');
    addAccount(sqlite, 'acc-bare', 'personal');
    addWorld(sqlite, 'w-a', 'acc', '2026-10-24');
    addTopup(sqlite, 'T1', 'acc', 1000, '2026-10-22T10:00:00.000Z');
    addTopup(sqlite, 'T2', 'acc', 1000, '2026-10-25T10:00:00.000Z');
    addTopup(sqlite, 'T3', 'acc', 1000, '2026-10-26T10:00:00.000Z');
    sqlite.exec(`
      INSERT INTO at_zero_periods (account_id, starts_on, started_at, ends_on, ended_by_line_id)
      VALUES ('acc', '2026-09-01', '2026-09-01T00:30:00.000Z', '2026-09-03', 'T1'),
             ('acc', '2026-10-20', '2026-10-20T00:30:00.000Z', '2026-10-22', 'T1'),
             ('acc', '2026-10-24', '2026-10-24T00:30:00.000Z', NULL, NULL);
      INSERT INTO keep_marks (world_id, account_id, delete_on, marked_on) VALUES ('w-a', 'acc', '2027-01-22', '2026-10-24');
    `);
    const input = await loadCloseInput(db, new NoMeter(), nightOf('2026-10-27'));
    expect(input.accounts).toEqual([
      {
        accountId: 'acc',
        balanceCents: 3000,
        worlds: [{ worldId: 'w-a', firstSeenOn: '2026-10-24' }],
        periods: [
          {
            accountId: 'acc',
            startsOn: '2026-10-20',
            startedAt: '2026-10-20T00:30:00.000Z',
            endsOn: '2026-10-22',
          },
          {
            accountId: 'acc',
            startsOn: '2026-10-24',
            startedAt: '2026-10-24T00:30:00.000Z',
            endsOn: null,
          },
        ],
        lotAfterOpen: { lineId: 'T2', at: '2026-10-25T10:00:00.000Z' },
      },
      { accountId: 'acc-bare', balanceCents: 0, worlds: [], periods: [], lotAfterOpen: null },
    ]);
    expect(input.marks).toEqual([{ worldId: 'w-a', accountId: 'acc', deleteOn: '2027-01-22' }]);
    expect(input.now).toBe(nightOf('2026-10-27').toISOString());
    expect(addDays(input.today, -35)).toBe('2026-09-22');
  });
});
