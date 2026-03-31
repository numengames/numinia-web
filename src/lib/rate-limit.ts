/**
 * In-memory rate limiter with sliding window.
 * Per-instance on Vercel (serverless), but effective against single-origin attacks.
 * Cleanup of expired entries runs every 60s.
 */

import { NextRequest } from 'next/server';

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
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

// Cleanup expired entries every 60s
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter(t => now - t < 120000); // 2min retention
        if (entry.timestamps.length === 0) store.delete(key);
      }
    }
  }, 60000);
}

/**
 * Create a rate limiter for a specific endpoint.
 */
export function createRateLimit(name: string, config: RateLimitConfig) {
  const store = getStore(name);

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => t > windowStart);

    if (entry.timestamps.length >= config.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + config.windowMs - now;
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: config.maxRequests - entry.timestamps.length, retryAfterMs: 0 };
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
