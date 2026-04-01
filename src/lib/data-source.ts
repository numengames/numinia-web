/**
 * Data source factory — returns GitHub or PostgreSQL repositories
 * based on whether DATABASE_URL is configured.
 *
 * Usage:
 *   import { getDataSource } from '@/lib/data-source';
 *   const ds = getDataSource();
 *   const assets = await ds.assets.getAll();
 *
 * Feature flag: DATABASE_URL present = DB mode, absent = GitHub mode.
 * This means existing deployments work identically without any config change.
 */

import type { IDataSource } from './repositories/types';
import { getDb } from '@/db';

let cachedSource: IDataSource | null = null;

/**
 * Returns the active data source (GitHub or DB).
 * Singleton — the choice is made once based on env vars.
 */
export function getDataSource(): IDataSource {
  if (cachedSource) return cachedSource;

  const db = getDb();

  if (db) {
    // Lazy import to avoid loading Drizzle when using GitHub mode
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createDbDataSource } = require('./repositories/db.repo') as typeof import('./repositories/db.repo');
    cachedSource = createDbDataSource();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createGitHubDataSource } = require('./repositories/github.repo') as typeof import('./repositories/github.repo');
    cachedSource = createGitHubDataSource();
  }

  return cachedSource;
}

/**
 * Check which data source is active.
 */
export function getDataSourceType(): 'db' | 'github' {
  return getDb() ? 'db' : 'github';
}

// Re-export types for convenience
export type { IDataSource } from './repositories/types';
