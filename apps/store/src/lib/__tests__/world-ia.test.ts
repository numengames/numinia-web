/**
 * S18: does a world's engine take the `ia` block of an AI's pass? Only a world that SAYS 0.29.0 or later
 * (`semver` or an `x.y.z` `version` in its public `/status`) gets it; everything else is a no (fail closed).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IA_NO_TTL_MS,
  IA_YES_TTL_MS,
  engineSemver,
  forgetWorldIa,
  takesIa,
  worldTakesIa,
} from '../world-ia';

const status = (over: Record<string, unknown>) =>
  Response.json({ uptime: 5, conectados: 0, ...over });

describe('what a /status says of the engine', () => {
  it('reads semver, or a version that is itself x.y.z, and nothing else', () => {
    expect(engineSemver({ semver: '0.32.0' })).toEqual([0, 32, 0]);
    expect(engineSemver({ version: 'v1.2.3' })).toEqual([1, 2, 3]);
    expect(engineSemver({ semver: 'x', version: '0.30.1' })).toEqual([0, 30, 1]);
    // The build string and the commit of today's engines say nothing of the order of versions.
    expect(engineSemver({ version: '7e7876f 2026-10-20', commitHash: 'a'.repeat(40) })).toBeNull();
    for (const bad of [
      null,
      undefined,
      'x',
      3,
      [],
      {},
      { semver: 3 },
      { semver: '1.2' },
      { semver: '1.2.3.4' },
    ]) {
      expect(engineSemver(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('takes the block from 0.29.0 up, and not before', () => {
    for (const yes of ['0.29.0', '0.29.1', '0.30.0', '0.32.0', '1.0.0']) {
      expect(takesIa({ semver: yes }), yes).toBe(true);
    }
    for (const no of ['0.28.9', '0.20.0', '0.0.0']) {
      expect(takesIa({ semver: no }), no).toBe(false);
    }
    expect(takesIa({ version: '7e7876f 2026-10-20' })).toBe(false);
    expect(takesIa(null)).toBe(false);
  });
});

describe('asking a world', () => {
  beforeEach(forgetWorldIa);
  const HOST = 'torre.example';

  it('asks its public /status and says yes only to an engine that takes the block', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(status({ semver: '0.32.0' })));
    expect(await worldTakesIa(fetchImpl as unknown as typeof fetch, HOST, 0)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://torre.example/status',
      expect.objectContaining({ headers: expect.objectContaining({ accept: 'application/json' }) }),
    );
    const old = vi.fn(() => Promise.resolve(status({ semver: '0.28.0' })));
    expect(await worldTakesIa(old as unknown as typeof fetch, 'vieja.example', 0)).toBe(false);
  });

  it('says no to a world that does not answer, answers badly or says nothing of its version', async () => {
    const cases: Record<string, () => Promise<Response>> = {
      'down.example': () => Promise.reject(new TypeError('fetch failed')),
      'http.example': () => Promise.resolve(new Response('no', { status: 503 })),
      'junk.example': () => Promise.resolve(new Response('not json')),
      'build.example': () => Promise.resolve(status({ version: '7e7876f 2026-10-20' })),
    };
    for (const [host, answer] of Object.entries(cases)) {
      expect(await worldTakesIa(vi.fn(answer) as unknown as typeof fetch, host, 0), host).toBe(
        false,
      );
    }
  });

  it('keeps a yes five minutes and a no one, so the world is not asked at every pass', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(status({ semver: '0.32.0' })));
    const ask = (at: number) => worldTakesIa(fetchImpl as unknown as typeof fetch, HOST, at);
    expect(await ask(0)).toBe(true);
    expect(await ask(IA_YES_TTL_MS - 1)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(await ask(IA_YES_TTL_MS)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const down = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
    const askDown = (at: number) =>
      worldTakesIa(down as unknown as typeof fetch, 'down.example', at);
    expect(await askDown(0)).toBe(false);
    expect(await askDown(IA_NO_TTL_MS - 1)).toBe(false);
    expect(down).toHaveBeenCalledTimes(1);
    expect(await askDown(IA_NO_TTL_MS)).toBe(false);
    expect(down).toHaveBeenCalledTimes(2);
  });

  it('asks with the clock when none is given', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(status({ semver: '0.29.0' })));
    expect(await worldTakesIa(fetchImpl as unknown as typeof fetch, 'ahora.example')).toBe(true);
  });
});
