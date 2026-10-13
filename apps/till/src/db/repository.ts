/**
 * The till's database (D1): it loads what the nightly close needs, calls
 * the pure close, and writes what it decides — the input read in ONE batch
 * and the output written in ONE batch, each a transaction. Lines, deletion
 * dates and reports travel as one JSON parameter each (`json_each`), so a
 * night with many lines is still a handful of statements, within D1's
 * per-query parameter limit. A second run over closed days writes nothing:
 * a world's day already written is skipped on its uniqueness, and the
 * database itself drops any insert that collides with a line.
 */

import {
  CLOSE_WINDOW_DAYS,
  closeDays,
  type AtZeroPeriod,
  type CloseAccount,
  type CloseInput,
  type CloseOutput,
  type KeepMark,
  type KnownWorld,
  type LotArrival,
  type ReportReason,
} from '../lib/close';
import { lineProblems } from '../lib/ledger';
import { isCents } from '../lib/money';
import { parseRules, parseSizes, type TariffVersion } from '../lib/tariff';
import { addDays, dayOf, daysFrom, isDay, isInstant } from '../lib/utc-day';
import type { Meter } from '../meter';

/** What the till uses of a D1 database: prepared statements and batches. */
export type TillDatabase = Pick<D1Database, 'prepare' | 'batch'>;

type Row = Readonly<Record<string, unknown>>;

/** What one close did: the decision, and what reached the database. */
export interface CloseRun {
  readonly today: string;
  readonly output: CloseOutput;
  /** World-day lines inserted (0 when every one already existed). */
  readonly linesWritten: number;
  /** Rows changed by the whole write batch (0 when the run wrote nothing). */
  readonly rowsChanged: number;
}

const REPORT_REASONS: readonly string[] = ['unmeasured', 'invalid_reading', 'unpriced'];

function column(row: Row, name: string): unknown {
  if (!(name in row)) throw new TypeError(`till database: no column ${name}`);
  return row[name];
}

function text(row: Row, name: string): string {
  const value = column(row, name);
  if (typeof value !== 'string' || value === '') {
    throw new TypeError(`till database: ${name} is not text`);
  }
  return value;
}

function day(row: Row, name: string): string {
  const value = text(row, name);
  if (!isDay(value)) throw new TypeError(`till database: ${name} is not a day`);
  return value;
}

function instant(row: Row, name: string): string {
  const value = text(row, name);
  if (!isInstant(value)) throw new TypeError(`till database: ${name} is not an instant`);
  return value;
}

function cents(row: Row, name: string): number {
  const value = column(row, name);
  if (!isCents(value)) throw new TypeError(`till database: ${name} is not whole cents`);
  return value;
}

function json(row: Row, name: string): unknown {
  const parsed: unknown = JSON.parse(text(row, name));
  return parsed;
}

function reason(row: Row): ReportReason {
  const value = text(row, 'reason');
  if (!REPORT_REASONS.includes(value))
    throw new TypeError(`till database: unknown reason ${value}`);
  return value as ReportReason;
}

function group<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(key(item)) ?? [];
    list.push(item);
    groups.set(key(item), list);
  }
  return groups;
}

const READS = [
  'SELECT id, starts_on, created_at, created_by, sizes, rules FROM tariff_versions ORDER BY id',
  'SELECT id FROM accounts ORDER BY id',
  'SELECT id, account_id, first_seen_on FROM worlds ORDER BY id',
  'SELECT account_id, SUM(amount_cents) AS balance_cents FROM ledger_lines GROUP BY account_id',
  'SELECT account_id, starts_on, started_at, ends_on FROM at_zero_periods WHERE ends_on IS NULL OR ends_on >= ?1',
  `SELECT period.account_id AS account_id, line.id AS line_id, line.at AS at
     FROM at_zero_periods AS period
     JOIN ledger_lines AS line ON line.account_id = period.account_id
    WHERE period.ends_on IS NULL
      AND line.kind IN ('topup', 'adjustment') AND line.amount_cents > 0
      AND line.at > period.started_at
    ORDER BY line.at, line.id`,
  "SELECT world_id, day FROM ledger_lines WHERE kind = 'world_day'",
  'SELECT world_id, day, reason FROM close_reports',
  'SELECT world_id, account_id, delete_on FROM keep_marks',
] as const;

