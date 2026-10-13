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
  runtimeBinding,
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

describe('runtimeBinding', () => {
  it('hands back an object binding as workerd holds it (a service binding)', () => {
    const desk = { read: () => 'desk' };
    primeRuntimeEnv({ TILL_ORACLE: desk });
    expect(runtimeBinding('TILL_ORACLE')).toBe(desk);
  });

  it('hands back a callable binding too (an RPC stub may be a function)', () => {
    const stub = Object.assign(() => undefined, { read: () => 'desk' });
    primeRuntimeEnv({ TILL_ORACLE: stub });
    expect(runtimeBinding('TILL_ORACLE')).toBe(stub);
  });

  it('never mistakes a string, a number, null or nothing for a binding', () => {
    primeRuntimeEnv({ TILL_ORACLE: 'numinia-till', COUNT: 3, NOTHING: null });
    expect(runtimeBinding('TILL_ORACLE')).toBeUndefined();
    expect(runtimeBinding('COUNT')).toBeUndefined();
    expect(runtimeBinding('NOTHING')).toBeUndefined();
    expect(runtimeBinding('MISSING')).toBeUndefined();
  });

  it('outside workerd only strings exist: no binding', () => {
    vi.stubEnv('TILL_ORACLE', 'a string from the shell');
    expect(runtimeBinding('TILL_ORACLE')).toBeUndefined();
  });
});
