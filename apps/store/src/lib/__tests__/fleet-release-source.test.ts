import { describe, expect, it, vi } from 'vitest';
import {
  answerRelease,
  boundReleaseDesk,
  releaseDeskFrom,
  type FleetReleaseDeskApi,
} from '../fleet-release-source';

/**
 * The FleetRelease vector, verbatim (numinia-assets tests/fleet_vectors.json;
 * the same record fleet.test.ts hashes and recovers): the route must hand a
 * machine back exactly what the till stored.
 */
const RECORD = {
  message: {
    engine: 'numinia-engine',
    image:
      'ghcr.io/numengames/numinia-engine@sha256:abababababababababababababababababababababababababababababababab',
    commit: 'f4d8475a1c2e9b7d03665f8e1a4b2c9d7e6f5a43',
    seq: 7,
    issuedAt: 1893456000,
  },
  signature:
    '0xcfd95263c120fb1127c676243d30e13e6d8df25b724e518a687e690d04d536f969bebfcbfef9d896f7b96cae36498be4be0f9d6c3c5e55ca22347f33b190c46e1b',
} as const;

const deskOf = (answer: unknown): FleetReleaseDeskApi => ({ latest: async () => answer });
const stored = { ok: true, release: RECORD, publishedAt: '2026-10-18T12:00:00.000Z' };

describe('the desk the route asks', () => {
  it('reads a bound desk as a method of the stub, and nothing else', async () => {
    const binding = {
      seen: 0,
      async latest(this: { seen: number }) {
        this.seen += 1;
        return stored;
      },
    };
    const desk = boundReleaseDesk(binding);
    expect(await desk?.latest()).toEqual(stored);
    expect(binding.seen).toBe(1);
    for (const nothing of [undefined, null, 'desk', 7, {}, { latest: 'no' }]) {
      expect(boundReleaseDesk(nothing)).toBeNull();
    }
    expect(boundReleaseDesk(Object.assign(() => 0, { latest: async () => stored }))).not.toBeNull();
  });

  it('is the bound till, else an empty desk under the fixture, else none', async () => {
    const binding = deskOf(stored);
    expect(await releaseDeskFrom({ binding, dataSource: undefined })?.latest()).toEqual(stored);
    expect(await releaseDeskFrom({ binding: undefined, dataSource: 'fixture' })?.latest()).toEqual({
      ok: true,
      release: null,
      publishedAt: null,
    });
    expect(releaseDeskFrom({ binding: undefined, dataSource: undefined })).toBeNull();
    expect(releaseDeskFrom({ binding: undefined, dataSource: 'live' })).toBeNull();
  });
});

describe('GET /fleet/release.json', () => {
  it('serves the record exactly as machines read it, cached a minute and tagged with its seq', async () => {
    const response = await answerRelease(deskOf(stored), null);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(RECORD);
    expect(response.headers.get('etag')).toBe('"7"');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('answers 304 to a machine that already has that seq, and the record to one that has another', async () => {
    const same = await answerRelease(deskOf(stored), '"7"');
    expect(same.status).toBe(304);
    expect(await same.text()).toBe('');
    expect(same.headers.get('etag')).toBe('"7"');
    expect((await answerRelease(deskOf(stored), '"6"')).status).toBe(200);
  });

  it('serves a pause like any other record', async () => {
    const pause = {
      message: { ...RECORD.message, seq: 8, image: '', commit: '' },
      signature: RECORD.signature,
    };
    const response = await answerRelease(deskOf({ ok: true, release: pause }), null);
    expect(await response.json()).toEqual(pause);
    expect(response.headers.get('etag')).toBe('"8"');
  });

  it('is a 404 before the first publication, and never caches it', async () => {
    const response = await answerRelease(deskOf({ ok: true, release: null }), null);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'no-release' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('is a 503 without a desk', async () => {
    const response = await answerRelease(null, null);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'not-bound' });
  });

  it('is a 502 when the till throws or answers something that is not a record', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const broken = {
      latest: async () => {
        throw new Error('down');
      },
    };
    expect((await answerRelease(broken, null)).status).toBe(502);
    const shapes: unknown[] = [
      undefined,
      'nope',
      { ok: false, problems: ['x'] },
      { ok: true },
      { ok: true, release: 'text' },
      { ok: true, release: { signature: RECORD.signature } },
      { ok: true, release: { message: null, signature: RECORD.signature } },
      {
        ok: true,
        release: { message: { ...RECORD.message, engine: 'other' }, signature: RECORD.signature },
      },
      {
        ok: true,
        release: { message: { ...RECORD.message, seq: '7' }, signature: RECORD.signature },
      },
      {
        ok: true,
        release: { message: { ...RECORD.message, seq: 0 }, signature: RECORD.signature },
      },
      { ok: true, release: { message: RECORD.message, signature: 'sig' } },
      { ok: true, release: { message: RECORD.message } },
    ];
    for (const shape of shapes) {
      const response = await answerRelease(deskOf(shape), null);
      expect(response.status, JSON.stringify(shape)).toBe(502);
    }
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(
      lines.some((line) => line.includes('fleet.release.failed') && line.includes('latest')),
    ).toBe(true);
    expect(lines.every((line) => !line.includes('down') && !line.includes(RECORD.signature))).toBe(
      true,
    );
    log.mockRestore();
  });
});
