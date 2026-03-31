import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { SiweMessage } from 'siwe';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { signSession, generateCsrfToken } from '@/lib/session';
import { authRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rl = authRateLimit(getRateLimitKey(request));
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

    // Verify signature with domain + nonce binding
    const expectedDomain = env.isProd ? 'numinia.store' : new URL(env.siteUrl || 'http://localhost:3000').host;
    const result = await siweMessage.verify({
      signature,
      domain: expectedDomain,
      nonce: nonceCookie.value,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid signature or domain' }, { status: 401 });
    }

    // Determine role: admin if in whitelist, user otherwise
    const address = siweMessage.address.toLowerCase();
    const isAdmin = env.adminWalletAddresses.length > 0 && env.adminWalletAddresses.includes(address);
    const role = isAdmin ? 'admin' : 'user';

    // Create session — admin gets admin_session cookie, all users get user_session
    if (isAdmin) {
      cookieStore.set({
        name: 'admin_session',
        value: signSession({
          address: siweMessage.address,
          role: 'admin',
          authenticatedAt: new Date().toISOString(),
        }),
        httpOnly: true,
        secure: env.isProd,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
    }

    // All wallets (admin + user) get a user_session cookie
    cookieStore.set({
      name: 'user_session',
      value: signSession({
        address: siweMessage.address,
        role,
        authenticatedAt: new Date().toISOString(),
      }),
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // CSRF token — non-httpOnly so JS can read it and send as header
    cookieStore.set({
      name: 'csrf_token',
      value: generateCsrfToken(),
      httpOnly: false,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    // Clean up the nonce cookie
    cookieStore.delete('siwe_nonce');

    logAudit({ action: 'login', actor: siweMessage.address, metadata: { role, method: 'wallet' } });

    return NextResponse.json({
      success: true,
      address: siweMessage.address,
      role,
    });
  } catch (error) {
    console.error('SIWE verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
