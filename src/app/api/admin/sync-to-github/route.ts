import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { verifyCsrf } from '@/lib/session';
import { getAvatars, updateAvatarInSource } from '@/lib/github-storage';
import { env } from '@/lib/env';
import { logAudit } from '@/lib/audit';
import type { GithubAvatar } from '@/types/github-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_GITHUB_SIZE = 50 * 1024 * 1024; // 50MB practical limit

/**
 * POST /api/admin/sync-to-github
 * Copies an R2-only asset to GitHub (data repo).
 */
export async function POST(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }
  if (!verifyCsrf(req)) return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });

  try {
    const { assetId } = await req.json();
    if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 });

    const avatars = await getAvatars();
    const avatar = avatars.find((a: GithubAvatar) => a.id === assetId);
    if (!avatar) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    const storage = (avatar as Record<string, unknown>).storage as Record<string, unknown> | undefined;
    if (storage?.github_raw) return NextResponse.json({ already_synced: true, url: storage.github_raw });

    // Find the source URL (R2 or modelFileUrl)
    const sourceUrl = (storage?.r2 as string) || avatar.modelFileUrl;
    if (!sourceUrl) return NextResponse.json({ error: 'No source URL to sync from' }, { status: 400 });

    // Fetch the binary
    const res = await fetch(sourceUrl);
    if (!res.ok) return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_GITHUB_SIZE) {
      return NextResponse.json({ error: `File too large for GitHub (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB, max 50MB)` }, { status: 400 });
    }

    // Determine path
    const ext = sourceUrl.split('.').pop()?.toLowerCase() || 'bin';
    const repoPath = `content/${getFolder(avatar.format)}/${assetId}.${ext}`;

    // Upload to GitHub
    const base64 = Buffer.from(buffer).toString('base64');
    const token = env.github.token;
    const owner = env.github.repoOwner;
    const repo = env.github.repoName;

    const uploadRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `sync: ${avatar.name} to GitHub`, content: base64, branch: env.github.branch }),
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      return NextResponse.json({ error: err.message || 'GitHub upload failed' }, { status: 500 });
    }

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${env.github.branch}/${repoPath}`;

    await updateAvatarInSource(assetId, { storage: { ...(storage || {}), github_raw: rawUrl } });
    logAudit({ action: 'sync-to-github', actor: session.address || 'admin', target: assetId });

    return NextResponse.json({ success: true, github_raw: rawUrl });
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
