/**
 * The room's side of the fleet's door, against a fake door: the requests it
 * builds (hashed against the digests the machine's own tests verify — the
 * same signatures, made by viem), the answers it reads and trusts only once
 * checked, and the calls, which never throw.
 */

import { hashTypedData, recoverTypedDataAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_URL,
  REQUEST_SECONDS,
  REQUEST_TYPES,
  bootstrapLine,
  buildRequest,
  copyDone,
  copyFileUrl,
  doorHost,
  doorUrl,
  formatBytes,
  gatherFleet,
  mergeLogs,
  newNonce,
  readAccepted,
  readCopy,
  readCopyStatus,
  readDoorLog,
  readDoorWorlds,
  readMachine,
  readRequest,
  readRequestResult,
  sendRequest,
  settled,
  shortWallet,
  typedData,
  waitFor,
  type DoorLogEntry,
  type FleetRequest,
  type MachineView,
} from '../fleet';
import type { WorldOrder } from '../worlds';

const IMAGE = 'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3';
const EXPIRES = 1893456000;
const SIGNER = '0xc6e2ba381ace7dd1d3a6dbfeeacf42c746f96f12';

/** Copied from numinia-assets tests/fleet_vectors.json, all six kinds: what the machine verifies. */
const VECTORS = [
  {
    type: 'CreateWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      domain: 'plaza.numinia.com',
      image: IMAGE,
      memory: '2g',
      cpus: '1.5',
      maxUploadMb: 50,
      nonce: '0123456789abcdef0123456789abcdef',
      expires: EXPIRES,
    },
    digest: '0x6390352cb3395b9e08c31daaec3288413a5800cef65a6569164809637382ca1d',
    signature:
      '0x98e42891013b9c61fa1a0707f9abf30309eb3684062d3f75a57d8ec14dd898aa195c3861cd07d171da44ec49daba180880949644e5cd8e605e793b9c68d18a821b',
  },
  {
    type: 'DeleteWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      domain: 'plaza.numinia.com',
      nonce: '1123456789abcdef0123456789abcdef',
      expires: EXPIRES,
    },
    digest: '0x4a05422e004fb6b333ed98bbc3d487bdbd231f0ebbf1e6d12516123f4f890a67',
    signature:
      '0x453411454d0c4959030fde4744932fc42deb55940cb609be14809e120e786c66479ff7f9c2baade4c40ff492126a008d0e892a914f53f43567a8b647e49b57a71b',
  },
  {
    type: 'StopWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '2123456789abcdef0123456789abcdef',
      expires: EXPIRES,
    },
    digest: '0xcce8832bb8c525e8a94356bd6e02d9d3e39d4fa88b0d9cf49eff9e7eaf8965d1',
    signature:
      '0xc587c0cb42dd9d36e0c4609f2e59336ef5c678527697f37c3ce1fa0cfc152ec86d2b5827ef3a8209345bf3b3b0c3aae9434698b55aa69b6360ab6b0e1d31602b1c',
  },
  {
    type: 'StartWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '3123456789abcdef0123456789abcdef',
      expires: EXPIRES,
    },
    digest: '0xd84f2ea0aea5ef8176282fb8b08b92dfdc169109ed22205f2271d8c372d82a26',
    signature:
      '0x3f2253feae91261b27b0607cd3ad8e9bb7e4009724fa86cdbdc742ca8cc3b43d13515c02a25be5407170ee78d5e47269db551460c2624c301cb2302b825f58321b',
  },
  {
    type: 'DownloadWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '4123456789abcdef0123456789abcdef',
      expires: EXPIRES,
    },
    digest: '0xe03580fe93dd2192b20cd5fe6cba48e25020390d9e46e608440cfd5ec2651a27',
    signature:
      '0x46c4d29055fdfef8f33fe351b6856ee5597f40e539dfe8eeaf08c3f0424383515c6685d43a149c1971720458e7bc34789ce1a69ca1d42d77225fdd3c33f223701c',
  },
  {
    type: 'ShowAdminCode',
    message: { machine: 'open-1', nonce: '5123456789abcdef0123456789abcdef', expires: EXPIRES },
    digest: '0x026533a50e419d03f37105c6f319572c0500f9b65237935ac8670b8dd46ecfe9',
    signature:
      '0xc228770e517934ab79d4e1caf53b5978e1d4c441c43c5b6998158c8bedc2373309b8bc2462ef73314bfe07e12a0541bfd2385b2cafc26738252e1ea022a561211c',
  },
] as const;

