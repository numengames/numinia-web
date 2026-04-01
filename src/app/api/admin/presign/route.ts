import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrf } from '@/lib/session';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2BucketName, isR2Configured } from '@/lib/r2-client';
import { generateAssetId } from '@/lib/asset-id';
import { presignRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { getContentPath } from '@/lib/content-paths';
import { PresignRequestSchema } from '@/lib/schemas';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/presign');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACCEPTED_EXTENSIONS = ['glb', 'vrm', 'hyp', 'mp3', 'ogg', 'mp4', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'stl'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const PRESIGN_EXPIRY = 3600; // 1 hour

const CONTENT_TYPES: Record<string, string> = {
  glb: 'model/gltf-binary',
  vrm: 'application/octet-stream',
  hyp: 'application/octet-stream',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  stl: 'model/stl',
};

// Generates a presigned PUT URL for direct-to-R2 upload.
// Client uploads the binary directly to R2, bypassing Vercel's body limit.
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

  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 storage not configured' }, { status: 503 });
  }

  try {
    const raw = await req.json();
    const parsed = PresignRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { fileName, fileSize, name, description } = parsed.data;

    const ext = fileName.split('.').pop()!.toLowerCase();
    const format = ext.toUpperCase();
    const assetId = generateAssetId();
    const { folder } = getContentPath(format);
    const r2Key = `${folder}/${assetId}.${ext}`;
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: r2Key,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: PRESIGN_EXPIRY,
    });

    return NextResponse.json({
      uploadUrl,
      assetId,
      r2Key,
      format,
      contentType,
      displayName: name || fileName.replace(/\.[^.]+$/, ''),
      description: description || '',
    });
  } catch (error) {
    log.error({ err: error }, 'Presign error');
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