/** Everything the close needs, read in one batch (one consistent snapshot), plus the meter's readings. */
export async function loadCloseInput(
  db: TillDatabase,
  meter: Meter,
  now: Date,
): Promise<CloseInput> {
  const today = dayOf(now);
  const firstDay = addDays(today, -CLOSE_WINDOW_DAYS);
  const statements = READS.map((sql) => {
    const statement = db.prepare(sql);
    return sql.includes('?1') ? statement.bind(firstDay) : statement;
  });
  const results = await db.batch<Row>(statements);
  if (results.length !== statements.length) {
    throw new Error(`till database: ${statements.length} reads, ${results.length} answers`);
  }
  const [
    versionRows,
    accountRows,
    worldRows,
    balanceRows,
    periodRows,
    lotRows,
    closedRows,
    reportRows,
    markRows,
  ] = results.map((result) => result.results) as [
    Row[],
    Row[],
    Row[],
    Row[],
    Row[],
    Row[],
    Row[],
    Row[],
    Row[],
  ];

  const versions: TariffVersion[] = versionRows.map((row) => ({
    id: cents(row, 'id'),
    startsOn: day(row, 'starts_on'),
    createdAt: instant(row, 'created_at'),
    createdBy: text(row, 'created_by'),
    sizes: parseSizes(json(row, 'sizes')),
    rules: parseRules(json(row, 'rules')),
  }));
  const worlds = group(
    worldRows.map((row) => ({
      accountId: text(row, 'account_id'),
      world: { worldId: text(row, 'id'), firstSeenOn: day(row, 'first_seen_on') } as KnownWorld,
    })),
    (entry) => entry.accountId,
  );
  const balances = new Map(
    balanceRows.map((row) => [text(row, 'account_id'), cents(row, 'balance_cents')]),
  );
  const periods = group(
    periodRows.map((row): AtZeroPeriod => ({
      accountId: text(row, 'account_id'),
      startsOn: day(row, 'starts_on'),
      startedAt: instant(row, 'started_at'),
      endsOn: column(row, 'ends_on') === null ? null : day(row, 'ends_on'),
    })),
    (period) => period.accountId,
  );
  // The first lot after each open period: the rows come oldest first.
  const lots = new Map<string, LotArrival>();
  for (const row of lotRows) {
    const accountId = text(row, 'account_id');
    if (!lots.has(accountId))
      lots.set(accountId, { lineId: text(row, 'line_id'), at: instant(row, 'at') });
  }

  const accounts: CloseAccount[] = accountRows.map((row) => {
    const accountId = text(row, 'id');
    return {
      accountId,
      balanceCents: balances.get(accountId) ?? 0,
      worlds: (worlds.get(accountId) ?? []).map((entry) => entry.world),
      periods: periods.get(accountId) ?? [],
      lotAfterOpen: lots.get(accountId) ?? null,
    };
  });

  const worldIds = worldRows.map((row) => text(row, 'id'));
  const readings = await meter.read({ worldIds, days: daysFrom(firstDay, addDays(today, -1)) });

  return {
    today,
    now: now.toISOString(),
    versions,
    accounts,
    readings,
    closed: closedRows.map((row) => ({ worldId: text(row, 'world_id'), day: day(row, 'day') })),
    reported: reportRows.map((row) => ({
      worldId: text(row, 'world_id'),
      day: day(row, 'day'),
      reason: reason(row),
    })),
    marks: markRows.map((row): KeepMark => ({
      worldId: text(row, 'world_id'),
      accountId: text(row, 'account_id'),
      deleteOn: day(row, 'delete_on'),
    })),
  };
}

