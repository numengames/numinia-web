import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getThirdwebAuth, TW_JWT_COOKIE } from '@/lib/thirdweb-auth';
import { env } from '@/lib/env';
import { mapRoleToRank } from '@/lib/rank';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();

  // Check Thirdweb JWT
  const twJwt = cookieStore.get(TW_JWT_COOKIE)?.value;
  if (twJwt) {
    const auth = getThirdwebAuth();
    if (auth) {
      try {
        const result = await auth.verifyJWT({ jwt: twJwt });
        if (result.valid && result.parsedJWT.sub) {
          const address = result.parsedJWT.sub;
          const isAdmin = env.adminWalletAddresses.includes(address.toLowerCase());
          const role = isAdmin ? 'admin' : 'user';
          return NextResponse.json({
            authenticated: true,
            address,
            role,
            rank: mapRoleToRank(role),
          });
        }
      } catch {
        // Invalid JWT — fall through
      }
    }
  }

  return NextResponse.json({ authenticated: false, rank: 'nomad' });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(TW_JWT_COOKIE);
  cookieStore.delete('csrf_token');
  return NextResponse.json({ success: true });
}
