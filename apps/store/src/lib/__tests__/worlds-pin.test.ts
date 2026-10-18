/**
 * Pinning a world to a build, from the room’s side: who may be offered it,
 * what the Oracle may type, and what the banner lists (lib/worlds.ts).
 */

import { describe, expect, it } from 'vitest';
import {
  buildRows,
  fleetEngine,
  machineTakesPin,
  pinImage,
  pinnedWorlds,
  type EngineRelease,
  type WorldOrder,
} from '../worlds';

const OLD = 'ghcr.io/numengames/numinia-engine:sha-c57dbb7cc4c51b0834184f1dd47b311e47fde234';
const RELEASE: EngineRelease = {
  image: `ghcr.io/numengames/numinia-engine:sha-${'d'.repeat(40)}`,
  commit: 'd'.repeat(40),
  build: 'ddddddd 2026-10-16',
  digest: `sha256:${'e'.repeat(64)}`,
};
const order = (id: string, server: string, image = OLD): WorldOrder => ({
  id,
  card: id,
  state: 'running',
  server,
  domain: `${id}.numinia.com`,
  image,
  limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
});
const PIN = { image: OLD, reason: 'client demo until Friday', at: '' };
const door = (alias: string, open: boolean, listens: readonly ('events' | 'pin')[]) => ({
  alias,
  open,
  listens,
});

describe('machineTakesPin — only a door that says so', () => {
  it('is true for an open door that listens to pin', () => {
    expect(machineTakesPin([door('bronte', true, ['events', 'pin'])], 'bronte')).toBe(true);
  });

  it('is false for a door that does not, one that is closed, or none', () => {
    expect(machineTakesPin([door('bronte', true, ['events'])], 'bronte')).toBe(false);
    expect(machineTakesPin([door('bronte', false, ['pin'])], 'bronte')).toBe(false);
    expect(machineTakesPin([door('open-1', true, ['pin'])], 'bronte')).toBe(false);
    expect(machineTakesPin([], 'bronte')).toBe(false);
  });
});

describe('pinImage — what the Oracle may type', () => {
  const atrium = order('atrium', 'bronte');

  it('turns a short build into an image of the world’s own engine', () => {
    expect(pinImage(atrium, 'sha-0d15ea5')).toBe('ghcr.io/numengames/numinia-engine:sha-0d15ea5');
    expect(pinImage(atrium, '  sha-0d15ea5  ')).toBe(
      'ghcr.io/numengames/numinia-engine:sha-0d15ea5',
    );
  });

  it('takes a whole image of that same engine, by tag or by digest', () => {
    const whole = 'ghcr.io/numengames/numinia-engine:sha-0d15ea5e';
    const digest = `ghcr.io/numengames/numinia-engine@sha256:${'a'.repeat(64)}`;
    expect(pinImage(atrium, whole)).toBe(whole);
    expect(pinImage(atrium, digest)).toBe(digest);
    expect(pinImage(order('atrium', 'bronte', digest), 'sha-0d15ea5')).toBe(
      'ghcr.io/numengames/numinia-engine:sha-0d15ea5',
    );
  });

  it('refuses anything else: another engine, a bad build, a foreign registry, nothing', () => {
    expect(pinImage(atrium, 'ghcr.io/numengames/numinia-hyperfy2:sha-0d15ea5')).toBeNull();
    expect(pinImage(atrium, 'sha-xyz')).toBeNull();
    expect(pinImage(atrium, 'sha-0d15ea')).toBeNull();
    expect(pinImage(atrium, 'latest')).toBeNull();
    expect(pinImage(atrium, '')).toBeNull();
    expect(pinImage(atrium, 'ghcr.io/numengames/numinia-engine:latest')).toBeNull();
    expect(
      pinImage(order('x', 'bronte', 'docker.io/other/engine:sha-0123456'), 'sha-0d15ea5'),
    ).toBeNull();
    expect(pinImage(order('x', 'bronte', 'no-shape'), 'sha-0d15ea5')).toBeNull();
  });
});

describe('the rows of a fleet with pins', () => {
  const orders = [order('atrium', 'bronte'), order('forge', 'open-1')];
  const machines = [door('bronte', true, ['pin']), door('open-1', true, [])].map((machine) => ({
    ...machine,
    reason: null,
    heartbeat: null,
    recipe: null,
    imports: null,
  }));

  it('offers the pin only where the door listens, and carries the pin and the failure', () => {
    const rows = buildRows({
      orders,
      pins: { atrium: PIN },
      updateErrors: { forge: 'health check failed' },
      cards: [],
      probes: {},
      machines,
      engine: RELEASE,
    });
    const atrium = rows.find((row) => row.id === 'atrium');
    const forge = rows.find((row) => row.id === 'forge');
    expect(atrium?.canPin).toBe(true);
    expect(atrium?.pin).toEqual(PIN);
    expect(atrium).not.toHaveProperty('updateError');
    expect(forge).not.toHaveProperty('canPin');
    expect(forge).not.toHaveProperty('pin');
    expect(forge?.updateError).toBe('health check failed');
  });

  it('adds nothing when no door says anything', () => {
    const rows = buildRows({ orders, cards: [], probes: {}, machines: [], engine: RELEASE });
    for (const row of rows) {
      expect(row).not.toHaveProperty('pin');
      expect(row).not.toHaveProperty('canPin');
      expect(row).not.toHaveProperty('updateError');
    }
  });
});

describe('the banner’s laggards and pinned worlds', () => {
  const a = order('atrium', 'bronte');
  const b = order('forge', 'bronte');
  const c = order('hall', 'bronte', RELEASE.image);
  const machines = [{ alias: 'bronte', open: true, updates: true }];

  it('says which laggard is held on purpose and which one failed', () => {
    const got = fleetEngine(
      [
        { id: 'atrium', order: a, pin: PIN, canPin: true },
        { id: 'forge', order: b, updateError: 'health check failed' },
        { id: 'hall', order: c },
      ],
      machines,
      RELEASE,
    );
    expect(got.laggards).toEqual([
      {
        id: 'atrium',
        server: 'bronte',
        build: 'sha-c57dbb7',
        canUpdate: true,
        pinned: { reason: 'client demo until Friday', build: 'sha-c57dbb7' },
        canPin: true,
      },
      {
        id: 'forge',
        server: 'bronte',
        build: 'sha-c57dbb7',
        canUpdate: true,
        failed: 'health check failed',
      },
    ]);
  });

  it('lists every pinned world, a laggard or not, with whether the hold can be lifted', () => {
    const held = { image: RELEASE.image, reason: 'demo', at: '' };
    expect(
      pinnedWorlds([
        { id: 'atrium', order: a, pin: PIN, canPin: true },
        { id: 'hall', order: c, pin: held },
        { id: 'forge', order: b },
        { id: 'gone', order: null, pin: PIN },
      ]),
    ).toEqual([
      { id: 'atrium', server: 'bronte', build: 'sha-c57dbb7', reason: PIN.reason, canPin: true },
      { id: 'hall', server: 'bronte', build: 'sha-ddddddd', reason: 'demo', canPin: false },
    ]);
  });
});
