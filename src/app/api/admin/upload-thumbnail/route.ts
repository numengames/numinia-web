import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrf } from '@/lib/session';
import { fetchData, updateData } from '@/lib/github-storage';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GITHUB_OWNER = env.github.repoOwner;
const GITHUB_REPO = env.github.repoName;
const GITHUB_TOKEN = env.github.token;
const GITHUB_BRANCH = env.github.branch;
const API_BASE = 'https://api.github.com';
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

export async function POST(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }
    if (!verifyCsrf(req)) return NextResponse.json({ error: "CSRF token invalid" }, { status: 403 });

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  const { imageData, avatarId } = await req.json();
  if (!imageData || !avatarId) {
    return NextResponse.json({ error: 'imageData and avatarId required' }, { status: 400 });
  }

  // Validate avatarId format — prevent path traversal
  if (!/^(ndg-[a-f0-9-]+|[a-z0-9-]+)$/i.test(avatarId)) {
    return NextResponse.json({ error: 'Invalid avatar ID format' }, { status: 400 });
  }

  // Strip data URL prefix (data:image/png;base64,...)
  const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');

  // Size limit: 5MB max
  const bufferSize = Buffer.from(base64, 'base64').length;
  if (bufferSize > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
  }
  const filePath = `content/thumbnails/${avatarId}.png`;
  const thumbnailUrl = `${RAW_BASE}/${filePath}`;

  // Get existing file SHA (needed for update)
  let fileSha: string | undefined;
  try {
    const res = await fetch(
      `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (res.ok) {
      const data = await res.json();
      fileSha = data.sha;
    }
  } catch { /* file may not exist yet — sha stays undefined for create */ }

  // Upload image to GitHub
  const uploadRes = await fetch(
    `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `thumbnail: add ${avatarId}`,
        content: base64,
        ...(fileSha ? { sha: fileSha } : {}),
        branch: GITHUB_BRANCH,
      }),
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }

  // Update the avatar's JSON file to set the new thumbnail URL
  try {
    const projects = await fetchData('data/projects.json');
    if (Array.isArray(projects)) {
      for (const project of projects) {
        const avatarFile = project.asset_data_file || project.assetDataFile || project.avatar_data_file;
        if (!avatarFile) continue;

        let avatarPath: string;
        if (avatarFile.startsWith('data/')) avatarPath = avatarFile;
        else if (avatarFile.startsWith('assets/') || avatarFile.startsWith('avatars/')) avatarPath = `data/${avatarFile}`;
        else avatarPath = `data/assets/${avatarFile}`;

        const avatars = await fetchData(avatarPath);
        if (!Array.isArray(avatars)) continue;

        const idx = avatars.findIndex((a: Record<string, unknown>) => a.id === avatarId);
        if (idx === -1) continue;

        // Update whichever field exists (snake_case or camelCase)
        if ('thumbnail_url' in avatars[idx]) avatars[idx].thumbnail_url = thumbnailUrl;
        if ('thumbnailUrl' in avatars[idx]) avatars[idx].thumbnailUrl = thumbnailUrl;
        if (!('thumbnail_url' in avatars[idx]) && !('thumbnailUrl' in avatars[idx])) {
          avatars[idx].thumbnail_url = thumbnailUrl;
        }

        await updateData(avatarPath, avatars, `thumbnail: update ${avatarId}`);
        break;
      }
    }
  } catch (err) {
    // Image uploaded OK but metadata update failed — still return the URL
    return NextResponse.json({
      thumbnailUrl,
      warning: 'Imagen subida pero no se pudo actualizar el JSON',
    });
  }

  return NextResponse.json({ thumbnailUrl });
}
