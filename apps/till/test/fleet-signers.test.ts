/**
 * The signed FleetSigners record (fleet signers, story B): the pure reader,
 * the signature recovered to the house wallet, and `FleetDesk.signSigners`
 * as numinia.com's binding calls it — dormant without the secret.
 */

import { hashTypedData, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';
import { readSigners, signSigners, SIGNERS_MAX, SIGNERS_PROBLEMS } from '../src/lib/fleet-signers';
import { FleetDesk } from '../src/worker';

/** A throwaway key made for these tests (Anvil's first): only its signatures matter. */
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const HOUSE = privateKeyToAccount(KEY).address.toLowerCase();
const A = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const B = '0xf688e4d5f07e5d0b80d83f201e13cf42d721b489';
const NOW = 1_893_456_000.9;

const DOMAIN = { name: 'Numinia Fleet', version: '1' } as const;
const TYPES = {
  FleetSigners: [
    { name: 'signers', type: 'string' },
    { name: 'seq', type: 'uint256' },
    { name: 'issuedAt', type: 'uint256' },
  ],
} as const;

describe('readSigners', () => {
  it('lower-cases, drops duplicates and sorts', () => {
    expect(readSigners([B.toUpperCase().replace('0X', '0x'), A, B])).toEqual([A, B]);
  });

  it('refuses anything that is not 1 to 200 wallets of 0x and forty hex', () => {
    expect(readSigners('0x')).toBeUndefined();
    expect(readSigners([])).toBeUndefined();
    expect(readSigners([A, 'nope'])).toBeUndefined();
    expect(readSigners([A, 7])).toBeUndefined();
    expect(readSigners([A + '0'])).toBeUndefined();
    const many = Array.from(
      { length: SIGNERS_MAX + 1 },
      (_, i) => `0x${i.toString(16).padStart(40, '0')}`,
    );
    expect(readSigners(many)).toBeUndefined();
    expect(readSigners(many.slice(0, SIGNERS_MAX))).toHaveLength(SIGNERS_MAX);
  });
});

describe('signSigners', () => {
  it('signs the list joined with commas, seq = issuedAt = whole seconds, and the house wallet recovers', async () => {
    const answer = await signSigners(KEY, [B, A, A], NOW);
    if (!answer.ok) throw new Error('expected a record');
    expect(answer.record.message).toEqual({
      signers: [A, B],
      seq: 1893456000,
      issuedAt: 1893456000,
    });
    const message = { signers: `${A},${B}`, seq: 1893456000n, issuedAt: 1893456000n };
    const recovered = await recoverTypedDataAddress({
      domain: DOMAIN,
      types: TYPES,
      primaryType: 'FleetSigners',
      message,
      signature: answer.record.signature as `0x${string}`,
    });
    expect(recovered.toLowerCase()).toBe(HOUSE);
    expect(answer.record.signature).toMatch(/^0x[0-9a-f]{130}$/);
    // The digest a machine's walletsig.py rebuilds (pinned: a change here is a contract change).
    expect(
      hashTypedData({ domain: DOMAIN, types: TYPES, primaryType: 'FleetSigners', message }),
    ).toBe(EXPECTED_DIGEST);
  });

  it('is not-configured without a usable key, before it looks at the list', async () => {
    const dormant = { ok: false, problems: [SIGNERS_PROBLEMS.notConfigured] };
    expect(await signSigners(undefined, [A], NOW)).toEqual(dormant);
    expect(await signSigners('', [A], NOW)).toEqual(dormant);
    expect(await signSigners('0x1234', [A], NOW)).toEqual(dormant);
  });

  it('refuses a bad list in words', async () => {
    expect(await signSigners(KEY, [], NOW)).toEqual({
      ok: false,
      problems: [SIGNERS_PROBLEMS.list],
    });
  });
});

describe("the fleet's shared vector", () => {
  // Copied verbatim from numinia-assets tests/fleet_vectors.json `fleetSigners.records.main`:
  // a public test key that holds nothing, and what the machine's signers.py verifies.
  const VECTOR_KEY = '0x1111111111111111111111111111111111111111111111111111111111111111';
  const WIRE = {
    message: {
      signers: [
        '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1',
        '0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2',
        '0xc3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3',
      ],
      seq: 1893456000,
      issuedAt: 1893456000,
    },
    signature:
      '0x90d1cce697d61ec624a5463375e276dbb02a6857c3f59e81c9cd95c910cc16e6064ae321c5bc1288ba514ac7224b668c755341ca5f693ff0f23a694c1bbff5131b',
  };

  it('signs the machine side’s list into the very same bytes', async () => {
    const shuffled = [WIRE.message.signers[2], WIRE.message.signers[0], WIRE.message.signers[1]];
    const answer = await signSigners(VECTOR_KEY, shuffled, 1893456000);
    expect(answer).toEqual({ ok: true, record: WIRE });
  });
});

describe('FleetDesk.signSigners', () => {
  const ctx = {} as ExecutionContext;
  it('answers not-configured when the till has no FLEET_HOUSE_KEY', async () => {
    const desk = new FleetDesk(ctx, {} as never);
    expect(await desk.signSigners([A])).toEqual({ ok: false, problems: ['not-configured'] });
  });

  it('signs with the secret the till holds', async () => {
    const desk = new FleetDesk(ctx, { FLEET_HOUSE_KEY: KEY } as never);
    const answer = await desk.signSigners([B, A]);
    if (!answer.ok) throw new Error('expected a record');
    expect(answer.record.message.signers).toEqual([A, B]);
    expect(answer.record.message.seq).toBeGreaterThan(1_700_000_000);
    expect(answer.record.message.seq).toBe(answer.record.message.issuedAt);
  });
});

const EXPECTED_DIGEST = '0xdb24a06129eb6c6e208e2ea5140d2ef259b4ec8168b5dce2d6daccd6cd6fa325';