const NOW_MS = (EXPIRES - REQUEST_SECONDS) * 1000;

describe('the requests the room builds', () => {
  it('hashes exactly as the machine does, and the machine’s signatures recover to their signer', async () => {
    for (const vector of VECTORS) {
      const request: FleetRequest = { type: vector.type, message: vector.message };
      const data = typedData(request) as unknown as Parameters<typeof hashTypedData>[0];
      expect(hashTypedData(data)).toBe(vector.digest);
      const signer = await recoverTypedDataAddress({ ...data, signature: vector.signature });
      expect(signer.toLowerCase()).toBe(SIGNER);
    }
  });

  it('writes each request with the machine’s fields, in the type’s order, good for ten minutes', () => {
    const create = buildRequest(
      {
        kind: 'CreateWorld',
        machine: 'open-1',
        world: 'plaza',
        domain: 'plaza.numinia.com',
        image: IMAGE,
        memory: '2g',
        cpus: '1.5',
        maxUploadMb: 50,
      },
      VECTORS[0].message.nonce,
      NOW_MS + 999,
    );
    expect(create).toEqual({ type: 'CreateWorld', message: VECTORS[0].message });
    expect(Object.keys(create.message)).toEqual(REQUEST_TYPES.CreateWorld.map((f) => f.name));
    const del = buildRequest(
      { kind: 'DeleteWorld', machine: 'open-1', world: 'plaza', domain: 'plaza.numinia.com' },
      VECTORS[1].message.nonce,
      NOW_MS,
    );
    expect(del.message).toEqual(VECTORS[1].message);
    const code = buildRequest({ kind: 'ShowAdminCode', machine: 'open-1' }, 'n', NOW_MS);
    expect(code).toEqual({
      type: 'ShowAdminCode',
      message: { machine: 'open-1', nonce: 'n', expires: EXPIRES },
    });
    for (const kind of ['StopWorld', 'StartWorld', 'DownloadWorld'] as const) {
      expect(
        Object.keys(buildRequest({ kind, machine: 'open-1', world: 'w' }, 'n', NOW_MS).message),
      ).toEqual(['machine', 'world', 'nonce', 'expires']);
    }
  });

  it('gives the wallet whole numbers as bigints and everything else as text', () => {
    const data = typedData({ type: 'CreateWorld', message: VECTORS[0].message });
    expect(data.domain).toEqual({ name: 'Numinia Fleet', version: '1' });
    expect(data.primaryType).toBe('CreateWorld');
    expect(Object.keys(data.types)).toEqual(['CreateWorld']);
    expect(data.message['maxUploadMb']).toBe(50n);
    expect(data.message['expires']).toBe(BigInt(EXPIRES));
    expect(data.message['cpus']).toBe('1.5');
  });

  it('numbers each request with 128 random bits', () => {
    expect(newNonce((bytes) => bytes.fill(171))).toBe('ab'.repeat(16));
    const a = newNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newNonce()).not.toBe(a);
  });
});

describe('addresses and small words', () => {
  it('finds each machine’s door at its own name', () => {
    expect(doorHost('open-1')).toBe('open-1.numinia.com');
    expect(doorUrl('open-1', 'worlds')).toBe('https://open-1.numinia.com/fleet/v1/worlds');
    expect(copyFileUrl('open-1', 'c'.repeat(32))).toBe(
      `https://open-1.numinia.com/fleet/v1/copies/${'c'.repeat(32)}/file`,
    );
  });

  it('writes the bootstrap line with the Oracle’s wallet', () => {
    expect(bootstrapLine('open-2', '0xabc')).toBe(
      `curl -fsSL ${BOOTSTRAP_URL} | sudo bash -s -- open-2 0xabc`,
    );
  });

  it('shortens a wallet, leaves a short text alone, and sizes files', () => {
    expect(shortWallet(SIGNER)).toBe('0xc6e2…6f12');
    expect(shortWallet('0x1234')).toBe('0x1234');
    expect(formatBytes(840)).toBe('840 B');
    expect(formatBytes(12_700)).toBe('12.4 KB');
    expect(formatBytes(3_250_000)).toBe('3.1 MB');
    expect(formatBytes(1_300_000_000)).toBe('1.2 GB');
    expect(formatBytes(5 * 1024 ** 4)).toBe('5120.0 GB');
  });
});

