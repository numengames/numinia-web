/**
 * Drizzle ORM client — Neon serverless PostgreSQL.
 *
 * Returns null when DATABASE_URL is not configured, allowing the app
 * to fall back to GitHub-as-DB (github-storage.ts).
 *
 * Usage:
 *   import { getDb } from '@/db';
 *   const db = getDb();
 *   if (!db) { // fall back to GitHub }
 *   const rows = await db.select().from(assets).where(...);
 */

import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Returns the Drizzle client, or null if DATABASE_URL is not configured.
 * Singleton — safe to call multiple times.
 */
export function getDb(): NeonHttpDatabase<typeof schema> | null {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) return null;

  const sql = neon(url);
  db = drizzle(sql, { schema });
  return db;
}

/**
 * Check if the database is configured and reachable.
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  const database = getDb();
  if (!database) return false;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Re-export schema for convenience
export { schema };
