import { describe, it, expect } from 'vitest';
import { createRateLimit } from '@/lib/rate-limit';

describe('rate limiter', () => {
  it('allows requests within limit', async () => {
    const check = createRateLimit('test1', { windowMs: 60000, maxRequests: 3 });
    expect((await check('ip1')).allowed).toBe(true);
    expect((await check('ip1')).allowed).toBe(true);
    expect((await check('ip1')).allowed).toBe(true);
  });

  it('blocks after limit exceeded', async () => {
    const check = createRateLimit('test2', { windowMs: 60000, maxRequests: 2 });
    await check('ip2');
    await check('ip2');
    const result = await check('ip2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks different keys independently', async () => {
    const check = createRateLimit('test3', { windowMs: 60000, maxRequests: 1 });
    expect((await check('ip-a')).allowed).toBe(true);
    expect((await check('ip-b')).allowed).toBe(true);
    expect((await check('ip-a')).allowed).toBe(false);
    expect((await check('ip-b')).allowed).toBe(false);
  });

  it('returns remaining count', async () => {
    const check = createRateLimit('test4', { windowMs: 60000, maxRequests: 5 });
    const r1 = await check('ip3');
    expect(r1.remaining).toBe(4);
    await check('ip3');
    const r3 = await check('ip3');
    expect(r3.remaining).toBe(2);
  });
});