describe('what the door answers, checked before it is believed', () => {
  const NONCE = 'a'.repeat(32);

  it('reads a request taken, with the admin code or the copy number', () => {
    expect(readAccepted(202, { request: NONCE, adminCode: 'code1234' })).toEqual({
      ok: true,
      request: NONCE,
      adminCode: 'code1234',
      copy: null,
    });
    expect(readAccepted(202, { request: NONCE, copy: 'b'.repeat(32), adminCode: '' })).toEqual({
      ok: true,
      request: NONCE,
      adminCode: null,
      copy: 'b'.repeat(32),
    });
    expect(readAccepted(202, { request: NONCE, copy: '../x' })).toMatchObject({ copy: null });
  });

  it('names a refusal it knows, and calls anything else unexpected', () => {
    expect(readAccepted(403, { error: 'not-an-oracle-here' })).toEqual({
      ok: false,
      error: 'not-an-oracle-here',
      status: 403,
    });
    expect(readAccepted(500, { error: 'boom' })).toMatchObject({ error: 'unexpected' });
    expect(readAccepted(202, { request: 'short' })).toMatchObject({ ok: false, status: 202 });
    expect(readAccepted(502, null)).toMatchObject({ error: 'unexpected', status: 502 });
  });

  it('reads how a request went', () => {
    expect(readRequestResult({ state: 'done', rule: null })).toEqual({ state: 'done', rule: null });
    expect(readRequestResult({ state: 'failed', rule: 'expired' })).toEqual({
      state: 'failed',
      rule: 'expired',
    });
    expect(readRequestResult({ state: 'lost' })).toBeNull();
    expect(readRequestResult({ state: 3 })).toBeNull();
    expect(readRequestResult('done')).toBeNull();
    expect(settled({ state: 'done', rule: null })).toBe(true);
    expect(settled({ state: 'failed', rule: 'x' })).toBe(true);
    expect(settled({ state: 'working', rule: null })).toBe(false);
  });

  it('reads a copy, keeping only what has its shape', () => {
    const sha = 'f'.repeat(64);
    expect(
      readCopyStatus({
        state: 'ready',
        bytes: 2048,
        sha256: sha,
        filename: 'plaza-20261012-0941.zip',
        expiresAt: '2026-10-13T09:41:00Z',
      }),
    ).toEqual({
      state: 'ready',
      bytes: 2048,
      sha256: sha,
      filename: 'plaza-20261012-0941.zip',
      expiresAt: '2026-10-13T09:41:00Z',
    });
    expect(
      readCopyStatus({ state: 'preparing', bytes: -1, sha256: 'nope', filename: '', expiresAt: 4 }),
    ).toEqual({ state: 'preparing', bytes: null, sha256: null, filename: null, expiresAt: null });
    expect(readCopyStatus({ state: 'ready', bytes: 1.5 })).toMatchObject({ bytes: null });
    expect(readCopyStatus({ state: 'gone' })).toBeNull();
    expect(readCopyStatus(null)).toBeNull();
    expect(
      copyDone({ state: 'preparing', bytes: null, sha256: null, filename: null, expiresAt: null }),
    ).toBe(false);
    expect(
      copyDone({ state: 'failed', bytes: null, sha256: null, filename: null, expiresAt: null }),
    ).toBe(true);
  });
});

const order = (id: string, extra: Partial<WorldOrder> = {}): WorldOrder => ({
  id,
  card: id,
  state: 'running',
  server: 'open-1',
  domain: `${id}.numinia.com`,
  image: IMAGE,
  limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
  ...extra,
});

