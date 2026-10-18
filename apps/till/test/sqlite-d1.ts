/**
 * A D1Database-shaped shim over node:sqlite, for tests only: D1 is SQLite,
 * so the real migration runs here unchanged. It keeps D1's contract where the
 * till relies on it — `bind` refuses `undefined` and turns booleans into 1/0,
 * `batch` is one transaction (all statements or none), results come as
 * `{ results, success, meta }` — and, where node:sqlite can set runtime
 * limits, D1's documented ones (a GLOB pattern of 50 bytes, 100 bound
 * parameters, statements of 100 KB, values of 2 MB, 32 function arguments).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';

/** D1's documented limits (developers.cloudflare.com/d1/platform/limits, 2026-04-21). */
export const D1_LIMITS = {
  likePatternLength: 50,
  variableNumber: 100,
  sqlLength: 100_000,
  length: 2_000_000,
  functionArg: 32,
} as const;

/** True when this Node can hold the shim to D1's limits (node:sqlite's runtime limits are recent). */
export const limitsEnforced = ((): boolean => {
  const probe = new DatabaseSync(':memory:');
  const supported = typeof probe.limits === 'object' && probe.limits !== null;
  probe.close();
  return supported;
})();

function toSqlValue(value: unknown, index: number): SQLInputValue {
  if (value === null || typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  throw new TypeError(
    `D1_TYPE_ERROR: Type '${typeof value}' not supported for value at position ${index + 1}`,
  );
}

function meta(changes: number, lastRowId: number): D1Meta & Record<string, unknown> {
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: changes,
    last_row_id: lastRowId,
    changed_db: changes > 0,
    changes,
  };
}

class ShimStatement implements D1PreparedStatement {
  readonly #sqlite: DatabaseSync;
  readonly #sql: string;
  readonly #values: readonly SQLInputValue[];

  constructor(sqlite: DatabaseSync, sql: string, values: readonly SQLInputValue[] = []) {
    this.#sqlite = sqlite;
    this.#sql = sql;
    this.#values = values;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    return new ShimStatement(this.#sqlite, this.#sql, values.map(toSqlValue));
  }

  #prepared(): StatementSync {
    return this.#sqlite.prepare(this.#sql);
  }

  /** Runs the statement: its rows when it returns any, its changes otherwise. */
  execute<T>(): D1Result<T> {
    const statement = this.#prepared();
    if (statement.columns().length > 0) {
      const rows = statement.all(...this.#values) as T[];
      return { results: rows, success: true, meta: meta(0, 0) };
    }
    const outcome = statement.run(...this.#values);
    return {
      results: [],
      success: true,
      meta: meta(Number(outcome.changes), Number(outcome.lastInsertRowid)),
    };
  }

  first<T = unknown>(colName: string): Promise<T | null>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  async first<T>(colName?: string): Promise<T | null> {
    const row = this.#prepared().get(...this.#values);
    if (row === undefined) return null;
    return (colName === undefined ? row : row[colName]) as T;
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return this.execute<T>();
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return this.execute<T>();
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<[string[], ...T[]] | T[]> {
    const statement = this.#prepared();
    statement.setReturnArrays(true);
    const rows = statement.all(...this.#values) as T[];
    if (options?.columnNames === true) {
      return [statement.columns().map((column) => column.name), ...rows];
    }
    return rows;
  }
}

/** The D1 surface the shim offers: prepared statements, batches, and multi-statement `exec`. */
type ShimDatabase = Pick<D1Database, 'prepare' | 'batch' | 'exec'>;

export interface Shim {
  readonly db: ShimDatabase;
  /** The node:sqlite handle underneath, for setting a scene and reading it back. */
  readonly sqlite: DatabaseSync;
}

/** A fresh in-memory database behind a D1-shaped object. */
export function sqliteD1(): Shim {
  const sqlite = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
  if (limitsEnforced) Object.assign(sqlite.limits, D1_LIMITS);
  const db: ShimDatabase = {
    prepare: (query: string): D1PreparedStatement => new ShimStatement(sqlite, query),
    batch: async <T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> => {
      const own = statements.map((statement) => {
        if (!(statement instanceof ShimStatement))
          throw new TypeError('not a statement of this database');
        return statement;
      });
      sqlite.exec('BEGIN');
      try {
        const results = own.map((statement) => statement.execute<T>());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    exec: async (query: string): Promise<D1ExecResult> => {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
  };
  return { db, sqlite };
}

/** The till's migrations folder, for a test that applies them one by one. */
export const MIGRATIONS = fileURLToPath(new URL('../migrations/', import.meta.url).href);

/** The till's migrations, in order, as wrangler applies them. */
export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

/** A fresh database with every migration of the till applied. */
export function migratedTill(): Shim {
  const shim = sqliteD1();
  for (const name of migrationFiles())
    shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
  return shim;
}
