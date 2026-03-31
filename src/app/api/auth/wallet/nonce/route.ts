import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from 'siwe';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { nonceRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const rl = nonceRateLimit(getRateLimitKey(request));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const nonce = generateNonce();

  const cookieStore = await cookies();
  cookieStore.set({
    name: 'siwe_nonce',
    value: nonce,
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict',
    maxAge: 60 * 5,
    path: '/',
  });

  return NextResponse.json({ nonce });
}