/** A world as the door lists it: the order's fields without card or server, plus its phase. */
const listed = (id: string, phase: string, extra: Record<string, unknown> = {}) => {
  const { card: _card, server: _server, ...fields } = order(id);
  return { ...fields, phase, ...extra };
};

describe('a machine’s worlds and its log', () => {
  it('reads each world of the machine, its phase and its order', () => {
    const worlds = readDoorWorlds(
      {
        worlds: [
          listed('plaza', 'running'),
          listed('foro', 'stopping'),
          listed('token-hall', 'creating'),
          { id: 'vieja', domain: 'vieja.numinia.com', phase: 'deleting' },
          { id: 'rota', domain: 'not a host', phase: 'deleting' },
          listed('mal', 'running', { image: 'x:latest' }),
          listed('raro', 'flying'),
          { ...listed('Upper', 'running') },
          'junk',
        ],
      },
      'open-1',
    );
    expect(worlds).toEqual([
      { id: 'plaza', phase: 'running', order: order('plaza'), domain: 'plaza.numinia.com' },
      { id: 'foro', phase: 'stopping', order: order('foro'), domain: 'foro.numinia.com' },
      // A name that looks like a key word is still a world: each field was checked one by one.
      {
        id: 'token-hall',
        phase: 'creating',
        order: order('token-hall'),
        domain: 'token-hall.numinia.com',
      },
      { id: 'vieja', phase: 'deleting', order: null, domain: 'vieja.numinia.com' },
      { id: 'rota', phase: 'deleting', order: null, domain: null },
    ]);
    expect(readDoorWorlds({ worlds: 'none' }, 'open-1')).toBeNull();
    expect(readDoorWorlds(null, 'open-1')).toBeNull();
  });

  it('reads what the machine did, and drops lines it does not recognise', () => {
    const log = readDoorLog(
      {
        entries: [
          {
            at: '2026-10-12T09:00:00Z',
            type: 'CreateWorld',
            world: 'plaza',
            by: '0x42e6…ca26',
            state: 'done',
          },
          {
            at: '2026-10-12T08:00:00Z',
            type: 'ShowAdminCode',
            world: null,
            by: null,
            state: 'failed',
          },
          { at: '2026-10-12T07:00:00Z', type: 'RebootMachine', state: 'done' },
          { at: 7, type: 'StopWorld', state: 'done' },
          { at: '2026-10-12T06:00:00Z', type: 'StopWorld', world: '../x', state: 'working' },
          'junk',
        ],
      },
      'open-1',
    );
    expect(log).toEqual([
      {
        machine: 'open-1',
        at: '2026-10-12T09:00:00Z',
        type: 'CreateWorld',
        world: 'plaza',
        by: '0x42e6…ca26',
        state: 'done',
      },
      {
        machine: 'open-1',
        at: '2026-10-12T08:00:00Z',
        type: 'ShowAdminCode',
        world: null,
        by: null,
        state: 'failed',
      },
    ]);
    expect(readDoorLog({ entries: {} }, 'open-1')).toEqual([]);
    expect(readDoorLog(null, 'open-1')).toEqual([]);
  });

  it('merges several machines’ logs, newest first, up to a limit', () => {
    const line = (machine: string, at: string): DoorLogEntry => ({
      machine,
      at,
      type: 'StopWorld',
      world: 'w',
      by: null,
      state: 'done',
    });
    const merged = mergeLogs(
      [
        [line('open-1', '2026-10-12T09:00:00Z'), line('open-1', '2026-10-10T09:00:00Z')],
        [line('open-2', '2026-10-11T09:00:00Z')],
      ],
      2,
    );
    expect(merged.map((entry) => `${entry.machine} ${entry.at.slice(0, 10)}`)).toEqual([
      'open-1 2026-10-12',
      'open-2 2026-10-11',
    ]);
  });
});

type Route = (url: string, init: RequestInit | undefined) => Response | Error;

function fakeFetch(route: Route): { fetch: typeof fetch; urls: string[]; bodies: unknown[] } {
  const urls: string[] = [];
  const bodies: unknown[] = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    urls.push(String(input));
    if (typeof init?.body === 'string') bodies.push(JSON.parse(init.body));
    const answer = route(String(input), init);
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { fetch: impl as typeof fetch, urls, bodies };
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });
const named = (name: string): Error => Object.assign(new Error(name), { name });

