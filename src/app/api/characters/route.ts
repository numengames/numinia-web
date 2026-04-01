import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { charactersRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { CharacterSaveSchema } from '@/lib/schemas';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GITHUB_API = 'https://api.github.com';

function getCharacterPath(address: string): string {
  return `data/characters/${address.toLowerCase()}.md`;
}

// GET /api/characters — get current user's character sheet
export async function GET(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'nomad');
  } catch (response) {
    return response as Response;
  }

  const path = getCharacterPath(session.address!);

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${env.github.repoOwner}/${env.github.repoName}/contents/${path}`,
      { headers: { Authorization: `token ${env.github.token}`, Accept: 'application/vnd.github.v3+json' } }
    );

    if (res.status === 404) {
      return NextResponse.json({ exists: false, content: null });
    }

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
    }

    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return NextResponse.json({ exists: true, content, sha: data.sha });
  } catch (error) {
    console.error('Character fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
  }
}

// PUT /api/characters — save current user's character sheet
export async function PUT(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'nomad');
  } catch (response) {
    return response as Response;
  }

  const rl = charactersRateLimit(getRateLimitKey(req));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const raw = await req.json();
    const parsed = CharacterSaveSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { content } = parsed.data;

    const path = getCharacterPath(session.address!);
    const base64Content = Buffer.from(content).toString('base64');

    // Get current SHA if file exists
    let sha: string | undefined;
    try {
      const existingRes = await fetch(
        `${GITHUB_API}/repos/${env.github.repoOwner}/${env.github.repoName}/contents/${path}`,
        { headers: { Authorization: `token ${env.github.token}`, Accept: 'application/vnd.github.v3+json' } }
      );
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        sha = existingData.sha;
      }
    } catch { /* file doesn't exist yet */ }

    const writeRes = await fetch(
      `${GITHUB_API}/repos/${env.github.repoOwner}/${env.github.repoName}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${env.github.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `character: update ${session.address!.slice(0, 8)}`,
          content: base64Content,
          ...(sha ? { sha } : {}),
          branch: env.github.branch,
        }),
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.json();
      return NextResponse.json({ error: err.message || 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Character save error:', error);
    return NextResponse.json({ error: 'Failed to save character' }, { status: 500 });
  }
}
