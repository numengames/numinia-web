import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { isR2Configured } from '@/lib/r2-client';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Temporary debug endpoint — checks R2 configuration.
// Remove after confirming R2 works.
export async function GET(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    r2Configured: isR2Configured(),
    hasAccountId: !!env.r2.accountId,
    hasAccessKeyId: !!env.r2.accessKeyId,
    hasSecretKey: !!env.r2.secretAccessKey,
    hasBucketName: !!env.r2.bucketName,
    bucketName: env.r2.bucketName || '(empty)',
    publicUrl: env.r2.publicUrl || '(empty)',
    // Show first 4 chars of account ID to verify without exposing
    accountIdPrefix: env.r2.accountId ? env.r2.accountId.slice(0, 4) + '...' : '(empty)',
  });
}
