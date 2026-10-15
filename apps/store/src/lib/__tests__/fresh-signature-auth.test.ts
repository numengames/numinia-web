/**
 * The Worker's half of the fresh signature (STD-051, ORG-008), wired in
 * lib/auth/server.ts: the session secret, the clock and thirdweb's check.
 * An ordinary wallet's signature is checked offline — these tests touch no
 * network; a smart account's would ask thirdweb's RPC, which is the one
 * path left to check by hand on numinia.com.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createThirdwebClient } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('THIRDWEB_SECRET_KEY', 'x'.repeat(40));
  vi.stubEnv('AUTH_SESSION_SECRET', 'y'.repeat(40));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/** A wallet of its own for each test: a random key, never one written down. */
function testWallet() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return privateKeyToAccount({ client: createThirdwebClient({ clientId: 'test' }), privateKey });
}

describe('the fresh signature, wired to the Worker', () => {
  it('checks an ordinary wallet’s signature offline: its own lines pass, nothing else does', async () => {
    const { verifyWalletSignature } = await import('../auth/server');
    const wallet = testWallet();
    const address = wallet.address.toLowerCase();
    const message = 'Numinia · Numen Games';
    const signature = await wallet.signMessage({ message });
    const check = (overrides: object) =>
      verifyWalletSignature({ message, signature, address, chainId: null, ...overrides });
    expect(await check({})).toBe(true);
    expect(await check({ message: 'Numinia · another organization' })).toBe(false);
    expect(await check({ address: `0x${'ab'.repeat(20)}` })).toBe(false);
    // An ordinary wallet passes before any chain is asked: still no network.
    expect(await check({ chainId: 137 })).toBe(true);
  });

  it('hands out the session secret, the check and the clock — nothing when auth is not configured', async () => {
    const { freshSignatureDeps, verifyWalletSignature } = await import('../auth/server');
    const deps = freshSignatureDeps();
    expect(deps?.secret).toBe('y'.repeat(40));
    expect(deps?.verify).toBe(verifyWalletSignature);
    expect(Math.abs((deps?.now() ?? 0) - Date.now())).toBeLessThan(5_000);
    vi.resetModules();
    vi.stubEnv('AUTH_SESSION_SECRET', '');
    const unconfigured = await import('../auth/server');
    expect(unconfigured.freshSignatureDeps()).toBeNull();
  });
});
