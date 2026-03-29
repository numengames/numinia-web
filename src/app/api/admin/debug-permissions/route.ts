import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Temporary debug endpoint — checks if the GitHub token can write to the data repo.
// Remove after confirming permissions work.
export async function GET(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const owner = env.github.repoOwner;
  const repo = env.github.repoName;
  const token = env.github.token;

  const results: Record<string, unknown> = {
    owner,
    repo,
    tokenPresent: !!token,
    tokenPrefix: token ? token.slice(0, 7) + '...' : 'missing',
  };

  try {
    // Test 1: Can we read the repo?
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    const repoData = await repoRes.json();
    results.canReadRepo = repoRes.ok;
    results.repoPermissions = repoData.permissions;

    // Test 2: Can we read the projects.json file (get its SHA)?
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/projects.json`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    results.canReadFile = fileRes.ok;
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      results.fileSha = fileData.sha;
    } else {
      results.fileError = await fileRes.json();
    }
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results);
}
