/**
 * The signed FleetRelease record (fleet auto-update, story S4): the pure
 * reader, the signer recovered with the fleet's shared vectors, migration
 * 0019 on the D1 shim, and `FleetDesk` as numinia.com's binding calls it.
 */

import { hashTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { latestRelease, publishRelease } from '../src/db/fleet-release';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import {
  RELEASE_PROBLEMS,
  readRelease,
  releaseSigner,
  type ReleaseMessage,
  type SignedRelease,
} from '../src/lib/fleet-release';
import { FleetDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

/**
 * Copied verbatim from the fleet's shared vectors (numinia-assets
 * tests/fleet_vectors.json and numinia.com's fleet.test.ts): the FleetRelease
 * vector, with its digest, signature and signer, plus an UpdateWorld
 * signature by the same Oracle (a signature that is not a FleetRelease's).
 */
const ORACLE = '0xf688e4d5f07e5d0b80d83f201e13cf42d721b489';
const VECTOR = {
  message: {
    engine: 'numinia-engine',
    image:
      'ghcr.io/numengames/numinia-engine@sha256:abababababababababababababababababababababababababababababababab',
    commit: 'f4d8475a1c2e9b7d03665f8e1a4b2c9d7e6f5a43',
    seq: 7,
    issuedAt: 1893456000,
  },
  digest: '0xb577c6cc0d0fc62c3974dd3686d9e7c2e69f810d62a66625f851dd5a1c3f436b',
  signature:
    '0xcfd95263c120fb1127c676243d30e13e6d8df25b724e518a687e690d04d536f969bebfcbfef9d896f7b96cae36498be4be0f9d6c3c5e55ca22347f33b190c46e1b',
  signer: ORACLE,
} as const;
const UPDATE_WORLD_SIGNATURE =
  '0x3b7c12feb755920eb8d43a17d073392ad82e1ecd37a1d806f1b69c2cb6a68ec74a0915321127fefd348218cdebc5e93e314504aa1978c9556cace9a8b92a0ce71c';

const RELEASE: SignedRelease = { message: VECTOR.message, signature: VECTOR.signature };
const NOW = new Date('2026-10-18T12:00:00.000Z');
const ctx = {} as ExecutionContext;

/** A throwaway key made for these tests: only its signatures matter. */
const THROWAWAY = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
);
const TYPES = {
  FleetRelease: [
    { name: 'engine', type: 'string' },
    { name: 'image', type: 'string' },
    { name: 'commit', type: 'string' },
    { name: 'seq', type: 'uint256' },
    { name: 'issuedAt', type: 'uint256' },
  ],
} as const;

/** A FleetRelease the throwaway key signs (a record of its own, not a vector). */
async function signedBy(message: ReleaseMessage): Promise<SignedRelease> {
  const signature = await THROWAWAY.signTypedData({
    domain: { name: 'Numinia Fleet', version: '1' },
    types: TYPES,
    primaryType: 'FleetRelease',
    message: { ...message, seq: BigInt(message.seq), issuedAt: BigInt(message.issuedAt) },
  });
  return { message, signature };
}

const messageAt = (seq: number, over: Partial<ReleaseMessage> = {}): ReleaseMessage => ({
  ...VECTOR.message,
  seq,
  ...over,
});

const refusedWith = (answer: unknown, ...problems: string[]): void => {
  expect(answer).toEqual({ ok: false, problems });
};

describe('the FleetRelease vector', () => {
  it('hashes to the digest the machine verifies, and recovers to the Oracle who signed it', async () => {
    expect(
      hashTypedData({
        domain: { name: 'Numinia Fleet', version: '1' },
        types: TYPES,
        primaryType: 'FleetRelease',
        message: { ...VECTOR.message, seq: 7n, issuedAt: 1893456000n },
      }),
    ).toBe(VECTOR.digest);
    expect(await releaseSigner(RELEASE)).toBe(VECTOR.signer);
  });

  it('recovers a tampered record to somebody else, and a foreign signature to nobody the Oracle is', async () => {
    const tampered = { ...RELEASE, message: { ...VECTOR.message, seq: 8 } };
    const other = await releaseSigner(tampered);
    expect(other).toMatch(/^0x[0-9a-f]{40}$/);
    expect(other).not.toBe(ORACLE);
    const wrongKind = await releaseSigner({ ...RELEASE, signature: UPDATE_WORLD_SIGNATURE });
    expect(wrongKind).not.toBe(ORACLE);
  });

  it('recovers nothing from a signature that is not one', async () => {
    const broken = `0x${'00'.repeat(65)}`;
    expect(await releaseSigner({ ...RELEASE, signature: broken })).toBeUndefined();
  });
});

describe('reading a signed release', () => {
  it('takes the vector, a pause and a lone short commit', () => {
    expect(readRelease(RELEASE)).toEqual(RELEASE);
    const pause = {
      message: { ...VECTOR.message, seq: 8, image: '', commit: '' },
      signature: VECTOR.signature,
    };
    expect(readRelease(pause)).toEqual(pause);
    const short = { ...RELEASE, message: { ...VECTOR.message, commit: 'f4d8475' } };
    expect(readRelease(short)).toEqual(short);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['text', 'release'],
    ['no message', { signature: VECTOR.signature }],
    ['a message that is null', { message: null, signature: VECTOR.signature }],
    ['another engine', { ...RELEASE, message: { ...VECTOR.message, engine: 'numinia-hyperfy2' } }],
    ['a seq of 0', { ...RELEASE, message: { ...VECTOR.message, seq: 0 } }],
    ['a fractional seq', { ...RELEASE, message: { ...VECTOR.message, seq: 1.5 } }],
    ['a seq as text', { ...RELEASE, message: { ...VECTOR.message, seq: '7' } }],
    ['a negative issuedAt', { ...RELEASE, message: { ...VECTOR.message, issuedAt: -1 } }],
    [
      'a moving tag',
      {
        ...RELEASE,
        message: { ...VECTOR.message, image: 'ghcr.io/numengames/numinia-engine:latest' },
      },
    ],
    [
      'another repository by digest',
      {
        ...RELEASE,
        message: {
          ...VECTOR.message,
          image: `ghcr.io/numengames/numinia-hyperfy2@sha256:${'ab'.repeat(32)}`,
        },
      },
    ],
    ['an image that is not text', { ...RELEASE, message: { ...VECTOR.message, image: 7 } }],
    ['a commit that is not text', { ...RELEASE, message: { ...VECTOR.message, commit: 7 } }],
    ['an upper-case commit', { ...RELEASE, message: { ...VECTOR.message, commit: 'F4D8475' } }],
    [
      'a commit that is too short',
      { ...RELEASE, message: { ...VECTOR.message, commit: 'f4d847' } },
    ],
    ['a pause that carries a commit', { ...RELEASE, message: { ...VECTOR.message, image: '' } }],
    ['no signature', { message: VECTOR.message }],
    ['a signature that is short', { ...RELEASE, signature: '0x1234' }],
    [
      'an upper-case signature',
      { ...RELEASE, signature: VECTOR.signature.toUpperCase().replace('0X', '0x') },
    ],
  ])('refuses %s', (_name, value) => {
    expect(readRelease(value)).toBeUndefined();
  });
});

describe('migration 0019: only ever grows, and only in shape', () => {
  const insert = (
    sqlite: ReturnType<typeof migratedTill>['sqlite'],
    values: Record<string, unknown>,
  ): void => {
    const row = {
      engine: 'numinia-engine',
      seq: 1,
      image: VECTOR.message.image,
      commit_sha: VECTOR.message.commit,
      issued_at: 1,
      signature: VECTOR.signature,
      signer: ORACLE,
      published_by: ORACLE,
      published_at: NOW.toISOString(),
      ...values,
    };
    sqlite
      .prepare(
        `INSERT INTO fleet_releases (engine, seq, image, commit_sha, issued_at, signature, signer, published_by, published_at)
         VALUES (:engine, :seq, :image, :commit_sha, :issued_at, :signature, :signer, :published_by, :published_at)`,
      )
      .run(row as never);
  };

  it('takes a record and refuses what the code never writes', () => {
    const { sqlite } = migratedTill();
    insert(sqlite, {});
    insert(sqlite, { seq: 2, image: '', commit_sha: '' });
    expect(() => insert(sqlite, {})).toThrow(); // the same (engine, seq)
    expect(() => insert(sqlite, { seq: 3, engine: 'numinia-hyperfy2' })).toThrow();
    expect(() => insert(sqlite, { seq: 0 })).toThrow();
    expect(() =>
      insert(sqlite, { seq: 3, image: 'ghcr.io/numengames/numinia-engine:latest' }),
    ).toThrow();
    expect(() => insert(sqlite, { seq: 3, commit_sha: '' })).toThrow();
    expect(() => insert(sqlite, { seq: 3, image: '' })).toThrow();
    expect(() => insert(sqlite, { seq: 3, signature: '0x12' })).toThrow();
    expect(() => insert(sqlite, { seq: 3, signer: 'nobody' })).toThrow();
    expect(() => insert(sqlite, { seq: 3, published_by: 'nobody' })).toThrow();
    expect(() => insert(sqlite, { seq: 3, published_at: 'yesterday' })).toThrow();
  });
});

describe('publishing and reading the record', () => {
  it('has nothing before the first publication', async () => {
    const { db } = migratedTill();
    expect(await latestRelease(db)).toEqual({ ok: true, release: null, publishedAt: null });
  });

  it('stores the vector for the house, and serves it back exactly as the machines read it', async () => {
    const { db } = migratedTill();
    expect(await publishRelease(db, ORACLE, true, RELEASE, NOW)).toEqual({
      ok: true,
      seq: 7,
      image: VECTOR.message.image,
      commit: VECTOR.message.commit,
    });
    expect(await latestRelease(db)).toEqual({
      ok: true,
      release: RELEASE,
      publishedAt: NOW.toISOString(),
    });
  });

  it('refuses a seq that is not greater: the same one and an older one', async () => {
    const { db, sqlite } = migratedTill();
    const wallet = THROWAWAY.address.toLowerCase();
    await publishRelease(db, wallet, true, await signedBy(messageAt(7)), NOW);
    refusedWith(
      await publishRelease(db, wallet, true, await signedBy(messageAt(7)), NOW),
      RELEASE_PROBLEMS.stale,
    );
    refusedWith(
      await publishRelease(db, wallet, true, await signedBy(messageAt(3)), NOW),
      RELEASE_PROBLEMS.stale,
    );
    const stored = sqlite.prepare('SELECT seq FROM fleet_releases').all();
    expect(stored).toEqual([{ seq: 7 }]);
  });

  it('goes forward: a pause, then a record that names a digest again, even an old one', async () => {
    const { db } = migratedTill();
    const wallet = THROWAWAY.address.toLowerCase();
    await publishRelease(db, wallet, true, await signedBy(messageAt(7)), NOW);
    const pause = await signedBy(messageAt(8, { image: '', commit: '' }));
    expect(await publishRelease(db, wallet, true, pause, NOW)).toMatchObject({
      ok: true,
      seq: 8,
      image: '',
    });
    expect((await latestRelease(db)).release).toEqual(pause);
    const back = await signedBy(
      messageAt(9, {
        image: `ghcr.io/numengames/numinia-engine@sha256:${'cd'.repeat(32)}`,
        commit: '0123456',
      }),
    );
    expect(await publishRelease(db, wallet, true, back, NOW)).toMatchObject({ ok: true, seq: 9 });
    expect((await latestRelease(db)).release).toEqual(back);
  });

  it('refuses a signature that is not the publishing wallet’s, and a tampered record', async () => {
    const { db, sqlite } = migratedTill();
    // The Oracle's vector, sent by somebody else of the house.
    refusedWith(
      await publishRelease(db, THROWAWAY.address.toLowerCase(), true, RELEASE, NOW),
      RELEASE_PROBLEMS.signer,
    );
    // The Oracle sends it, but the message was changed after signing.
    refusedWith(
      await publishRelease(
        db,
        ORACLE,
        true,
        { ...RELEASE, message: { ...VECTOR.message, seq: 8 } },
        NOW,
      ),
      RELEASE_PROBLEMS.signer,
    );
    refusedWith(
      await publishRelease(
        db,
        ORACLE,
        true,
        { ...RELEASE, signature: `0x${'00'.repeat(65)}` },
        NOW,
      ),
      RELEASE_PROBLEMS.signer,
    );
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM fleet_releases').get()).toEqual({ n: 0 });
  });

  it('is the house’s alone, and names every malformed argument', async () => {
    const { db } = migratedTill();
    refusedWith(await publishRelease(db, ORACLE, false, RELEASE, NOW), RELEASE_PROBLEMS.notHouse);
    refusedWith(
      await publishRelease(db, ORACLE, undefined, RELEASE, NOW),
      RELEASE_PROBLEMS.notHouse,
    );
    refusedWith(
      await publishRelease(db, 'wallet', 'yes', { nothing: true }, NOW),
      PROBLEMS.wallet,
      ORG_PROBLEMS.house,
      RELEASE_PROBLEMS.record,
    );
    expect((await latestRelease(db)).release).toBeNull();
  });
});

describe('FleetDesk, as numinia.com’s binding calls it', () => {
  it('publishes with the house flag and answers the latest to anyone', async () => {
    const { db } = migratedTill();
    const desk = new FleetDesk(ctx, { TILL_DB: db });
    expect((await desk.latest()).release).toBeNull();
    expect(await desk.publish(ORACLE, true, RELEASE)).toMatchObject({ ok: true, seq: 7 });
    refusedWith(await desk.publish(ORACLE, true, RELEASE), RELEASE_PROBLEMS.stale);
    const latest = await desk.latest();
    expect(latest.release).toEqual(RELEASE);
    expect(latest.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
