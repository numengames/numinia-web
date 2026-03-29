// src/app/api/assets/[id]/visibility/route.ts
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
    }

    // Get all avatars to find the current state
    const avatars = await getAvatars();
    const avatar = avatars.find((a: Avatar) => a.id === id);

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // Toggle visibility and save to the correct source file
    const newIsPublic = !avatar.isPublic;
    const saved = await updateAvatarInSource(id, {
      is_public: newIsPublic,
    });

    if (!saved) {
      return NextResponse.json({ error: 'Avatar not found in source files' }, { status: 404 });
    }

    return NextResponse.json({ ...avatar, isPublic: newIsPublic });
  } catch (error) {
    console.error('Error toggling avatar visibility:', error);
    return NextResponse.json(
      { error: 'Failed to toggle visibility' },
      { status: 500 }
    );
  }
}
