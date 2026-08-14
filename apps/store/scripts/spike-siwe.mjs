/**
 * SIWE spike verification script — exercises the real endpoint end-to-end
 * with a real key: nonce → sign → verify, plus tampered-signature rejection.
 * Usage: node scripts/spike-siwe.mjs (server must be running on :4321)
 */
import { strict as assert } from 'node:assert';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';

const BASE = process.env.SPIKE_BASE_URL ?? 'http://localhost:4321';

const account = privateKeyToAccount(generatePrivateKey());

// 1. Nonce
const nonceRes = await fetch(`${BASE}/api/auth/siwe`);
assert.equal(nonceRes.status, 200, 'nonce endpoint must answer 200');
const { nonce } = await nonceRes.json();
const nonceCookie = nonceRes.headers.get('set-cookie');
assert.ok(nonce && nonceCookie?.includes('HttpOnly'), 'nonce must be set as httpOnly cookie');

// 2. Sign a real EIP-4361 message
const message = createSiweMessage({
  address: account.address,
  chainId: 1,
  domain: 'localhost',
  nonce,
  uri: `${BASE}/`,
  version: '1',
});
const signature = await account.signMessage({ message });

// 3. Verify — must succeed and issue a session cookie
const okRes = await fetch(`${BASE}/api/auth/siwe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: nonceCookie.split(';')[0] },
  body: JSON.stringify({ message, signature }),
});
assert.equal(okRes.status, 200, `verify must answer 200, got ${okRes.status}`);
const { address } = await okRes.json();
assert.equal(address.toLowerCase(), account.address.toLowerCase());
assert.ok(okRes.headers.get('set-cookie')?.includes('numinia_session'), 'session cookie missing');

// 4. Tampered signature — must fail closed
const badRes = await fetch(`${BASE}/api/auth/siwe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: nonceCookie.split(';')[0] },
  body: JSON.stringify({ message, signature: signature.slice(0, -4) + 'dead' }),
});
assert.equal(badRes.status, 401, `tampered signature must answer 401, got ${badRes.status}`);

// 5. Missing nonce — must fail closed
const noNonceRes = await fetch(`${BASE}/api/auth/siwe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, signature }),
});
assert.equal(noNonceRes.status, 401, `missing nonce must answer 401, got ${noNonceRes.status}`);

process.stdout.write('SIWE SPIKE OK: sign+verify 200, tampered 401, no-nonce 401\n');
