import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { verifyCsrf } from '@/lib/session';
import { getAvatars, updateAvatarInSource } from '@/lib/github-storage';
import { getR2Client, getR2BucketName, getR2PublicUrl, isR2Configured } from '@/lib/r2-client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { logAudit } from '@/lib/audit';
import type { GithubAvatar } from '@/types/github-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/sync-to-r2
 * Copies a GitHub-only asset to R2 CDN.
 */
export async function POST(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!verifyCsrf(req)) return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });

  if (!isR2Configured()) return NextResponse.json({ error: 'R2 not configured' }, { status: 503 });

  try {
    const { assetId } = await req.json();
    if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 });

    const avatars = await getAvatars();
    const avatar = avatars.find((a: GithubAvatar) => a.id === assetId);
    if (!avatar) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    const storage = (avatar as Record<string, unknown>).storage as Record<string, unknown> | undefined;
    if (storage?.r2) return NextResponse.json({ already_synced: true, url: storage.r2 });

    // Find source URL (GitHub or modelFileUrl)
    const sourceUrl = (storage?.github_raw as string) || avatar.modelFileUrl;
    if (!sourceUrl) return NextResponse.json({ error: 'No source URL to sync from' }, { status: 400 });

    // Fetch binary
    const res = await fetch(sourceUrl);
    if (!res.ok) return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });

    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = sourceUrl.split('.').pop()?.toLowerCase() || 'bin';
    const folder = getFolder(avatar.format);
    const r2Key = `content/${folder}/${assetId}.${ext}`;

    // Upload to R2
    const s3 = getR2Client();
    await s3.send(new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: r2Key,
      Body: buffer,
      ContentType: res.headers.get('content-type') || 'application/octet-stream',
    }));

    const r2Url = `${getR2PublicUrl()}/${r2Key}`;

    await updateAvatarInSource(assetId, { storage: { ...(storage || {}), r2: r2Url } });
    logAudit({ action: 'sync-to-r2', actor: session.address || 'admin', target: assetId });

    return NextResponse.json({ success: true, r2: r2Url });
  } catch (error) {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

function getFolder(format: string): string {
  switch ((format || '').toUpperCase()) {
    case 'VRM': return 'avatars';
    case 'GLB': return 'models';
    case 'HYP': return 'worlds';
    case 'MP3': case 'OGG': return 'audio';
    case 'MP4': case 'WEBM': return 'video';
    case 'STL': return '3dprint';
    default: return 'models';
  }
}
