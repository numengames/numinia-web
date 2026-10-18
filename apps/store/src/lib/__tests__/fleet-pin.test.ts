/**
 * The pin and the self-updating pass, as the room reads them from a
 * machine's door and asks for them: `listens`, `release`, a world's `pin`
 * and `updateError` (numinia-assets fleetd.py) and the PinWorld request.
 */

import { describe, expect, it } from 'vitest';
import {
  buildRequest,
  gatherFleet,
  readDoorWorlds,
  readListens,
  readMachine,
  readPin,
  readRelease,
  readUpdateError,
  validReason,
  type MachineView,
} from '../fleet';

const IMAGE = 'ghcr.io/numengames/numinia-engine:sha-c57dbb7cc4c51b0834184f1dd47b311e47fde234';
const OTHER = 'ghcr.io/numengames/numinia-engine:sha-0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e';

const world = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  phase: 'running',
  state: 'running',
  domain: `${id}.numinia.com`,
  image: IMAGE,
  limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
  ...extra,
});

describe('what a door listens to', () => {
  it('reads the beacons’ list and the pin’s map', () => {
    expect(readListens({ listens: ['events', 'later', 7] })).toEqual(['events']);
    expect(readListens({ listens: ['pin', 'events'] })).toEqual(['events', 'pin']);
    expect(readListens({ listens: { pin: true } })).toEqual(['pin']);
    expect(readListens({ listens: { pin: true, events: true, later: true } })).toEqual([
      'events',
      'pin',
    ]);
  });

  it('takes only a map entry that is true, and nothing from anything else', () => {
    expect(readListens({ listens: { pin: false, events: 'yes' } })).toEqual([]);
    expect(readListens({ listens: 'pin' })).toEqual([]);
    expect(readListens({ listens: null })).toEqual([]);
    expect(readListens({})).toEqual([]);
    expect(readListens('pin')).toEqual([]);
  });
});

describe('the reason of a pin', () => {
  it('is one line of 1 to 200 characters with no control character', () => {
    expect(validReason('client demo until Friday')).toBe(true);
    expect(validReason('x'.repeat(200))).toBe(true);
    expect(validReason('')).toBe(false);
    expect(validReason('x'.repeat(201))).toBe(false);
    expect(validReason('two\nlines')).toBe(false);
    expect(validReason('tab\there')).toBe(false);
    expect(validReason('bell\u007f')).toBe(false);
  });
});

describe('a world’s pin and its failed update', () => {
  it('reads a pin whose build is the house’s own shape', () => {
    expect(readPin({ image: OTHER, reason: 'demo', at: '2026-10-18T10:00:00Z' })).toEqual({
      image: OTHER,
      reason: 'demo',
      at: '2026-10-18T10:00:00Z',
    });
    expect(readPin({ image: OTHER, reason: 'demo' })?.at).toBe('');
    expect(readPin({ image: OTHER, reason: 'demo', at: 'not\na time' })?.at).toBe('');
  });

  it('drops a pin that is not plain', () => {
    expect(readPin(null)).toBeNull();
    expect(readPin({ image: 'x:latest', reason: 'demo' })).toBeNull();
    expect(readPin({ image: 7, reason: 'demo' })).toBeNull();
    expect(readPin({ image: OTHER, reason: '' })).toBeNull();
    expect(readPin({ image: OTHER, reason: 3 })).toBeNull();
  });

  it('reads the words of a failed update, or none', () => {
    expect(readUpdateError('health check failed')).toBe('health check failed');
    expect(readUpdateError('')).toBeNull();
    expect(readUpdateError('a\nb')).toBeNull();
    expect(readUpdateError(4)).toBeNull();
  });

  it('attaches both to the world they belong to, and only then', () => {
    const read = readDoorWorlds(
      {
        worlds: [
          world('atrium', {
            pin: { image: OTHER, reason: 'demo', at: '2026-10-18T10:00:00Z' },
            updateError: 'health check failed',
          }),
          world('plaza'),
          world('torn', { pin: { image: 'nope', reason: 'x' }, updateError: '' }),
        ],
      },
      'open-1',
    );
    expect(read?.[0]).toMatchObject({
      id: 'atrium',
      pin: { image: OTHER, reason: 'demo' },
      updateError: 'health check failed',
    });
    expect(read?.[1]).not.toHaveProperty('pin');
    expect(read?.[1]).not.toHaveProperty('updateError');
    expect(read?.[2]).not.toHaveProperty('pin');
    expect(read?.[2]).not.toHaveProperty('updateError');
  });
});

