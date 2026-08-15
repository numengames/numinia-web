/**
 * E2E login proof for MISSION-002 Step 0 (no browser):
 * real key signs a real payload -> our session is issued (rank nomad);
 * replaying the same payload must fail (single-use nonce).
 */
import { createThirdwebClient } from 'thirdweb';
import { signLoginPayload } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';

const BASE = process.env.BASE_URL ?? 'http://localhost:4323';
const client = createThirdwebClient({ clientId: process.env.PUBLIC_THIRDWEB_CLIENT_ID });

// Throwaway local key: never leaves this script.
const privateKey = `0x${'11'.repeat(32)}`;
const account = privateKeyToAccount({ client, privateKey });
console.log('test address:', account.address);

const payload = await (
  await fetch(`${BASE}/api/auth/login?address=${account.address}&chainId=1`)
).json();
const { signature } = await signLoginPayload({ payload, account });

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload, signature }),
});
console.log('login status:', login.status, await login.text());
const cookie = login.headers.get('set-cookie')?.split(';')[0];
console.log('got session cookie:', Boolean(cookie));

const session = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } });
console.log('session status:', session.status, await session.text());

// Replay: same payload + signature again — nonce must already be consumed.
const replay = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload, signature }),
});
console.log('replay status (expect 401):', replay.status);

// Logout drops the cookie; session must be 401 afterwards.
// Origin header simulates the browser (Astro's CSRF check rejects bare POSTs).
const logout = await fetch(`${BASE}/api/auth/logout`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: BASE },
});
console.log('logout status:', logout.status);
// Honest note: replaying the OLD token still validates (stateless HMAC
// sessions have no server-side revocation; the browser simply lost the
// cookie). Real revocation is out of scope for the spike (MISSION-002).
const after = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } });
console.log('old token after logout (200 expected — stateless, no revocation):', after.status);
