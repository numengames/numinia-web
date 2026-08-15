/**
 * The Oracle rank is CONFIGURED, never claimed: only an address listed in
 * ADMIN_WALLET_ADDRESSES receives it, matching case-insensitively (wallets
 * render checksummed), and the permission ladder must agree that the rank
 * opens management while a Nomad's does not.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasPermission } from '@numinia/domain';

const ORACLE = '0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('THIRDWEB_SECRET_KEY', 'x'.repeat(40));
  vi.stubEnv('AUTH_SESSION_SECRET', 'y'.repeat(40));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('rankForAddress', () => {
  it('grants oracle only to configured wallets, regardless of case', async () => {
    vi.stubEnv('ADMIN_WALLET_ADDRESSES', ORACLE);
    const { rankForAddress } = await import('../auth/server');
    expect(rankForAddress(ORACLE)).toBe('oracle');
    expect(rankForAddress(ORACLE.toLowerCase())).toBe('oracle');
    expect(rankForAddress(ORACLE.toUpperCase())).toBe('oracle');
    expect(rankForAddress('0x0000000000000000000000000000000000000001')).toBe('nomad');
  });

  it('grants nobody the rank when the allowlist is absent or empty', async () => {
    vi.stubEnv('ADMIN_WALLET_ADDRESSES', '');
    const { rankForAddress } = await import('../auth/server');
    expect(rankForAddress(ORACLE)).toBe('nomad');
  });

  it('reads several wallets and ignores spacing noise', async () => {
    vi.stubEnv(
      'ADMIN_WALLET_ADDRESSES',
      ` ${ORACLE} , 0x00000000000000000000000000000000000000ff ,`,
    );
    const { rankForAddress } = await import('../auth/server');
    expect(rankForAddress(ORACLE)).toBe('oracle');
    expect(rankForAddress('0x00000000000000000000000000000000000000FF')).toBe('oracle');
  });
});

describe('the ladder the admin endpoint checks', () => {
  it('opens management to oracle and archon, never below', () => {
    expect(hasPermission('oracle', 'manage-users')).toBe(true);
    expect(hasPermission('archon', 'manage-users')).toBe(true);
    for (const rank of ['nomad', 'citizen', 'pilgrim', 'vernacular'] as const) {
      expect(hasPermission(rank, 'manage-users')).toBe(false);
    }
  });
});