describe('the machine’s self-updating pass', () => {
  const RELEASE = {
    target: OTHER,
    commit: '0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e',
    halted: true,
    haltedReason: 'atrium did not answer',
    lastPass: { at: '2026-10-18T09:40:30Z', action: 'rolled-back' },
  };

  it('reads the target, the halt with its reason and the last pass', () => {
    expect(readRelease({ release: RELEASE })).toEqual(RELEASE);
    expect(
      readRelease({
        release: { target: null, commit: null, halted: false, haltedReason: null, lastPass: null },
      }),
    ).toEqual({ target: null, commit: null, halted: false, haltedReason: null, lastPass: null });
  });

  it('keeps what is plain and nulls what is not', () => {
    expect(
      readRelease({
        release: {
          target: 'latest',
          commit: 'XYZ',
          halted: 'yes',
          haltedReason: 'two\nlines',
          lastPass: { at: '2026-10-18T09:40:30Z', action: 'a\nb' },
        },
      }),
    ).toEqual({ target: null, commit: null, halted: false, haltedReason: null, lastPass: null });
    expect(
      readRelease({ release: { ...RELEASE, lastPass: { at: 'free text!', action: 'x' } } })
        ?.lastPass,
    ).toBeNull();
    expect(
      readRelease({ release: { ...RELEASE, lastPass: { at: 4, action: 'x' } } })?.lastPass,
    ).toBeNull();
    expect(readRelease({ release: { ...RELEASE, lastPass: 'now' } })?.lastPass).toBeNull();
    expect(readRelease({ release: { ...RELEASE, haltedReason: 5 } })?.haltedReason).toBeNull();
  });

  it('says nothing for a machine older than the pass', () => {
    expect(readRelease({})).toBeNull();
    expect(readRelease({ release: 'halted' })).toBeNull();
    expect(readRelease(null)).toBeNull();
  });

  it('reads through the door: listens, release, and each world’s pin', async () => {
    const door = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.endsWith('/worlds')) {
        return new Response(
          JSON.stringify({
            worlds: [world('atrium', { pin: { image: OTHER, reason: 'demo', at: '' } })],
          }),
        );
      }
      if (url.endsWith('/machine')) {
        return new Response(JSON.stringify({ listens: { pin: true }, release: RELEASE }));
      }
      return new Response(JSON.stringify({ entries: [] }));
    }) as typeof fetch;
    const view = await readMachine(door, 'open-1');
    expect(view.open && view.listens).toEqual(['pin']);
    expect(view.open && view.release).toEqual(RELEASE);
    expect(view.open && view.worlds[0]?.pin?.reason).toBe('demo');
  });
});

describe('the fleet gathered from doors that pin', () => {
  const views: MachineView[] = [
    {
      alias: 'bronte',
      open: true,
      worlds: [
        {
          id: 'atrium',
          phase: 'running',
          order: {
            id: 'atrium',
            card: 'atrium',
            state: 'running',
            server: 'bronte',
            domain: 'atrium.numinia.com',
            image: IMAGE,
            limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
          },
          domain: 'atrium.numinia.com',
          upload: null,
          pin: { image: OTHER, reason: 'demo', at: '' },
          updateError: 'health check failed',
        },
      ],
      log: [],
      heartbeat: null,
      listens: ['pin'],
      recipe: null,
      imports: null,
      release: {
        target: OTHER,
        commit: null,
        halted: true,
        haltedReason: 'atrium did not answer',
        lastPass: null,
      },
    },
    {
      alias: 'open-1',
      open: true,
      worlds: [],
      log: [],
      heartbeat: null,
      listens: [],
      recipe: null,
      imports: null,
    },
    { alias: 'open-3', open: false, reason: 'timeout' },
  ];

  it('collects pins and failed updates by world, and each machine’s release', () => {
    const fleet = gatherFleet(views);
    expect(fleet.pins).toEqual({ atrium: { image: OTHER, reason: 'demo', at: '' } });
    expect(fleet.updateErrors).toEqual({ atrium: 'health check failed' });
    expect(fleet.machines[0]?.release?.haltedReason).toBe('atrium did not answer');
    expect(fleet.machines[0]?.listens).toEqual(['pin']);
    expect(fleet.machines[1]).not.toHaveProperty('release');
    expect(fleet.machines[2]).not.toHaveProperty('release');
  });
});

describe('the PinWorld request', () => {
  const ASK = { kind: 'PinWorld', machine: 'open-1', world: 'plaza' } as const;

  it('carries the build and the reason, in the type’s order', () => {
    const request = buildRequest(
      { ...ASK, image: OTHER, reason: 'demo' },
      'a'.repeat(32),
      1_000_000,
    );
    expect(request.type).toBe('PinWorld');
    expect(Object.keys(request.message)).toEqual([
      'machine',
      'world',
      'image',
      'reason',
      'nonce',
      'expires',
    ]);
    expect(request.message['reason']).toBe('demo');
  });

  it('lifts the hold with an empty build, and still says why', () => {
    const request = buildRequest(
      { ...ASK, image: '', reason: 'demo over' },
      'b'.repeat(32),
      1_000_000,
    );
    expect(request.message['image']).toBe('');
    expect(request.message['reason']).toBe('demo over');
  });
});
