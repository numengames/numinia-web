/**
 * The room's side of the fleet's door, against a fake door: the requests it
 * builds (hashed against the digests the machine's own tests verify — the
 * same signatures, made by viem), the answers it reads and trusts only once
 * checked, and the calls, which never throw.
 */

import { hashTypedData, keccak256, recoverTypedDataAddress, stringToBytes } from 'viem';
import { describe, expect, it } from 'vitest';
import fixtureFleet from '../../../fixtures/worlds/fleet.json';
import {
  BEACON_MAX_EVENTS,
  BOOTSTRAP_URL,
  CODE_KINDS,
  FLEET_REF,
  REQUEST_SECONDS,
  REQUEST_TYPES,
  SILENT_AFTER_S,
  SLOW_AFTER_S,
  beaconBody,
  bootstrapLine,
  buildRequest,
  copyDone,
  copyFileUrl,
  doorHost,
  doorUrl,
  formatAgo,
  formatBytes,
  gatherFleet,
  machineHealth,
  mergeLogs,
  newNonce,
  readAccepted,
  readCopy,
  readCopyStatus,
  readDoorLog,
  readDoorWorlds,
  readHeartbeat,
  readListens,
  readMachine,
  readRecipe,
  readRequest,
  readRequestResult,
  sendBeacon,
  sendRequest,
  settled,
  shortSha,
  shortWallet,
  staleRecipe,
  typedData,
  waitFor,
  type BeaconEvent,
  type DoorLogEntry,
  type FleetRequest,
  type Heartbeat,
  type MachineView,
} from '../fleet';
import type { WorldOrder } from '../worlds';

const IMAGE = 'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3';
const EXPIRES = 1893456000;
/**
 * Copied verbatim from the fleet's shared vectors (numinia-assets
 * tests/fleet_vectors.json, made with viem by two throwaway keys of which only
 * the public half is kept): every request kind with its digest, its signature
 * and its signer, a stranger's signature, and the keccak checks. The machine
 * verifies the same file.
 */
