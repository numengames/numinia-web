import { describe, it, expect } from 'vitest';
import { createRateLimit } from '@/lib/rate-limit';

describe('rate limiter', () => {
  it('allows requests within limit', () => {
    const check = createRateLimit('test1', { windowMs: 60000, maxRequests: 3 });
    expect(check('ip1').allowed).toBe(true);
    expect(check('ip1').allowed).toBe(true);
    expect(check('ip1').allowed).toBe(true);
  });

  it('blocks after limit exceeded', () => {
    const check = createRateLimit('test2', { windowMs: 60000, maxRequests: 2 });
    check('ip2');
    check('ip2');
    const result = check('ip2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks different keys independently', () => {
    const check = createRateLimit('test3', { windowMs: 60000, maxRequests: 1 });
    expect(check('ip-a').allowed).toBe(true);
    expect(check('ip-b').allowed).toBe(true);
    expect(check('ip-a').allowed).toBe(false);
    expect(check('ip-b').allowed).toBe(false);
  });

  it('returns remaining count', () => {
    const check = createRateLimit('test4', { windowMs: 60000, maxRequests: 5 });
    const r1 = check('ip3');
    expect(r1.remaining).toBe(4);
    check('ip3');
    const r3 = check('ip3');
    expect(r3.remaining).toBe(2);
  });
});
