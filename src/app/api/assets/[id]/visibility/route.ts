// src/app/api/assets/[id]/visibility/route.ts
import { NextResponse } from 'next/server';
import { getAvatars, saveAvatars, GithubAvatar as Avatar } from '@/lib/github-storage';
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
    
    // Get all avatars from GitHub storage
    const avatars = await getAvatars();
    
    // Find the specific avatar by ID
    const avatarIndex = avatars.findIndex((a: Avatar) => a.id === id);
    
    if (avatarIndex === -1) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }
    
    // Toggle the visibility
    avatars[avatarIndex].isPublic = !avatars[avatarIndex].isPublic;
    
    // Update the updatedAt timestamp
    avatars[avatarIndex].updatedAt = new Date().toISOString();
    
    // Save the updated avatars array back to GitHub
    await saveAvatars(avatars);
    
    return NextResponse.json(avatars[avatarIndex]);
  } catch (error) {
    console.error('Error toggling avatar visibility:', error);
    return NextResponse.json(
      { error: 'Failed to toggle visibility' },
      { status: 500 }
    );
  }
}
