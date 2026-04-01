// src/app/api/assets/[id]/visibility/route.ts
import { logAudit } from '@/lib/audit';
import { verifyCsrf } from '@/lib/session';
// Handles both visibility toggle and name/description updates.
import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/data-source';
import type { GithubAvatar as Avatar } from '@/types/github-storage';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { AssetUpdateSchema } from '@/lib/schemas';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/assets/visibility');

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let session: SessionWithRank;
    try {
      session = await requireRank(req, 'archon');
    } catch (response) {
      return response as Response;
    }
    if (!verifyCsrf(req)) return NextResponse.json({ error: "CSRF token invalid" }, { status: 403 });

    const ds = getDataSource();
    const avatars = await ds.assets.getAll();
    const avatar = avatars.find((a: Avatar) => a.id === id);

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // Parse body — may contain field updates, or be empty for visibility toggle
    let updates: Record<string, unknown> = {};
    try {
      const raw = await req.json();
      const parsed = AssetUpdateSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }
      updates = Object.fromEntries(
        Object.entries(parsed.data).filter(([k, v]) => v !== undefined && !(k === 'name' && v === ''))
      );
    } catch {
      // empty body = visibility toggle
    }

    // If no explicit field updates, toggle visibility
    if (Object.keys(updates).length === 0) {
      updates.is_public = !avatar.isPublic;
    }

    const saved = await ds.assets.update(id, updates);

    if (!saved) {
      return NextResponse.json({ error: 'Avatar not found in source files' }, { status: 404 });
    }

    logAudit({ action: 'update-asset', actor: session.address || 'admin', target: id, metadata: { fields: Object.keys(updates) } });

    return NextResponse.json({
      ...avatar,
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.creator !== undefined ? { creator: updates.creator } : {}),
      ...(updates.license !== undefined ? { license: updates.license } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.version !== undefined ? { version: updates.version } : {}),
      ...(updates.nft !== undefined ? { nft: updates.nft } : {}),
      ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
      ...(updates.is_public !== undefined ? { isPublic: updates.is_public } : {}),
    });
  } catch (error) {
    log.error({ err: error }, 'Error updating avatar');
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
}