describe('reading a machine', () => {
  const WORLDS = 'https://open-1.numinia.com/fleet/v1/worlds';
  const LOG = 'https://open-1.numinia.com/fleet/v1/log';

  it('reads its worlds and its log through its door', async () => {
    const door = fakeFetch((url) =>
      url === WORLDS
        ? json({ machine: 'open-1', worlds: [listed('plaza', 'running')] })
        : json({
            entries: [{ at: 'now', type: 'StopWorld', world: 'plaza', by: null, state: 'done' }],
          }),
    );
    const view = await readMachine(door.fetch, 'open-1');
    expect(view).toMatchObject({ alias: 'open-1', open: true });
    expect(view.open && view.worlds.map((world) => world.id)).toEqual(['plaza']);
    expect(view.open && view.log).toHaveLength(1);
    expect(door.urls.sort()).toEqual([LOG, WORLDS]);
  });

  it('keeps its worlds when only the log cannot be read', async () => {
    const door = fakeFetch((url) =>
      url === WORLDS ? json({ worlds: [] }) : new Response('nope', { status: 500 }),
    );
    expect(await readMachine(door.fetch, 'open-1')).toEqual({
      alias: 'open-1',
      open: true,
      worlds: [],
      log: [],
    });
  });

  it('says why a door could not be read', async () => {
    const cases: [Route, unknown][] = [
      [() => new Response('{}', { status: 502 }), { reason: 'http', status: 502 }],
      [() => named('TimeoutError'), { reason: 'timeout' }],
      [() => named('AbortError'), { reason: 'timeout' }],
      [() => new TypeError('fetch failed'), { reason: 'network' }],
      [() => new Response('<html>', { status: 200 }), { reason: 'shape' }],
      [() => json({ worlds: 'none' }), { reason: 'shape' }],
    ];
    for (const [route, expected] of cases) {
      const view = await readMachine(fakeFetch(route).fetch, 'open-1', 50);
      expect(view).toMatchObject({ alias: 'open-1', open: false, ...(expected as object) });
    }
    const thrown = fakeFetch(() => {
      throw 'not an error';
    });
    expect(await readMachine(thrown.fetch, 'open-1')).toMatchObject({ reason: 'network' });
  });
});

describe('gatherFleet — several doors, one fleet', () => {
  it('lists every machine, every world with its phase, the worlds leaving and one history', () => {
    const views: MachineView[] = [
      {
        alias: 'open-1',
        open: true,
        worlds: [
          { id: 'plaza', phase: 'stopping', order: order('plaza'), domain: 'plaza.numinia.com' },
          { id: 'vieja', phase: 'deleting', order: null, domain: null },
        ],
        log: [
          {
            machine: 'open-1',
            at: '2026-10-12T09:00:00Z',
            type: 'StopWorld',
            world: 'plaza',
            by: null,
            state: 'done',
          },
        ],
      },
      {
        alias: 'open-2',
        open: true,
        worlds: [
          {
            id: 'plaza',
            phase: 'running',
            order: order('plaza', { server: 'open-2' }),
            domain: 'plaza.numinia.com',
          },
          {
            id: 'foro',
            phase: 'running',
            order: order('foro', { server: 'open-2' }),
            domain: 'foro.numinia.com',
          },
        ],
        log: [],
      },
      { alias: 'open-3', open: false, reason: 'http', status: 502 },
      { alias: 'open-4', open: false, reason: 'timeout' },
    ];
    const fleet = gatherFleet(views);
    expect(fleet.machines).toEqual([
      { alias: 'open-1', open: true, reason: null },
      { alias: 'open-2', open: true, reason: null },
      { alias: 'open-3', open: false, reason: 'http 502' },
      { alias: 'open-4', open: false, reason: 'timeout' },
    ]);
    // A name belongs to the first machine that holds it.
    expect(fleet.orders.map((o) => `${o.id}@${o.server}`)).toEqual(['plaza@open-1', 'foro@open-2']);
    expect(fleet.phases).toEqual({ plaza: 'stopping', foro: 'running' });
    expect(fleet.leaving).toEqual([{ id: 'vieja', server: 'open-1', domain: null }]);
    expect(fleet.history).toHaveLength(1);
    expect(gatherFleet(views, 0).history).toEqual([]);
  });
});

