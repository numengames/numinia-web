// src/app/api/assets/[id]/route.ts
import { NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { 
  getAvatars, 
  saveAvatars, 
  getAvatarTags, 
  saveAvatarTags, 
  getDownloads, 
  saveDownloads,
  GithubAvatar as Avatar,
  GithubAvatarTag as AvatarTag,
  GithubDownload as Download
} from '@/lib/github-storage';
import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';

// Initialize the S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const avatarId = id;

    const session = getAdminSession(req);
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the current avatars
    const avatars = await getAvatars();
    
    // Find the specific avatar by ID
    const avatarIndex = avatars.findIndex((a: Avatar) => a.id === avatarId);
    
    if (avatarIndex === -1) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }
    
    const avatar = avatars[avatarIndex];

    // Delete files from R2 if they exist
    if (avatar.thumbnailUrl || avatar.modelFileUrl) {
      const deletePromises = [];

      if (avatar.thumbnailUrl) {
        const thumbnailKey = getKeyFromUrl(avatar.thumbnailUrl);
        if (thumbnailKey) {
          deletePromises.push(
            s3Client.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: thumbnailKey
              })
            )
          );
        }
      }

      if (avatar.modelFileUrl) {
        const modelKey = getKeyFromUrl(avatar.modelFileUrl);
        if (modelKey) {
          deletePromises.push(
            s3Client.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: modelKey
              })
            )
          );
        }
      }

      // Delete all files in parallel
      if (deletePromises.length > 0) {
        try {
          await Promise.all(deletePromises);
        } catch (r2Error) {
          console.error('Failed to delete some files from R2:', r2Error);
          // Continue with database deletion even if R2 deletion fails
        }
      }
    }

    // Remove the avatar from the avatars array
    avatars.splice(avatarIndex, 1);
    
    // Save the updated avatars array
    await saveAvatars(avatars);
    
    // Also clean up any avatar tags and download records
    
    // 1. Remove any avatar-tag associations
    const avatarTags = await getAvatarTags();
    const updatedAvatarTags = avatarTags.filter((at: AvatarTag) => at.avatarId !== avatarId);
    if (avatarTags.length !== updatedAvatarTags.length) {
      await saveAvatarTags(updatedAvatarTags);
    }
    
    // 2. Remove any download records for this avatar
    const downloads = await getDownloads();
    const updatedDownloads = downloads.filter((d: Download) => d.avatarId !== avatarId);
    if (downloads.length !== updatedDownloads.length) {
      await saveDownloads(updatedDownloads);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete avatar error:', error);
    return NextResponse.json(
      { error: 'Failed to delete avatar' },
      { status: 500 }
    );
  }
}

// Helper function to extract the key from R2 URL
function getKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove the leading slash if it exists
    const pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    return pathname;
  } catch {
    return null;
  }
}
