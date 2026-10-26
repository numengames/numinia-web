import { describe, expect, it, vi } from 'vitest';
import type { Rank } from '@numinia/domain';
import { StateConflictError } from '@numinia/state';
import { answerGrant, type DeskDeps } from '../census-desk';

const w = (n: number) => `0x${n.toString(16).padStart(40, '0')}`;
const OWNER = w(1);
const ARCHON = w(2);
const TARGET = w(30);
const NOW = Date.UTC(2026, 9, 26, 12, 0);

function desk(
  over: {
    records?: Record<string, { rank: Rank; appointedBy?: string; since?: string }>;
    verify?: boolean;
    fresh?: boolean;
    write?: ReturnType<typeof vi.fn>;
    list?: () => Promise<string[]>;
  } = {},
) {
  const records = over.records ?? {};
  const write = over.write ?? vi.fn(async () => 'sha2');
  const log = vi.fn();
  const deps: DeskDeps = {
    store: {
      read: async (path: string) => {
        const wallet = path.slice('census/'.length, -'.json'.length);
        const rec = records[wallet];
        return rec
          ? {
              record: {
                wallet,
                since: '2026-10-01T00:00:00.000Z',
                updatedAt: '2026-10-01T00:00:00.000Z',
                actor: OWNER,
                ...rec,
              },
              sha: `sha-${wallet.slice(-2)}`,
            }
          : null;
      },
      list: over.list ?? (async () => Object.keys(records).map((k) => `${k}.json`)),
      write,
    } as never,
    owners: new Set([OWNER]),
    fresh:
      over.fresh === false
        ? null
        : { secret: 's'.repeat(40), verify: async () => over.verify ?? true, now: () => NOW },
    now: () => NOW,
    log,
  };
  return { deps, write, log };
}

const owner = { wallet: OWNER, rank: 'oracle' as Rank };
const archon = { wallet: ARCHON, rank: 'archon' as Rank };

