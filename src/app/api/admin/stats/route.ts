import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { getAvatars, getProjects } from '@/lib/github-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [avatars, projects] = await Promise.all([
      getAvatars(),
      getProjects(),
    ]);

    // Count by type
    const byType: Record<string, number> = {};
    let totalSizeBytes = 0;
    const byStatus: Record<string, number> = {};
    const byLayer = { r2: 0, ipfs: 0, arweave: 0, github: 0 };
    const nftStats = { minted: 0, unminted: 0, pending: 0 };
    const versionStats = { active: 0, deprecated: 0 };

    for (const avatar of avatars) {
      // By type
      const type = (avatar.format || 'unknown').toUpperCase();
      byType[type] = (byType[type] || 0) + 1;

      // Total size
      const meta = avatar.metadata as Record<string, unknown> | undefined;
      const sizeFromMeta = meta?.file_size_bytes as number | undefined;
      // file_size_bytes may be at root level (new schema) or in metadata (legacy)
      const rootSize = (avatar as Record<string, unknown>).file_size_bytes as number | undefined;
      const size = rootSize || sizeFromMeta;
      if (typeof size === 'number') {
        totalSizeBytes += size;
      }

      // By status
      const status = (avatar as Record<string, unknown>).status as string || 'active';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // By storage layer
      const storage = (avatar as Record<string, unknown>).storage as Record<string, unknown> | undefined;
      if (storage) {
        if (storage.r2) byLayer.r2++;
        if (storage.ipfs_cid) byLayer.ipfs++;
        if (storage.arweave_tx) byLayer.arweave++;
        if (storage.github_raw) byLayer.github++;
      } else {
        // Legacy assets without storage object — assume GitHub
        byLayer.github++;
      }

      // NFT stats
      const nft = (avatar as Record<string, unknown>).nft as Record<string, unknown> | undefined;
      if (nft) {
        const mintStatus = nft.mint_status as string || 'unminted';
        if (mintStatus === 'minted') nftStats.minted++;
        else if (mintStatus === 'pending') nftStats.pending++;
        else nftStats.unminted++;
      } else {
        nftStats.unminted++;
      }

      // Version stats
      const vStatus = (avatar as Record<string, unknown>).status as string;
      if (vStatus === 'deprecated') versionStats.deprecated++;
      else versionStats.active++;
    }

    return NextResponse.json({
      total_assets: avatars.length,
      total_projects: projects.length,
      by_type: byType,
      total_size_bytes: totalSizeBytes,
      total_size_mb: Math.round(totalSizeBytes / 1024 / 1024 * 100) / 100,
      by_status: byStatus,
      by_layer: byLayer,
      nft: nftStats,
      versions: versionStats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate stats' },
      { status: 500 },
    );
  }
}
