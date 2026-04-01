/**
 * Upstash Redis client — shared state across serverless instances.
 *
 * Used for: rate limiting, audit queue, cache.
 * Degrades gracefully to null when UPSTASH_REDIS_REST_URL is not configured,
 * so callers must handle the null case (typically falling back to in-memory).
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Returns the Upstash Redis client, or null if not configured.
 * Singleton — safe to call multiple times.
 */
export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

/**
 * Check if Redis is available (configured and reachable).
 * Useful for health checks.
 */
export async function isRedisHealthy(): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
