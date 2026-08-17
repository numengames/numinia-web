/**
 * runtimeEnv() must reach the REAL environment at request time. The
 * Cloudflare build statically freezes every process.env expression to `{}`
 * (this is how auth shipped permanently "not configured" to production), so
 * on workerd the middleware primes this module with the adapter's
 * locals.runtime.env; everywhere else the globalThis fallback answers.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  primeFromWorkerd,
  primeRuntimeEnv,
  resetRuntimeEnvForTests,
  runtimeEnv,
} from '../runtime-env';

afterEach(() => {
  resetRuntimeEnvForTests();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('runtimeEnv', () => {
  it('answers the primed adapter env first — the workerd path', () => {
    primeRuntimeEnv({ AUTH_SESSION_SECRET: 'from-the-worker' });
    expect(runtimeEnv().AUTH_SESSION_SECRET).toBe('from-the-worker');
  });

  it('ignores priming with non-objects (fail closed on adapter surprises)', () => {
    primeRuntimeEnv(undefined);
    primeRuntimeEnv(null);
    primeRuntimeEnv('not-an-env');
    vi.stubEnv('RUNTIME_ENV_PROBE', 'fallback-still-works');
    expect(runtimeEnv().RUNTIME_ENV_PROBE).toBe('fallback-still-works');
  });

  it('falls back to the live process env when nothing primed', () => {
    vi.stubEnv('RUNTIME_ENV_PROBE', 'visible');
    expect(runtimeEnv().RUNTIME_ENV_PROBE).toBe('visible');
  });

  it('returns an empty object when no process global exists (fail closed)', () => {
    vi.stubGlobal('process', undefined);
    expect(runtimeEnv()).toEqual({});
  });

  it('primeFromWorkerd is a harmless no-op outside workerd', async () => {
    await primeFromWorkerd(); // cloudflare:workers cannot resolve here
    vi.stubEnv('RUNTIME_ENV_PROBE', 'fallback-survives');
    expect(runtimeEnv().RUNTIME_ENV_PROBE).toBe('fallback-survives');
  });

  it('adopts the workerd env when the virtual module resolves', async () => {
    vi.doMock('cloudflare:workers', () => ({ env: { FROM_WORKERD: 'yes' } }));
    await primeFromWorkerd();
    expect(runtimeEnv().FROM_WORKERD).toBe('yes');
    vi.doUnmock('cloudflare:workers');
  });

  it('attempts the workerd import only once per isolate', async () => {
    vi.doMock('cloudflare:workers', () => ({ env: { FROM_WORKERD: 'first' } }));
    await primeFromWorkerd();
    vi.doMock('cloudflare:workers', () => ({ env: { FROM_WORKERD: 'second' } }));
    await primeFromWorkerd(); // guard: no re-import, first env stays
    expect(runtimeEnv().FROM_WORKERD).toBe('first');
    vi.doUnmock('cloudflare:workers');
  });

  it('reset restores the fallback path — priming does not leak across tests', () => {
    primeRuntimeEnv({ RUNTIME_ENV_PROBE: 'primed' });
    resetRuntimeEnvForTests();
    vi.stubEnv('RUNTIME_ENV_PROBE', 'fallback');
    expect(runtimeEnv().RUNTIME_ENV_PROBE).toBe('fallback');
  });
});
