import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrf } from '@/lib/session';
import { presignRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { fetchData, updateData } from '@/lib/github-storage';
import { getR2PublicUrl } from '@/lib/r2-client';
import { getContentPath } from '@/lib/content-paths';
import { createAssetMetadata } from '@/lib/asset-id';
import { PresignConfirmRequestSchema } from '@/lib/schemas';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/presign/confirm');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Called after the client has uploaded the binary directly to R2.
// Creates the metadata entry in the GitHub data repo.
export async function POST(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }
    if (!verifyCsrf(req)) return NextResponse.json({ error: "CSRF token invalid" }, { status: 403 });

  const rl = await presignRateLimit(getRateLimitKey(req));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const raw = await req.json();
    const parsed = PresignConfirmRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { assetId, r2Key, displayName, description, format, fileSize, fileHash } = parsed.data;

    const publicUrl = `${getR2PublicUrl()}/${r2Key}`;

    // M3: Verify file actually exists in R2 before creating metadata
    try {
      const headRes = await fetch(publicUrl, { method: 'HEAD' });
      if (!headRes.ok) {
        return NextResponse.json({ error: 'File not found in R2 — upload may have failed' }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: 'Cannot verify file in R2' }, { status: 502 });
    }

    const { catalogFile, projectId } = getContentPath(format);

    const newEntry = createAssetMetadata(
      assetId,
      displayName,
      format.toLowerCase(),
      description || `${format} asset uploaded via Numinia Admin`,
      publicUrl,
      projectId,
      { fileSizeBytes: fileSize, fileHash },
    );

    const existingAssets = await fetchData<Record<string, unknown>[]>(catalogFile);
    const assets = Array.isArray(existingAssets) ? existingAssets : [];
    assets.push(newEntry);

    await updateData(catalogFile, assets, `asset: add ${displayName}`);

    return NextResponse.json({
      success: true,
      asset: { id: assetId, name: displayName, format, url: publicUrl },
    });
  } catch (error) {
    // M4: Attempt to clean up orphaned R2 file on metadata write failure
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const { getR2Client, getR2BucketName, isR2Configured } = await import('@/lib/r2-client');
      if (isR2Configured()) {
        const body = await req.clone().json().catch(() => null);
        if (body?.r2Key) {
          await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: body.r2Key }));
        }
      }
    } catch { /* cleanup is best-effort */ }
    log.error({ err: error }, 'Presign confirm error');
    return NextResponse.json(
      { error: 'Failed to create metadata' },
      { status: 500 }
    );
  }
}
