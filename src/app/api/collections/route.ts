import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const GITHUB_OWNER = env.github.repoOwner;
const GITHUB_REPO = env.github.repoName;
const GITHUB_BRANCH = env.github.branch;
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

interface Project {
  id: string;
  name: string;
  creator_id: string;
  description: string;
  is_public: boolean;
  license: string;
  source_type: string;
  source_network?: string | string[];
  source_contract?: string | string[];
  storage_type: string;
  opensea_url?: string;
  asset_data_file: string;
  created_at: string;
  updated_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const url = `${RAW_CONTENT_BASE}/data/projects.json?timestamp=${Date.now()}`;
    const fetchRes = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch projects: ${fetchRes.status}`);
    }

    const projects: Project[] = await fetchRes.json();

    // Filter for community collections (NFT collections, excluding original 100avatars)
    const communityCollections = projects.filter((project) => {
      return (
        project.is_public &&
        project.source_type === 'nft' &&
        !project.id.startsWith('100avatars')
      );
    });

    // Sort by updated_at (most recent first)
    communityCollections.sort((a, b) => {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    const response = NextResponse.json({
      collections: communityCollections,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response;
  } catch (error) {
    console.error('Error fetching community collections:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch community collections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