const ORACLE = '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357';
const VECTORS = [
  {
    type: 'CreateWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      domain: 'plaza.numinia.com',
      image: 'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3',
      memory: '2g',
      cpus: '1.5',
      maxUploadMb: 50,
      nonce: '0123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x6390352cb3395b9e08c31daaec3288413a5800cef65a6569164809637382ca1d',
    signature:
      '0x0163a3be4285af3dc2bfc5894c3d785af6e826c19e168ed68ee144212b70d1ac61894f6234d6394db325d56685639798723ee752be2217f023636f7f30dc17e31b',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
  {
    type: 'DeleteWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      domain: 'plaza.numinia.com',
      nonce: '1123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x4a05422e004fb6b333ed98bbc3d487bdbd231f0ebbf1e6d12516123f4f890a67',
    signature:
      '0x29042d5fe3a43e6d6c1505a1321b0697735eb1f6457d0bc3acac3cb8f908a4bc31d7162e9f6189378cdede779a841999eabea5f7f55a7522882d4ccdf5339edc1b',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
  {
    type: 'StopWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '2123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xcce8832bb8c525e8a94356bd6e02d9d3e39d4fa88b0d9cf49eff9e7eaf8965d1',
    signature:
      '0x6d55b4b416eff77aea30f35b52f6c432c291bb4c87b3ad124d7165b294cd855375d2ca149e7c358eedf93cac3dd1e4c1c2d020ef943c79deaadbc3064b5f57e51b',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
  {
    type: 'StartWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '3123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xd84f2ea0aea5ef8176282fb8b08b92dfdc169109ed22205f2271d8c372d82a26',
    signature:
      '0xc2c2c679cdaa44d0c13a4db8933d28d169cc34021c892876962f1fc92ea61e824b17fa875eae23b42df971373e94fb3208532288979e4a95f3d079ae5477f9e61c',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
  {
    type: 'DownloadWorld',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '4123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xe03580fe93dd2192b20cd5fe6cba48e25020390d9e46e608440cfd5ec2651a27',
    signature:
      '0x3d53bd6492f9ce6c640e84e96402d027ae04c9f543f71b6d1ff1c2857b2ad631358ae84b2520c393d470df6dd045ab37130b3f5f5da74bd42598f76cda50e1601c',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
  {
    type: 'ShowAdminCode',
    message: { machine: 'open-1', nonce: '5123456789abcdef0123456789abcdef', expires: 1893456000 },
    digest: '0x026533a50e419d03f37105c6f319572c0500f9b65237935ac8670b8dd46ecfe9',
    signature:
      '0x226bc1c63d9efa737ec4d26c1ec5ce46fe426ddb42a2a1271cf0ee56c68afe5b0b19e89e0c85961885d58e48043bad8fd289a8022954313f134758d4ce96a8431c',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
  {
    type: 'ShowWorldCode',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '6123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0xf69173093218a76e67036e4059ad590d73a16d98de0532caf0ab55464aae3dfd',
    signature:
      '0x6433d6a86cc6ee7c2e36e40d774bb4523f51e0faa080534763724242e95034df2e947a5ef3554c3b8aabbe20c74edac34801c98c10c0a6985366eb9412c7fdf01c',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
  {
    type: 'RotateWorldCode',
    message: {
      machine: 'open-1',
      world: 'plaza',
      nonce: '7123456789abcdef0123456789abcdef',
      expires: 1893456000,
    },
    digest: '0x167365fbf09a8fbe0cd684c20bce0ea5e0ceb682a44775f09ebd45137ba1ed82',
    signature:
      '0xcf02e91be201d87d40c7c91dfe35a470e03bfa0c2bf005a918208b1eaae289f127ea8a575a33205d8efae2ee83327f3df716b3b6d9bac7c0ca70300685719c7b1c',
    signer: '0x3687b68889a1eb8a16461ff170b5ebfcf3fa1357',
  },
] as const;
const STRANGER = {
  type: 'StopWorld',
  message: {
    machine: 'open-1',
    world: 'plaza',
    nonce: '2123456789abcdef0123456789abcdef',
    expires: 1893456000,
  },
  signature:
    '0xaed9d07df6f3b548e54f315cfa2d6b0c731ab1244c423db0272e9fa935792c8b4ee3a6c08ff9f9c103139bc1f29517ca00027f54b5ad4fe14316b7100ff0b6481b',
  signer: '0x52c3cea5a0d53727d775a1dff8d994b1083a42ac',
} as const;
const KECCAK = [
  { input: '', hex: '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470' },
  { input: 'abc', hex: '0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45' },
  {
    input: 'Numinia Fleet',
    hex: '0xb16b402dbf9c3f6bbba1d461e221c2198f91541497686217ec102aaa34590238',
  },
  {
    input: 'x'.repeat(200),
    hex: '0x3c3800defb6a25a70a2737e0716eeb5d270559ad3cad8f6abddac58802d7158e',
  },
] as const;

const NOW_MS = (EXPIRES - REQUEST_SECONDS) * 1000;

describe('the requests the room builds', () => {
  it('hashes every kind exactly as the machine does, and each signature recovers to its signer', async () => {
    expect(VECTORS.map((vector) => vector.type)).toEqual(Object.keys(REQUEST_TYPES));
    for (const vector of VECTORS) {
      const request: FleetRequest = { type: vector.type, message: vector.message };
      const data = typedData(request) as unknown as Parameters<typeof hashTypedData>[0];
      expect(hashTypedData(data)).toBe(vector.digest);
      const signer = await recoverTypedDataAddress({ ...data, signature: vector.signature });
      expect(signer.toLowerCase()).toBe(vector.signer);
      expect(vector.signer).toBe(ORACLE);
    }
  });

  it('recovers a stranger’s signature to the stranger, never to the Oracle', async () => {
    const request: FleetRequest = { type: STRANGER.type, message: STRANGER.message };
    const data = typedData(request) as unknown as Parameters<typeof hashTypedData>[0];
    // The very request the Oracle signed in the StopWorld vector, signed by someone else.
    expect(hashTypedData(data)).toBe(VECTORS[2].digest);
    const signer = await recoverTypedDataAddress({ ...data, signature: STRANGER.signature });
    expect(signer.toLowerCase()).toBe(STRANGER.signer);
    expect(signer.toLowerCase()).not.toBe(ORACLE);
  });

  it('hashes text with the keccak the machine checks its own against', () => {
    for (const { input, hex } of KECCAK) expect(keccak256(stringToBytes(input))).toBe(hex);
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
    // A world's own code, shown or changed: the machine, the world, the number, the expiry.
    const show = buildRequest(
      { kind: 'ShowWorldCode', machine: 'open-1', world: 'plaza' },
      VECTORS[6].message.nonce,
      NOW_MS,
    );
    expect(show).toEqual({ type: 'ShowWorldCode', message: VECTORS[6].message });
    expect(Object.keys(show.message)).toEqual(REQUEST_TYPES.ShowWorldCode.map((f) => f.name));
    const rotate = buildRequest(
      { kind: 'RotateWorldCode', machine: 'open-1', world: 'plaza' },
      VECTORS[7].message.nonce,
      NOW_MS,
    );
    expect(rotate).toEqual({ type: 'RotateWorldCode', message: VECTORS[7].message });
    expect(Object.keys(rotate.message)).toEqual(['machine', 'world', 'nonce', 'expires']);
    // The answers that are a code: what the room waits for after the machine takes them.
    expect(CODE_KINDS).toEqual(['ShowAdminCode', 'ShowWorldCode', 'RotateWorldCode']);
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

  it('pins the bootstrap line to one commit of the recipe, and carries the Oracle’s wallet', () => {
    expect(FLEET_REF).toMatch(/^[0-9a-f]{40}$/);
    expect(BOOTSTRAP_URL).toBe(
      `https://raw.githubusercontent.com/numengames/numinia-assets/${FLEET_REF}/open-worlds/machine/bootstrap.sh`,
    );
    expect(bootstrapLine('open-2', '0xabc')).toBe(
      `curl -fsSL https://raw.githubusercontent.com/numengames/numinia-assets/${FLEET_REF}/open-worlds/machine/bootstrap.sh | sudo FLEET_REF=${FLEET_REF} bash -s -- open-2 0xabc`,
    );
    expect(bootstrapLine('open-2', '0xabc')).not.toContain('/main/');
    expect(shortSha('f3de8ddc621bc23fa3aac5b460f0b0d2a62cb388')).toBe('f3de8dd');
  });

  it('shortens a wallet, leaves a short text alone, and sizes files', () => {
    expect(shortWallet(ORACLE)).toBe('0x3687…1357');
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
    // A world's code as the machine makes it (16 hex) is shown; anything off its rule is not.
    expect(readAccepted(202, { request: NONCE, adminCode: '9f2c4e6a8b0d1f37' })).toMatchObject({
      adminCode: '9f2c4e6a8b0d1f37',
    });
    for (const odd of ['short', 'with space 1234', 'x'.repeat(65), 'line\nbreak1234', 7]) {
      expect(readAccepted(202, { request: NONCE, adminCode: odd })).toMatchObject({
        adminCode: null,
      });
    }
  });

  it('names a refusal it knows, and calls anything else unexpected', () => {
    expect(readAccepted(403, { error: 'not-an-oracle-here' })).toEqual({
      ok: false,
      error: 'not-an-oracle-here',
      status: 403,
    });
    // Another change of the same world's code is still waiting on the machine.
    expect(readAccepted(409, { error: 'busy' })).toEqual({ ok: false, error: 'busy', status: 409 });
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
            rule: 'not an Oracle of this machine',
            took: 2,
          },
          {
            at: '2026-10-12T07:30:00Z',
            type: 'StopWorld',
            world: 'plaza',
            by: null,
            state: 'done',
            rule: 'ignored when done',
            took: -1,
          },
          {
            at: '2026-10-12T07:20:00Z',
            type: 'RotateWorldCode',
            world: 'plaza',
            by: '0x3687…1357',
            state: 'done',
            took: 13,
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
        rule: null,
        took: null,
      },
      {
        machine: 'open-1',
        at: '2026-10-12T08:00:00Z',
        type: 'ShowAdminCode',
        world: null,
        by: null,
        state: 'failed',
        rule: 'not an Oracle of this machine',
        took: 2,
      },
      {
        machine: 'open-1',
        at: '2026-10-12T07:30:00Z',
        type: 'StopWorld',
        world: 'plaza',
        by: null,
        state: 'done',
        rule: null,
        took: null,
      },
      {
        machine: 'open-1',
        at: '2026-10-12T07:20:00Z',
        type: 'RotateWorldCode',
        world: 'plaza',
        by: '0x3687…1357',
        state: 'done',
        rule: null,
        took: 13,
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
      rule: null,
      took: null,
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

/** A heartbeat as readHeartbeat returns it: the door's clock, its last run, what waits. */
const HEARTBEAT: Heartbeat = {
  at: '2026-10-12T09:45:00Z',
  lastRun: { at: '2026-10-12T09:44:30Z', ok: true, rule: null },
  waiting: { requests: 0, since: null },
};

describe('reading a machine', () => {
  const WORLDS = 'https://open-1.numinia.com/fleet/v1/worlds';
  const LOG = 'https://open-1.numinia.com/fleet/v1/log';
  const MACHINE = 'https://open-1.numinia.com/fleet/v1/machine';
  const BEAT = {
    machine: 'open-1',
    lastRun: { at: '2026-10-12T09:44:30Z', ok: true, rule: null },
    waiting: { requests: 0, since: null },
    at: '2026-10-12T09:45:00Z',
    listens: ['events', 'something-later'],
    recipe: 'f3de8ddc621bc23fa3aac5b460f0b0d2a62cb388',
  };

  it('reads its worlds, its log, its heartbeat and its recipe through its door', async () => {
    const door = fakeFetch((url) => {
      if (url === WORLDS) return json({ machine: 'open-1', worlds: [listed('plaza', 'running')] });
      if (url === MACHINE) return json(BEAT);
      return json({
        entries: [{ at: 'now', type: 'StopWorld', world: 'plaza', by: null, state: 'done' }],
      });
    });
    const view = await readMachine(door.fetch, 'open-1');
    expect(view).toMatchObject({ alias: 'open-1', open: true });
    expect(view.open && view.worlds.map((world) => world.id)).toEqual(['plaza']);
    expect(view.open && view.log).toHaveLength(1);
    expect(view.open && view.heartbeat).toEqual({
      at: BEAT.at,
      lastRun: BEAT.lastRun,
      waiting: BEAT.waiting,
    });
    expect(view.open && view.listens).toEqual(['events']);
    expect(view.open && view.recipe).toBe(BEAT.recipe);
    expect(door.urls.sort()).toEqual([LOG, MACHINE, WORLDS]);
  });

  it('keeps its worlds when only the log and the heartbeat cannot be read', async () => {
    const door = fakeFetch((url) =>
      url === WORLDS ? json({ worlds: [] }) : new Response('nope', { status: 500 }),
    );
    expect(await readMachine(door.fetch, 'open-1')).toEqual({
      alias: 'open-1',
      open: true,
      worlds: [],
      log: [],
      heartbeat: null,
      listens: [],
      recipe: null,
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
            rule: null,
            took: 12,
          },
        ],
        heartbeat: HEARTBEAT,
        listens: ['events'],
        recipe: FLEET_REF,
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
        heartbeat: null,
        listens: [],
        recipe: null,
      },
      { alias: 'open-3', open: false, reason: 'http', status: 502 },
      { alias: 'open-4', open: false, reason: 'timeout' },
    ];
    const fleet = gatherFleet(views);
    expect(fleet.machines).toEqual([
      {
        alias: 'open-1',
        open: true,
        reason: null,
        heartbeat: HEARTBEAT,
        listens: ['events'],
        recipe: FLEET_REF,
      },
      { alias: 'open-2', open: true, reason: null, heartbeat: null, listens: [], recipe: null },
      {
        alias: 'open-3',
        open: false,
        reason: 'http 502',
        heartbeat: null,
        listens: [],
        recipe: null,
      },
      {
        alias: 'open-4',
        open: false,
        reason: 'timeout',
        heartbeat: null,
        listens: [],
        recipe: null,
      },
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

describe('whether a machine obeys — its door’s heartbeat', () => {
  const AT = '2026-10-12T10:00:00Z';
  /** A heartbeat `run` seconds after the last run (null: none), `waited` seconds after the oldest request. */
  const beat = (
    run: number | null,
    { ok = true, requests = 0, waited = 0, rule = null as string | null } = {},
  ): Heartbeat => ({
    at: AT,
    lastRun:
      run === null ? null : { at: new Date(Date.parse(AT) - run * 1000).toISOString(), ok, rule },
    waiting: {
      requests,
      since: requests > 0 ? new Date(Date.parse(AT) - waited * 1000).toISOString() : null,
    },
  });

  it('reads the door’s heartbeat, and nothing from a door that publishes none', () => {
    expect(
      readHeartbeat({
        machine: 'open-1',
        lastRun: { at: '2026-10-12T09:59:30Z', ok: false, rule: 'x'.repeat(300) },
        waiting: { requests: 2, since: '2026-10-12T09:58:00Z' },
        at: AT,
      }),
    ).toEqual({
      at: AT,
      lastRun: { at: '2026-10-12T09:59:30Z', ok: false, rule: 'x'.repeat(200) },
      waiting: { requests: 2, since: '2026-10-12T09:58:00Z' },
    });
    // A run without a rule, an odd run and an odd `since` are read as nothing.
    expect(
      readHeartbeat({
        lastRun: { at: '2026-10-12T09:59:30.123Z', ok: true, rule: '' },
        waiting: { requests: 0, since: 'yesterday' },
        at: AT,
      }),
    ).toEqual({
      at: AT,
      lastRun: { at: '2026-10-12T09:59:30.123Z', ok: true, rule: null },
      waiting: { requests: 0, since: null },
    });
    expect(
      readHeartbeat({ lastRun: { at: 'now', ok: true }, waiting: { requests: 0 }, at: AT })
        ?.lastRun,
    ).toBeNull();
    expect(
      readHeartbeat({ lastRun: { at: AT, ok: 'yes' }, waiting: { requests: 0 }, at: AT })?.lastRun,
    ).toBeNull();
    // A door older than the heartbeat (no `at`, no `waiting`) says nothing at all.
    expect(readHeartbeat({ machine: 'open-1', door: 'fleetd/1', oracles: 1 })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: null })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: { requests: -1 } })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: { requests: 1.5 } })).toBeNull();
    expect(readHeartbeat({ at: AT, waiting: { requests: '1' } })).toBeNull();
    expect(readHeartbeat(null)).toBeNull();
  });

  it('says a machine obeys while it runs every minute and takes what waits', () => {
    expect(machineHealth(null)).toEqual({ kind: 'unknown' });
    expect(machineHealth(beat(30))).toEqual({ kind: 'ok', ago: 30 });
    expect(machineHealth(beat(30, { requests: 1, waited: 20 }))).toEqual({ kind: 'ok', ago: 30 });
    // A run stamped a moment after the door's own clock is not a negative age.
    expect(machineHealth(beat(-2))).toEqual({ kind: 'ok', ago: 0 });
  });

  it('says it is late after three minutes, and not obeying after ten', () => {
    expect(machineHealth(beat(SLOW_AFTER_S + 60))).toEqual({
      kind: 'slow',
      ago: SLOW_AFTER_S + 60,
      waiting: 0,
    });
    // It ran a moment ago, but a request has waited four minutes.
    expect(machineHealth(beat(20, { requests: 2, waited: 240 }))).toEqual({
      kind: 'slow',
      ago: 20,
      waiting: 2,
    });
    expect(machineHealth(beat(SILENT_AFTER_S + 900, { requests: 1, waited: 60 }))).toEqual({
      kind: 'silent',
      ago: SILENT_AFTER_S + 900,
      waiting: 1,
    });
    // Silence wins over a failed last run: what matters is that it stopped.
    expect(machineHealth(beat(SILENT_AFTER_S + 1, { ok: false }))).toMatchObject({
      kind: 'silent',
    });
  });

  it('says it is failing when its last run could not apply the book', () => {
    expect(machineHealth(beat(40, { ok: false, rule: 'docker did not take the book' }))).toEqual({
      kind: 'failing',
      ago: 40,
      rule: 'docker did not take the book',
    });
  });

  it('judges a machine with no run on record by what waits for it alone', () => {
    expect(machineHealth(beat(null))).toEqual({ kind: 'unknown' });
    expect(machineHealth(beat(null, { requests: 1, waited: 60 }))).toEqual({ kind: 'unknown' });
    expect(machineHealth(beat(null, { requests: 1, waited: 300 }))).toEqual({
      kind: 'slow',
      ago: null,
      waiting: 1,
    });
    expect(machineHealth(beat(null, { requests: 3, waited: 3600 }))).toEqual({
      kind: 'silent',
      ago: null,
      waiting: 3,
    });
  });

  it('writes a span of seconds short', () => {
    expect(formatAgo(45.4)).toBe('45 s');
    expect(formatAgo(-3)).toBe('0 s');
    expect(formatAgo(180)).toBe('3 min');
    expect(formatAgo(1500)).toBe('25 min');
    expect(formatAgo(7200)).toBe('2 h');
    expect(formatAgo(4 * 86_400)).toBe('4 d');
  });
});

describe('which recipe a machine was installed from', () => {
  const OLDER = 'f3de8ddc621bc23fa3aac5b460f0b0d2a62cb388';

  it('reads the commit a door says, and nothing that is not one', () => {
    expect(readRecipe({ machine: 'open-1', recipe: OLDER })).toBe(OLDER);
    expect(readRecipe({ recipe: OLDER.toUpperCase() })).toBeNull();
    expect(readRecipe({ recipe: OLDER.slice(0, 7) })).toBeNull();
    expect(readRecipe({ recipe: `${OLDER}\n` })).toBeNull();
    expect(readRecipe({ recipe: 'main' })).toBeNull();
    expect(readRecipe({ recipe: null })).toBeNull();
    // A door older than the pinned recipe says nothing at all.
    expect(readRecipe({ machine: 'open-1', door: 'fleetd/1' })).toBeNull();
    expect(readRecipe(null)).toBeNull();
  });

  it('asks for a machine’s line again unless it runs the room’s own recipe', () => {
    expect(staleRecipe({ open: true, recipe: FLEET_REF })).toBe(false);
    expect(staleRecipe({ open: true, recipe: OLDER })).toBe(true);
    expect(staleRecipe({ open: true, recipe: null })).toBe(true);
    // A machine whose door does not answer already shows its line.
    expect(staleRecipe({ open: false, recipe: null })).toBe(false);
  });

  it('keeps the hermetic fleet in step: open-1 runs the room’s own recipe, open-2 one from before the pin', () => {
    // FLEET_REF and the fixture's open-1 recipe move together.
    const views = (fixtureFleet as unknown as { readonly machines: readonly MachineView[] })
      .machines;
    const machines = gatherFleet(views).machines;
    expect(machines.map((machine) => [machine.alias, machine.recipe])).toEqual([
      ['open-1', FLEET_REF],
      ['open-2', null],
      ['open-3', null],
    ]);
    expect(machines.map((machine) => staleRecipe(machine))).toEqual([false, true, false]);
  });
});

describe('what the room tells a machine about the browser’s side', () => {
  it('reads what a door listens to, and nothing it does not know', () => {
    expect(readListens({ listens: ['events', 'later', 7] })).toEqual(['events']);
    expect(readListens({ listens: [] })).toEqual([]);
    expect(readListens({ listens: 'events' })).toEqual([]);
    expect(readListens({ machine: 'open-1' })).toEqual([]);
    expect(readListens(null)).toEqual([]);
  });
  const event = (
    step: BeaconEvent['step'],
    ms: number,
    problem: string | null = null,
  ): BeaconEvent => ({
    step,
    type: 'StopWorld',
    problem,
    ms,
  });

  it('writes steps as names and whole milliseconds, never more than the door takes', () => {
    expect(
      JSON.parse(beaconBody([event('asked', 0), event('wallet-refused', 812.6, 'no-wallet')])),
    ).toEqual({
      events: [
        { step: 'asked', type: 'StopWorld', problem: null, ms: 0 },
        { step: 'wallet-refused', type: 'StopWorld', problem: 'no-wallet', ms: 813 },
      ],
    });
    const many = Array.from({ length: BEACON_MAX_EVENTS + 5 }, (_, n) => event('asked', n));
    expect(JSON.parse(beaconBody(many)).events).toHaveLength(BEACON_MAX_EVENTS);
    const odd = JSON.parse(beaconBody([event('late', -5), event('late', 1e12)])).events;
    expect(odd.map((e: { ms: number }) => e.ms)).toEqual([0, 86_400_000]);
  });

  it('hands them to the machine’s door as one text beacon, and never throws', async () => {
    const sent: { url: string; body: Blob }[] = [];
    const send = (url: string, body: Blob): boolean => {
      sent.push({ url, body });
      return true;
    };
    expect(sendBeacon('open-1', [event('asked', 0), event('accepted', 900)], send)).toBe(true);
    expect(sent[0]?.url).toBe('https://open-1.numinia.com/fleet/v1/events');
    expect(sent[0]?.body.type).toBe('text/plain');
    expect(JSON.parse((await sent[0]?.body.text()) ?? '').events).toHaveLength(2);
    // Nothing to say, no beacon in this browser, or a beacon that throws: nothing breaks.
    expect(sendBeacon('open-1', [], send)).toBe(false);
    expect(sendBeacon('open-1', [event('asked', 0)], null)).toBe(false);
    expect(
      sendBeacon('open-1', [event('asked', 0)], () => {
        throw new Error('blocked');
      }),
    ).toBe(false);
    expect(sent).toHaveLength(1);
  });
});
