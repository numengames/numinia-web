import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { env } from '@/lib/env';
import { fetchData, updateData } from '@/lib/github-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACCEPTED_EXTENSIONS = ['glb', 'vrm', 'hyp', 'mp3', 'ogg', 'mp4', 'webm'];

// Map extension → format label
function getFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ext.toUpperCase();
}

// Map format → content folder + JSON catalog file
function getContentPath(format: string): { folder: string; catalogFile: string; projectId: string } {
  switch (format) {
    case 'VRM':  return { folder: 'content/avatars',  catalogFile: 'data/avatars.json',  projectId: 'numinia-avatars' };
    case 'GLB':  return { folder: 'content/models',   catalogFile: 'data/models.json',   projectId: 'numinia-assets' };
    case 'HYP':  return { folder: 'content/worlds',   catalogFile: 'data/worlds.json',   projectId: 'numinia-worlds' };
    case 'MP3':
    case 'OGG':  return { folder: 'content/audio',    catalogFile: 'data/audio.json',    projectId: 'numinia-audio' };
    case 'MP4':
    case 'WEBM': return { folder: 'content/video',    catalogFile: 'data/video.json',    projectId: 'numinia-video' };
    default:     return { folder: 'content/other',    catalogFile: 'data/other.json',    projectId: 'numinia-other' };
  }
}

// Slug from filename: "My File (v2).glb" → "my-file-v2"
function slugify(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  return nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const slug = slugify(name || file.name);
    const assetId = `${slug}-${Date.now().toString(36)}`;
    const displayName = name || file.name.replace(/\.[^.]+$/, '');

    // Step 1: Upload binary to data repo
    const fileBuffer = await file.arrayBuffer();
    const base64Content = Buffer.from(fileBuffer).toString('base64');
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
    const now = new Date().toISOString();

    const newEntry: Record<string, unknown> = {
      id: assetId,
      name: displayName,
      project_id: projectId,
      description: description || `${format} asset uploaded via Numinia Admin`,
      model_file_url: rawUrl,
      thumbnail_url: null,
      format,
      is_public: true,
      is_draft: false,
      created_at: now,
      updated_at: now,
      metadata: {},
    };

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
