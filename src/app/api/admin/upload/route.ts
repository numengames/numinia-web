import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrf } from '@/lib/session';
import { getAdminSession } from '@/lib/auth/getSession';
import { env } from '@/lib/env';
import { fetchData, updateData } from '@/lib/github-storage';
import { generateAssetId, createAssetMetadata } from '@/lib/asset-id';
import { getContentPath, getFormat } from '@/lib/content-paths';
import { uploadRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACCEPTED_EXTENSIONS = ['glb', 'vrm', 'hyp', 'mp3', 'ogg', 'mp4', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'stl'];

export async function POST(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (!verifyCsrf(req)) return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });

  }

  const rl = uploadRateLimit(getRateLimitKey(req));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const token = env.github.token;
  const owner = env.github.repoOwner;
  const repo = env.github.repoName;
  const branch = env.github.branch;

  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported format: .${ext}. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const format = getFormat(file.name);
    const assetId = generateAssetId();
    const displayName = name || file.name.replace(/\.[^.]+$/, '');

    // Step 1: Upload binary to data repo
    const fileBuffer = await file.arrayBuffer();
    const base64Content = Buffer.from(fileBuffer).toString('base64');

    // Compute SHA-256 hash for integrity verification + deduplication
    const { createHash } = await import('crypto');
    const fileHash = `sha256:${createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex')}`;
    const { folder } = getContentPath(format);
    const repoFilePath = `${folder}/${assetId}.${ext}`;

    // Check if file already exists (get SHA for update)
    let fileSha: string | undefined;
    try {
      const shaRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${repoFilePath}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      );
      if (shaRes.ok) {
        const shaData = await shaRes.json();
        fileSha = shaData.sha;
      }
    } catch {
      // File doesn't exist yet — fine
    }

    const uploadRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${repoFilePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `upload: ${displayName} (${format})`,
          content: base64Content,
          ...(fileSha ? { sha: fileSha } : {}),
          branch,
        }),
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      console.error('GitHub upload failed:', err);
      return NextResponse.json({ error: 'Failed to upload file', details: err.message }, { status: 500 });
    }

    // Step 2: Add entry to the correct project JSON file
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoFilePath}`;
    const { projectId, catalogFile } = getContentPath(format);

    const newEntry = createAssetMetadata(
      assetId,
      displayName,
      format.toLowerCase(),
      description || `${format} asset uploaded via Numinia Admin`,
      rawUrl,
      projectId,
      { fileSizeBytes: file.size, fileHash },
    );

    const existingAssets = await fetchData<Record<string, unknown>[]>(catalogFile);
    const assets = Array.isArray(existingAssets) ? existingAssets : [];
    assets.push(newEntry);

    await updateData(catalogFile, assets, `asset: add ${displayName}`);

    return NextResponse.json({
      success: true,
      asset: {
        id: assetId,
        name: displayName,
        format,
        url: rawUrl,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