describe('answerGrant', () => {
  it('refuses a body it cannot read', async () => {
    const res = await answerGrant(desk().deps, owner, { wallet: 'nope', rank: 'archon' }, null);
    expect(res.status).toBe(400);
    expect((await answerGrant(desk().deps, owner, null, null)).status).toBe(400);
  });

  it('writes an ordinary grant as a commit and logs the change', async () => {
    const { deps, write, log } = desk();
    const res = await answerGrant(deps, archon, { wallet: TARGET, rank: 'vernacular' }, null);
    expect(res.status).toBe(201);
    expect(write).toHaveBeenCalledWith(
      `census/${TARGET}.json`,
      expect.objectContaining({ rank: 'vernacular', actor: ARCHON }),
      { message: `census: ${TARGET} becomes vernacular`, actor: ARCHON },
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'authz_change', from: 'nomad', to: 'vernacular' }),
    );
  });

  it('updates an existing record, keeping the date it began', async () => {
    const { deps, write } = desk({
      records: { [TARGET]: { rank: 'citizen', since: '2026-01-01T00:00:00.000Z' } },
    });
    const res = await answerGrant(
      deps,
      archon,
      { wallet: TARGET.toUpperCase().replace('0X', '0x'), rank: 'pilgrim' },
      null,
    );
    expect(res.status).toBe(200);
    expect(write.mock.calls[0]?.[1]).toMatchObject({ since: '2026-01-01T00:00:00.000Z' });
    expect(write.mock.calls[0]?.[2]).toMatchObject({ sha: expect.stringContaining('sha-') });
  });

  it('nobody acts upward: an Archon cannot lower another Archon', async () => {
    const { deps, write } = desk({ records: { [TARGET]: { rank: 'archon' } } });
    const res = await answerGrant(deps, archon, { wallet: TARGET, rank: 'nomad' }, null);
    expect(res.status).toBe(403);
    expect(write).not.toHaveBeenCalled();
  });

  it('an Archon cannot appoint an Oracle', async () => {
    const res = await answerGrant(desk().deps, archon, { wallet: TARGET, rank: 'oracle' }, null);
    expect(res.status).toBe(403);
  });

  it('asks the owner to sign again before appointing, then writes it with the owner behind it', async () => {
    const { deps, write, log } = desk();
    const first = await answerGrant(deps, owner, { wallet: TARGET, rank: 'oracle' }, 1);
    expect(first.status).toBe(428);
    const { sign } = (await first.json()) as { sign: { message: string; token: string } };
    expect(sign.message).toContain('appoint an Oracle');
    expect(write).not.toHaveBeenCalled();

    const second = await answerGrant(
      deps,
      owner,
      { wallet: TARGET, rank: 'oracle', fresh: { token: sign.token, signature: '0xsig' } },
      1,
    );
    expect(second.status).toBe(201);
    expect(write.mock.calls[0]?.[1]).toMatchObject({ rank: 'oracle', appointedBy: OWNER });
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ to: 'oracle' }));
  });

  it('refuses a signature that does not check out, or a proof for another act', async () => {
    const bad = desk({ verify: false });
    const first = await answerGrant(bad.deps, owner, { wallet: TARGET, rank: 'oracle' }, null);
    const { sign } = (await first.json()) as { sign: { token: string } };
    const res = await answerGrant(
      bad.deps,
      owner,
      { wallet: TARGET, rank: 'oracle', fresh: { token: sign.token, signature: '0xsig' } },
      null,
    );
    expect(res.status).toBe(403);
    const other = await answerGrant(
      bad.deps,
      owner,
      { wallet: w(31), rank: 'oracle', fresh: { token: sign.token, signature: '0xsig' } },
      null,
    );
    expect(other.status).toBe(403);
    expect(bad.write).not.toHaveBeenCalled();
  });

  it('removing an Oracle is signed again too, and says so', async () => {
    const { deps } = desk({ records: { [TARGET]: { rank: 'oracle', appointedBy: OWNER } } });
    const res = await answerGrant(deps, owner, { wallet: TARGET, rank: 'archon' }, null);
    expect(res.status).toBe(428);
    expect(((await res.json()) as { sign: { message: string } }).sign.message).toContain(
      'stops being an Oracle',
    );
  });

  it('cannot sign when signing is not configured', async () => {
    const res = await answerGrant(
      desk({ fresh: false }).deps,
      owner,
      { wallet: TARGET, rank: 'oracle' },
      null,
    );
    expect(res.status).toBe(503);
  });

  it('stops at four Oracles, and appoints nobody when they cannot be counted', async () => {
    const records: Record<string, { rank: Rank; appointedBy: string }> = {};
    for (const n of [40, 41, 42]) records[w(n)] = { rank: 'oracle', appointedBy: OWNER };
    const full = await answerGrant(
      desk({ records }).deps,
      owner,
      { wallet: TARGET, rank: 'oracle' },
      null,
    );
    expect(full.status).toBe(409);
    const blind = await answerGrant(
      desk({
        list: async () => {
          throw new Error('down');
        },
      }).deps,
      owner,
      { wallet: TARGET, rank: 'oracle' },
      null,
    );
    expect(blind.status).toBe(503);
  });

  it('retries once on a concurrent write, then gives up', async () => {
    const once = vi
      .fn()
      .mockRejectedValueOnce(new StateConflictError('p'))
      .mockResolvedValueOnce('s');
    expect(
      (
        await answerGrant(
          desk({ write: once }).deps,
          archon,
          { wallet: TARGET, rank: 'citizen' },
          null,
        )
      ).status,
    ).toBe(201);
    const twice = vi.fn().mockRejectedValue(new StateConflictError('p'));
    await expect(
      answerGrant(desk({ write: twice }).deps, archon, { wallet: TARGET, rank: 'citizen' }, null),
    ).rejects.toBeInstanceOf(StateConflictError);
    const other = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(
      answerGrant(desk({ write: other }).deps, archon, { wallet: TARGET, rank: 'citizen' }, null),
    ).rejects.toThrow('boom');
  });
});
