// src/app/api/assets/[id]/visibility/route.ts
import { logAudit } from '@/lib/audit';
import { verifyCsrf } from '@/lib/session';
// Handles both visibility toggle and name/description updates.
import { NextResponse } from 'next/server';
import { getAvatars, updateAvatarInSource, GithubAvatar as Avatar } from '@/lib/github-storage';
import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = getAdminSession(req);
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (!verifyCsrf(req)) return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });

    }

    const avatars = await getAvatars();
    const avatar = avatars.find((a: Avatar) => a.id === id);

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // Parse body — may contain { name } for rename, or be empty for visibility toggle
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // empty body = visibility toggle
    }

    const updates: Record<string, unknown> = {};

    // Editable fields — add new fields here as needed
    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }
    if (typeof body.creator === 'string') {
      updates.creator = body.creator.trim();
    }
    if (typeof body.license === 'string') {
      updates.license = body.license.trim();
    }
    if (typeof body.status === 'string') {
      updates.status = body.status.trim();
    }
    if (typeof body.version === 'string') {
      updates.version = body.version.trim();
    }
    if (body.nft && typeof body.nft === 'object') {
      updates.nft = body.nft;
    }
    if (Array.isArray(body.tags)) {
      updates.tags = body.tags;
    }

    // If no explicit field updates, toggle visibility
    if (Object.keys(updates).length === 0) {
      updates.is_public = !avatar.isPublic;
    }

    const saved = await updateAvatarInSource(id, updates);

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
    console.error('Error updating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
}
