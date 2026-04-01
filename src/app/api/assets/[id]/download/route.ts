import { NextRequest, NextResponse } from 'next/server';
import { getAvatars, getDownloadCounts, saveDownloadCounts } from '@/lib/github-storage';
import { resolveAvatarAssetUrl } from '@/lib/assetUrls';
import { AvatarMetadata, getModelFilenameForFormat } from '@/lib/download-utils';
import { downloadRateLimit, getRateLimitKey } from '@/lib/rate-limit';

interface DownloadCounts {
  counts: Record<string, number>;
}

interface Avatar {
  id: string;
  name: string;
  modelFileUrl: string | null;
  metadata: AvatarMetadata;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = downloadRateLimit(getRateLimitKey(request));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { id } = await params;

  try {
    // Get request body for format preference
    const { format } = await request.json().catch(() => ({}));
    
    // Get avatar details from GitHub storage
    const avatars = await getAvatars();
    const avatar = avatars.find((a: Avatar) => a.id === id);

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    if (!avatar.modelFileUrl) {
      return NextResponse.json({ error: 'No model file available' }, { status: 400 });
    }

    try {
      let modelFilename = '';
      let actualFormat = format || 'default';
      
      // Check if a specific format was requested and if alternate models exist
      if (format && avatar.metadata?.alternateModels) {
        // Get model filename using our helper function
        const formatFilename = getModelFilenameForFormat(avatar.metadata, format);
        
        
        if (formatFilename) {
          modelFilename = formatFilename;
        } else {
          // Format not found in alternate models
          return NextResponse.json({ 
            error: 'Requested format not available', 
            format, 
            availableFormats: Object.keys(avatar.metadata.alternateModels) 
          }, { status: 400 });
        }
      } else {
        // Full URL (already resolved in getAvatars); do not use basename-only — that breaks Arweave URLs
        modelFilename = avatar.modelFileUrl;
      }
      
      if (!modelFilename) {
        return NextResponse.json({ error: 'Could not determine model filename' }, { status: 400 });
      }

      const downloadUrl =
        resolveAvatarAssetUrl(modelFilename, 'model') || avatar.modelFileUrl;

      // Record the download count (privacy-friendly approach)
      try {
        const downloadCounts = await getDownloadCounts() as DownloadCounts;
        
        if (!downloadCounts.counts) {
          downloadCounts.counts = {};
        }
        
        // Increment the download count for this avatar
        downloadCounts.counts[avatar.id] = (downloadCounts.counts[avatar.id] || 0) + 1;
        
        // Save the updated download counts
        saveDownloadCounts(downloadCounts).catch((error: Error) => {
          console.error('Failed to update download count:', error);
          // Continue anyway, since this shouldn't block the download
        });
      } catch (error) {
        console.error('Failed to update download count:', error);
        // Continue anyway, since this shouldn't block the download
      }

      return NextResponse.json({ 
        downloadUrl, 
        storageType: downloadUrl.includes('arweave.net') ? 'arweave' : 's3',
        format: actualFormat,
        avatarName: avatar.name || avatar.metadata?.number || 'avatar'
      });
    } catch (error) {
      console.error('Download error:', error);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    );
  }
}

