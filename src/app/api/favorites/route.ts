import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/getSession';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GITHUB_API = 'https://api.github.com';

function getFavoritesPath(address: string): string {
  return `data/favorites/${address.toLowerCase()}.json`;
}

// GET — read user's favorites from data repo
export async function GET(req: NextRequest) {
  const session = getUserSession(req);
  if (!session.authenticated || !session.address) {
    return NextResponse.json({ favorites: [] });
  }

  const path = getFavoritesPath(session.address);
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${env.github.repoOwner}/${env.github.repoName}/contents/${path}`,
      { headers: { Authorization: `token ${env.github.token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (res.status === 404) return NextResponse.json({ favorites: [] });
    if (!res.ok) return NextResponse.json({ favorites: [] });

    const data = await res.json();
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    return NextResponse.json({ favorites: content });
  } catch {
    return NextResponse.json({ favorites: [] });
  }
}

// PUT — save user's favorites to data repo
export async function PUT(req: NextRequest) {
  const session = getUserSession(req);
  if (!session.authenticated || !session.address) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { favorites } = await req.json();
    if (!Array.isArray(favorites)) return NextResponse.json({ error: 'favorites must be array' }, { status: 400 });

    const path = getFavoritesPath(session.address);
    const content = Buffer.from(JSON.stringify(favorites, null, 2)).toString('base64');

    // Get SHA if file exists
    let sha: string | undefined;
    try {
      const existing = await fetch(
        `${GITHUB_API}/repos/${env.github.repoOwner}/${env.github.repoName}/contents/${path}`,
        { headers: { Authorization: `token ${env.github.token}`, Accept: 'application/vnd.github.v3+json' } }
      );
      if (existing.ok) sha = (await existing.json()).sha;
    } catch { /* new file */ }

    await fetch(
      `${GITHUB_API}/repos/${env.github.repoOwner}/${env.github.repoName}/contents/${path}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${env.github.token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `favorites: ${session.address.slice(0, 8)}`, content, ...(sha ? { sha } : {}), branch: env.github.branch }),
      }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
