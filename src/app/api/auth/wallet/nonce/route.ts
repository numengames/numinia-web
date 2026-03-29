import { NextResponse } from 'next/server';
import { generateNonce } from 'siwe';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Generates a nonce for SIWE (Sign-In with Ethereum) and stores it
// in an httpOnly cookie. The verify endpoint will check the nonce
// to prevent replay attacks.
export async function GET() {
  const nonce = generateNonce();

  const cookieStore = await cookies();
  cookieStore.set({
    name: 'siwe_nonce',
    value: nonce,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  });

  return NextResponse.json({ nonce });
}