describe('the calls', () => {
  const NONCE = 'a'.repeat(32);
  const request: FleetRequest = {
    type: 'StopWorld',
    message: { machine: 'open-1', world: 'plaza', nonce: NONCE, expires: EXPIRES },
  };

  it('hands a signed request to its machine’s door, as JSON', async () => {
    const door = fakeFetch((url, init) => {
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
      return json({ request: NONCE }, 202);
    });
    expect(await sendRequest(door.fetch, request, '0xsig')).toEqual({
      ok: true,
      request: NONCE,
      adminCode: null,
      copy: null,
    });
    expect(door.urls).toEqual(['https://open-1.numinia.com/fleet/v1/actions']);
    expect(door.bodies).toEqual([
      { type: 'StopWorld', message: request.message, signature: '0xsig' },
    ]);
  });

  it('never throws: an unreachable door and an unreadable answer are named', async () => {
    const down = fakeFetch(() => new TypeError('fetch failed'));
    expect(await sendRequest(down.fetch, request, '0xsig')).toEqual({
      ok: false,
      error: 'unreachable',
      status: 0,
    });
    const garbled = fakeFetch(() => new Response('<html>', { status: 502 }));
    expect(await sendRequest(garbled.fetch, request, '0xsig')).toEqual({
      ok: false,
      error: 'unexpected',
      status: 502,
    });
  });

  it('asks how a request and a copy are going; null when the door does not say', async () => {
    const door = fakeFetch((url) =>
      url.endsWith(`/requests/${NONCE}`)
        ? json({ request: NONCE, state: 'working', rule: null })
        : json({ copy: 'c'.repeat(32), state: 'preparing' }),
    );
    expect(await readRequest(door.fetch, 'open-1', NONCE)).toEqual({
      state: 'working',
      rule: null,
    });
    expect(await readCopy(door.fetch, 'open-1', 'c'.repeat(32))).toMatchObject({
      state: 'preparing',
    });
    expect(door.urls).toEqual([
      `https://open-1.numinia.com/fleet/v1/requests/${NONCE}`,
      `https://open-1.numinia.com/fleet/v1/copies/${'c'.repeat(32)}`,
    ]);
    const missing = fakeFetch(() => json({ error: 'not-found' }, 404));
    expect(await readRequest(missing.fetch, 'open-1', NONCE)).toBeNull();
    expect(await readCopy(missing.fetch, 'open-1', 'c'.repeat(32))).toBeNull();
  });
});

describe('waitFor — asking again until the machine is done', () => {
  it('returns as soon as the answer is final', async () => {
    let asked = 0;
    const answer = await waitFor(
      async () => {
        asked += 1;
        return asked < 3 ? (asked === 1 ? null : 'working') : 'done';
      },
      (value) => value === 'done',
      { intervalMs: 1, timeoutMs: 5000 },
    );
    expect(answer).toBe('done');
    expect(asked).toBe(3);
  });

  it('gives the last answer when the time runs out, or null if there was none', async () => {
    let clock = 0;
    const waiting = {
      intervalMs: 10,
      timeoutMs: 25,
      now: () => clock,
      sleep: async (ms: number) => {
        clock += ms;
      },
    };
    expect(
      await waitFor(
        async () => 'working',
        () => false,
        waiting,
      ),
    ).toBe('working');
    clock = 0;
    expect(
      await waitFor(
        async () => null,
        () => false,
        waiting,
      ),
    ).toBeNull();
  });

  it('stops when the wait is cancelled', async () => {
    let asked = 0;
    const answer = await waitFor(
      async () => {
        asked += 1;
        return 'working';
      },
      () => false,
      { intervalMs: 1, timeoutMs: 5000, cancelled: () => asked >= 2 },
    );
    expect(answer).toBe('working');
    expect(asked).toBe(2);
  });
});
