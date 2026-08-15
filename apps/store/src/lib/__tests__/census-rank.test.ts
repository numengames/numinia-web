/**
 * resolveRank (ADR-018): the allowlist Oracle wins; otherwise the census
 * remembers; everything else — outage, absence, poison — lands on Nomad.
 * Privilege fails closed: no path grants more than what is provable.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORACLE = '0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26';
const CITIZEN = '0x0000000000000000000000000000000000000abc';

const readMock = vi.fn();

vi.mock('../state/server', () => ({
  getStateStore: () => ({ read: readMock }),
  stateConfigured: () => true,
  resetStateStoreForTests: () => undefined,
}));

beforeEach(() => {
  vi.resetModules();
  readMock.mockReset();
  vi.stubEnv('THIRDWEB_SECRET_KEY', 'x'.repeat(40));
  vi.stubEnv('AUTH_SESSION_SECRET', 'y'.repeat(40));
  vi.stubEnv('ADMIN_WALLET_ADDRESSES', ORACLE);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

function censusRecord(rank: string) {
  return {
    record: {
      wallet: CITIZEN,
      rank,
      since: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
      actor: ORACLE.toLowerCase(),
    },
    sha: 'sha',
  };
}

describe('resolveRank', () => {
  it('the allowlist Oracle wins without consulting the census', async () => {
    const { resolveRank } = await import('../auth/server');
    expect(await resolveRank(ORACLE)).toBe('oracle');
    expect(readMock).not.toHaveBeenCalled();
  });

  it('the census remembers a granted rank, looked up in lowercase', async () => {
    readMock.mockResolvedValueOnce(censusRecord('vernacular'));
    const { resolveRank } = await import('../auth/server');
    expect(await resolveRank(CITIZEN.toUpperCase().replace('0X', '0x'))).toBe('vernacular');
    expect(String(readMock.mock.calls[0]?.[0])).toBe(`census/${CITIZEN}.json`);
  });

  it('no record means Nomad', async () => {
    readMock.mockResolvedValueOnce(null);
    const { resolveRank } = await import('../auth/server');
    expect(await resolveRank(CITIZEN)).toBe('nomad');
  });

  it('a census outage grants nothing above Nomad', async () => {
    readMock.mockRejectedValueOnce(new Error('state repo down'));
    const { resolveRank } = await import('../auth/server');
    expect(await resolveRank(CITIZEN)).toBe('nomad');
  });

  it('a poisoned census can never mint an Oracle (ADR-011: allowlist only)', async () => {
    readMock.mockResolvedValueOnce(censusRecord('oracle'));
    const { resolveRank } = await import('../auth/server');
    expect(await resolveRank(CITIZEN)).toBe('nomad');
  });
});
