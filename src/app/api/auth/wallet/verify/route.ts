import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    // Verify the SIWE signature
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check nonce matches the one we stored in the cookie
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get('siwe_nonce');

    if (!nonceCookie || nonceCookie.value !== siweMessage.nonce) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 401 });
    }

    // Check if the address is in the admin allowlist
    const address = siweMessage.address.toLowerCase();

    if (env.adminWalletAddresses.length > 0 && !env.adminWalletAddresses.includes(address)) {
      return NextResponse.json({ error: 'Address not authorized' }, { status: 403 });
    }

    // Create admin session
    cookieStore.set({
      name: 'admin_session',
      value: JSON.stringify({
        address: siweMessage.address, // preserve original checksum case
        role: 'admin',
        authenticatedAt: new Date().toISOString(),
      }),
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Clean up the nonce cookie
    cookieStore.delete('siwe_nonce');

    return NextResponse.json({
      success: true,
      address: siweMessage.address,
    });
  } catch (error) {
    console.error('SIWE verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
