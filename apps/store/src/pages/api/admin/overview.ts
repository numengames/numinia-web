/**
 * Admin data (MISSION-011) — the only place that answers with anything an
 * Oracle can see. Gated on the REAL session: rank is read from our own
 * signed token and checked against the permission ladder (@numinia/domain),
 * never from a header or a query the caller controls.
 */

import type { APIRoute } from 'astro';
import { hasPermission, type Rank } from '@numinia/domain';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';

export const prerender = false;

async function rankOf(token: string | undefined): Promise<Rank | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  return result.valid ? result.payload.rank : null;
}

export const GET: APIRoute = async ({ cookies }) => {
  const rank = await rankOf(cookies.get(SESSION_COOKIE)?.value);
  // Fail closed: no session, or a rank without the permission, sees nothing.
  if (!rank || !hasPermission(rank, 'manage-users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { loadArchive } = await import('../../../lib/archive');
  const { computeArchiveStats } = await import('../../../lib/lap/stats');
  const archive = await loadArchive();
  const stats = computeArchiveStats(archive);
  return Response.json({
    rank,
    stats,
    // Assets the Oracle governs: everything the catalog holds, with the
    // storage truth per asset (which layers actually have the binary).
    assets: archive.map(({ asset, category }) => ({
      id: asset.id,
      name: asset.name,
      format: asset.format,
      category,
      license: asset.license,
      createdAt: asset.createdAt,
      layers: {
        r2: Boolean(asset.storage.r2Url),
        github: Boolean(asset.storage.githubRawUrl),
        ipfs: Boolean(asset.storage.ipfsCid),
        arweave: Boolean(asset.storage.arweaveTx),
      },
    })),
  });
};
