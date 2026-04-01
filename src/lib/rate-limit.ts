/**
 * Rate limiter with sliding window.
 *
 * Uses Upstash Redis sorted sets when available (shared across all serverless
 * instances). Falls back to an in-memory Map when Redis is not configured
 * (local dev, CI).
 *
 * Cleanup of in-memory expired entries runs every 60s.
 */

import { NextRequest } from 'next/server';
import { getRedis } from './redis';

/* ---------- types ---------- */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/* ---------- in-memory fallback ---------- */

interface RateLimitEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

// Cleanup expired entries every 60s (in-memory only)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter(t => now - t < 120000);
        if (entry.timestamps.length === 0) store.delete(key);
      }
    }
  }, 60000);
}

function checkInMemory(name: string, config: RateLimitConfig, key: string): RateLimitResult {
  const store = getStore(name);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter(t => t > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: config.maxRequests - entry.timestamps.length, retryAfterMs: 0 };
}

/* ---------- Redis implementation ---------- */

async function checkRedis(name: string, config: RateLimitConfig, key: string): Promise<RateLimitResult> {
  const redis = getRedis()!;
  const redisKey = `rl:${name}:${key}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Pipeline: remove old entries, count current, add new — atomic
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zcard(redisKey);

  const results = await pipeline.exec();
  const currentCount = results[1] as number;

  if (currentCount >= config.maxRequests) {
    // Get the oldest timestamp still in the window
    const oldest = await redis.zrange<number[]>(redisKey, 0, 0);
    const retryAfterMs = oldest.length > 0
      ? oldest[0] + config.windowMs - now
      : config.windowMs;
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  // Add current request and set TTL
  const addPipeline = redis.pipeline();
  addPipeline.zadd(redisKey, { score: now, member: `${now}:${Math.random().toString(36).slice(2, 8)}` });
  addPipeline.expire(redisKey, Math.ceil(config.windowMs / 1000) + 1);
  await addPipeline.exec();

  return { allowed: true, remaining: config.maxRequests - currentCount - 1, retryAfterMs: 0 };
}

/* ---------- public API ---------- */

/**
 * Create a rate limiter for a specific endpoint.
 * Returns a sync function (in-memory) or async function (Redis).
 * Callers should always `await` the result for compatibility.
 */
export function createRateLimit(name: string, config: RateLimitConfig) {
  return function check(key: string): RateLimitResult | Promise<RateLimitResult> {
    const redis = getRedis();
    if (redis) {
      return checkRedis(name, config, key).catch(() => {
        // If Redis fails, fall back to in-memory
        return checkInMemory(name, config, key);
      });
    }
    return checkInMemory(name, config, key);
  };
}

/**
 * Extract rate limit key from request (IP address).
 */
export function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

/**
 * Pre-configured rate limiters for common endpoints.
 */
export const authRateLimit = createRateLimit('auth', { windowMs: 60000, maxRequests: 10 });
export const nonceRateLimit = createRateLimit('nonce', { windowMs: 60000, maxRequests: 20 });
export const uploadRateLimit = createRateLimit('upload', { windowMs: 60000, maxRequests: 5 });
export const presignRateLimit = createRateLimit('presign', { windowMs: 60000, maxRequests: 10 });
export const archiveRateLimit = createRateLimit('archive', { windowMs: 60000, maxRequests: 5 });
export const assetsPostRateLimit = createRateLimit('assets-post', { windowMs: 60000, maxRequests: 10 });
export const assetsDeleteRateLimit = createRateLimit('assets-delete', { windowMs: 60000, maxRequests: 5 });
export const downloadRateLimit = createRateLimit('download', { windowMs: 60000, maxRequests: 30 });
export const favoritesRateLimit = createRateLimit('favorites', { windowMs: 60000, maxRequests: 20 });
export const charactersRateLimit = createRateLimit('characters', { windowMs: 60000, maxRequests: 15 });
export const nftCheckRateLimit = createRateLimit('nft-check', { windowMs: 60000, maxRequests: 20 });
export const proxyRateLimit = createRateLimit('proxy', { windowMs: 60000, maxRequests: 30 });
