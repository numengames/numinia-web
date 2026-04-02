import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { SiweMessage } from 'siwe';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { signSession, generateCsrfToken } from '@/lib/session';
import { authRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { computeRankForAddress } from '@/lib/auth/resolveRank';
import { registerWalletUser } from '@/lib/rank-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/wallet/verify');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rl = await authRateLimit(getRateLimitKey(request));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } });

  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    // Verify the SIWE signature
    const siweMessage = new SiweMessage(message);
    // Verify nonce from cookie BEFORE signature verification
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get('siwe_nonce');
    if (!nonceCookie) {
      return NextResponse.json({ error: 'No nonce cookie' }, { status: 401 });
    }

    // Verify signature with nonce binding
    // Domain check: accept numinia.store and www.numinia.store in prod
    const allowedDomains = env.isProd
      ? ['numinia.store', 'www.numinia.store']
      : [new URL(env.siteUrl || 'http://localhost:3000').host, 'localhost:3000'];

    const result = await siweMessage.verify({
      signature,
      nonce: nonceCookie.value,
    });

    // Validate domain manually (verify() doesn't support multiple domains)
    if (result.success && !allowedDomains.includes(siweMessage.domain)) {
      cookieStore.delete('siwe_nonce');
      return NextResponse.json({ error: 'Invalid domain' }, { status: 401 });
    }

    if (!result.success) {
      cookieStore.delete('siwe_nonce');
      return NextResponse.json({ error: 'Invalid signature or domain' }, { status: 401 });
    }

    // Determine role: admin if in whitelist, user otherwise
    const address = siweMessage.address.toLowerCase();
    const isAdmin = env.adminWalletAddresses.length > 0 && env.adminWalletAddresses.includes(address);
    const role = isAdmin ? 'admin' : 'user';

    // Compute rank from overrides + env var + season progress
    const rank = await computeRankForAddress(address, role);

    // Create session — admin gets admin_session cookie, all users get user_session
    if (isAdmin) {
      cookieStore.set({
        name: 'admin_session',
        value: signSession({
          address: siweMessage.address,
          role: 'admin',
          rank,
          authenticatedAt: new Date().toISOString(),
        }),
        httpOnly: true,
        secure: env.isProd,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days (consistent with user_session)
        path: '/',
      });
    }

    // All wallets (admin + user) get a user_session cookie
    cookieStore.set({
      name: 'user_session',
      value: signSession({
        address: siweMessage.address,
        role,
        rank,
        authenticatedAt: new Date().toISOString(),
      }),
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days (consistent with GitHub OAuth session)
      path: '/',
    });

    // CSRF token — non-httpOnly so JS can read it and send as header
    cookieStore.set({
      name: 'csrf_token',
      value: generateCsrfToken(),
      httpOnly: false,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days (consistent with session)
      path: '/',
    });

    // Clean up the nonce cookie
    cookieStore.delete('siwe_nonce');

    // Register wallet in user registry + audit log (must await in serverless)
    await registerWalletUser(address);
    await logAudit({ action: 'login', actor: siweMessage.address, metadata: { role, rank, method: 'wallet' } });

    return NextResponse.json({
      success: true,
      address: siweMessage.address,
      role,
      rank,
    });
  } catch (error) {
    log.error({ err: error }, 'SIWE verify error');
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
