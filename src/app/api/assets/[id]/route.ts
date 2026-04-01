// src/app/api/assets/[id]/route.ts
import { logAudit } from '@/lib/audit';
import { verifyCsrf } from '@/lib/session';
import { assetsDeleteRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  getAvatars,
  deleteAvatarFromSource,
  getAvatarTags,
  saveAvatarTags,
  getDownloads,
  saveDownloads,
  GithubAvatar as Avatar,
  GithubAvatarTag as AvatarTag,
  GithubDownload as Download
} from '@/lib/github-storage';
import { NextRequest } from 'next/server';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { getR2Client, getR2BucketName, isR2Configured } from '@/lib/r2-client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const avatarId = id;

    let session: SessionWithRank;
    try {
      session = await requireRank(req, 'archon');
    } catch (response) {
      return response as Response;
    }
    if (!verifyCsrf(req)) return NextResponse.json({ error: "CSRF token invalid" }, { status: 403 });

    const rl = assetsDeleteRateLimit(getRateLimitKey(req));
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    // Get the current avatars
    const avatars = await getAvatars();
    
    // Find the specific avatar by ID
    const avatarIndex = avatars.findIndex((a: Avatar) => a.id === avatarId);
    
    if (avatarIndex === -1) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }
    
    const avatar = avatars[avatarIndex];

    // Delete files from R2 if configured and URLs exist
    if (isR2Configured() && (avatar.thumbnailUrl || avatar.modelFileUrl)) {
      const s3 = getR2Client();
      const bucket = getR2BucketName();
      const deletePromises: Promise<unknown>[] = [];

      if (avatar.thumbnailUrl) {
        const key = getKeyFromUrl(avatar.thumbnailUrl);
        if (key) deletePromises.push(s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })));
      }

      if (avatar.modelFileUrl) {
        const key = getKeyFromUrl(avatar.modelFileUrl);
        if (key) deletePromises.push(s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })));
      }

      if (deletePromises.length > 0) {
        try {
          await Promise.all(deletePromises);
        } catch (r2Error) {
          console.error('Failed to delete from R2:', r2Error);
        }
      }
    }

    // Remove the avatar from its source file
    await deleteAvatarFromSource(avatarId);
    
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

    logAudit({ action: 'delete-asset', actor: session.address || 'admin', target: avatarId, metadata: { name: avatar.name } });

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
