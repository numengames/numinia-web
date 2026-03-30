import { NextResponse } from 'next/server';
import { generateNonce } from 'siwe';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const nonce = generateNonce();

  const cookieStore = await cookies();
  cookieStore.set({
    name: 'siwe_nonce',
    value: nonce,
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  });

  return NextResponse.json({ nonce });
}