const INSERT_LINES = `
  INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, world_id, machine, day,
                            minutes_running, minutes_stopped, size, tariff_version_id)
  SELECT json_extract(value, '$.id'), json_extract(value, '$.accountId'), 'world_day',
         json_extract(value, '$.amountCents'), json_extract(value, '$.at'),
         json_extract(value, '$.worldId'), json_extract(value, '$.machine'),
         json_extract(value, '$.day'), json_extract(value, '$.minutesRunning'),
         json_extract(value, '$.minutesStopped'), json_extract(value, '$.size'),
         json_extract(value, '$.tariffVersionId')
    FROM json_each(?1) WHERE true
  ON CONFLICT (world_id, day) WHERE kind = 'world_day' DO NOTHING`;

const END_PERIOD = `
  UPDATE at_zero_periods SET ends_on = ?1, ended_by_line_id = ?2
   WHERE account_id = ?3 AND started_at = ?4 AND ends_on IS NULL`;

const OPEN_PERIOD = `
  INSERT INTO at_zero_periods (account_id, starts_on, started_at) VALUES (?1, ?2, ?3)
  ON CONFLICT DO NOTHING`;

const CLEAR_MARKS = 'DELETE FROM keep_marks WHERE world_id IN (SELECT value FROM json_each(?1))';

const KEEP_MARKS = `
  INSERT INTO keep_marks (world_id, account_id, delete_on, marked_on)
  SELECT json_extract(value, '$.worldId'), json_extract(value, '$.accountId'),
         json_extract(value, '$.deleteOn'), ?1
    FROM json_each(?2) WHERE true
  ON CONFLICT (world_id) DO UPDATE
     SET account_id = excluded.account_id, delete_on = excluded.delete_on, marked_on = excluded.marked_on
   WHERE keep_marks.account_id <> excluded.account_id OR keep_marks.delete_on <> excluded.delete_on`;

const INSERT_REPORTS = `
  INSERT INTO close_reports (world_id, day, reason, account_id, reported_on)
  SELECT json_extract(value, '$.worldId'), json_extract(value, '$.day'),
         json_extract(value, '$.reason'), json_extract(value, '$.accountId'), ?1
    FROM json_each(?2) WHERE true
  ON CONFLICT DO NOTHING`;

/**
 * Writes a close's output in ONE batch (a transaction: all of it or none).
 * Every line is checked before it is sent; an empty output sends nothing.
 */
export async function writeCloseOutput(
  db: TillDatabase,
  today: string,
  output: CloseOutput,
): Promise<Pick<CloseRun, 'linesWritten' | 'rowsChanged'>> {
  for (const line of output.lines) {
    const problems = lineProblems(line);
    if (problems.length > 0)
      throw new Error(`refusing to write line ${line.id}: ${problems.join('; ')}`);
  }
  const statements: D1PreparedStatement[] = [];
  if (output.lines.length > 0)
    statements.push(db.prepare(INSERT_LINES).bind(JSON.stringify(output.lines)));
  for (const end of output.periodsEnded) {
    statements.push(
      db.prepare(END_PERIOD).bind(end.endsOn, end.endedByLineId, end.accountId, end.startedAt),
    );
  }
  for (const period of output.periodsOpened) {
    statements.push(
      db.prepare(OPEN_PERIOD).bind(period.accountId, period.startsOn, period.startedAt),
    );
  }
  if (output.cleared.length > 0)
    statements.push(db.prepare(CLEAR_MARKS).bind(JSON.stringify(output.cleared)));
  if (output.keep.length > 0)
    statements.push(db.prepare(KEEP_MARKS).bind(today, JSON.stringify(output.keep)));
  if (output.reports.length > 0) {
    statements.push(db.prepare(INSERT_REPORTS).bind(today, JSON.stringify(output.reports)));
  }
  if (statements.length === 0) return { linesWritten: 0, rowsChanged: 0 };

  const results = await db.batch(statements);
  const changes = results.map((result) => result.meta.changes);
  return {
    linesWritten: output.lines.length > 0 ? Number(changes[0]) : 0,
    rowsChanged: changes.reduce((sum, count) => sum + count, 0),
  };
}

/** The nightly close for the UTC date of `now`: load, decide, write. */
export async function runClose(db: TillDatabase, meter: Meter, now: Date): Promise<CloseRun> {
  const input = await loadCloseInput(db, meter, now);
  const output = closeDays(input);
  const written = await writeCloseOutput(db, input.today, output);
  return { today: input.today, output, ...written };
}
