/**
 * GET /api/admin/system/rank-permissions — Read permission matrix (oracle)
 * PUT /api/admin/system/rank-permissions — Update permission matrix (oracle)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { verifyCsrf } from '@/lib/session';
import { getPermissionsForRank } from '@/lib/rank';
import { logAudit } from '@/lib/audit';
import { RANK_HIERARCHY, DEFAULT_RANK_PERMISSIONS } from '@/types/rank';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'oracle');
  } catch (response) {
    return response as Response;
  }

  // Return the current default permission matrix
  // In the future, this will merge with data/system/rank-permissions.json overrides
  const matrix: Record<string, unknown> = {};
  for (const rank of RANK_HIERARCHY) {
    matrix[rank] = getPermissionsForRank(rank);
  }

  return NextResponse.json({ permissions: matrix });
}

export async function PUT(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'oracle');
  } catch (response) {
    return response as Response;
  }

  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // For now, return the default matrix as read-only.
  // Phase 4+ will implement writing to data/system/rank-permissions.json
  const actor = session.address ?? 'unknown';

  logAudit({
    action: 'rank-permissions-view',
    actor,
    metadata: { note: 'PUT not yet implemented — read-only in Phase 2' },
  });

  return NextResponse.json({
    error: 'Permission matrix editing will be available in a future update',
    permissions: DEFAULT_RANK_PERMISSIONS,
  }, { status: 501 });
}
