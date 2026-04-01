import { NextRequest, NextResponse } from 'next/server';
import { getAvatars, getDownloadCounts, saveDownloadCounts } from '@/lib/github-storage';
import { resolveAvatarAssetUrl } from '@/lib/assetUrls';
import {
  AvatarMetadata,
  getModelFilenameForFormat,
  getFileExtension,
  isIPFSUrl,
  isGitHubRawUrl,
  normalizeIPFSUrl,
} from '@/lib/download-utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/assets/direct-download');

interface DownloadCounts {
  counts: Record<string, number>;
}

interface Avatar {
  id: string;
  name: string;
  modelFileUrl: string | null;
  metadata: AvatarMetadata;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get format from query parameter
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || null;
    
    // Next.js automatically decodes URL parameters, so params.id is already decoded
    // Get avatar details from GitHub storage
    const avatars = await getAvatars();
    const avatar = avatars.find((a: Avatar) => a.id === id);

    if (!avatar) {
      // Log for debugging - this helps identify if avatar IDs don't match
      log.error({ assetId: id, totalAvatars: avatars.length }, 'Avatar not found');
      // Log first few avatar IDs for debugging
      if (avatars.length > 0) {
        log.error({ sampleIds: avatars.slice(0, 3).map(a => a.id) }, 'Sample avatar IDs');
      }
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    if (!avatar.modelFileUrl) {
      return NextResponse.json({ error: 'No model file available' }, { status: 400 });
    }

    let modelUrl = '';
    let actualFormat = format || 'default';
    
    // Check if a specific format was requested and if alternate models exist
    if (format && avatar.metadata?.alternateModels) {
      // Get model filename using our helper function
      const formatFilename = getModelFilenameForFormat(avatar.metadata, format);
      
      
      if (formatFilename) {
        // Normalize IPFS URLs in alternate models too
        modelUrl = normalizeIPFSUrl(formatFilename);
      } else {
        // Format not found in alternate models - but instead of returning an error,
        // let's fallback to the default model and log a warning
        log.warn({ format, avatarName: avatar.name }, 'Requested format not available, using default model');
        modelUrl = avatar.modelFileUrl;
        actualFormat = 'default'; // Reset to default format
      }
    } else {
      modelUrl = avatar.modelFileUrl;
    }
    
    if (!modelUrl) {
      return NextResponse.json({ error: 'Could not determine model URL' }, { status: 400 });
    }

    modelUrl =
      resolveAvatarAssetUrl(normalizeIPFSUrl(modelUrl), 'model') ||
      normalizeIPFSUrl(modelUrl);
    
    // Normalize IPFS URLs if needed
    const normalizedUrl = normalizeIPFSUrl(modelUrl);
    const isIPFS = isIPFSUrl(normalizedUrl);
    const isGitHub = isGitHubRawUrl(normalizedUrl);
    
    // Create a proper filename
    // For GitHub URLs, try to extract filename from URL
    let filename: string;
    if (isGitHub) {
      const urlFilename = normalizedUrl.split('/').pop() || '';
      const urlExt = urlFilename.split('.').pop()?.toLowerCase();
      if (urlExt && ['vrm', 'fbx', 'glb', 'gltf'].includes(urlExt)) {
        const cleanName = (avatar.name || String(avatar.metadata?.number || avatar.name || 'avatar')).replace(/[^a-zA-Z0-9_-]/g, '_');
        filename = `${cleanName}.${urlExt}`;
      } else {
        // Fallback to format-based extension
        const extension = getFileExtension(actualFormat);
        const cleanName = (avatar.name || String(avatar.metadata?.number || avatar.name || 'avatar')).replace(/[^a-zA-Z0-9_-]/g, '_');
        const voxelPart = actualFormat && (actualFormat.includes('voxel') || actualFormat === 'voxel') ? '_voxel' : '';
        filename = `${cleanName}${voxelPart}${extension}`;
      }
    } else {
      const extension = getFileExtension(actualFormat);
      const cleanName = (avatar.name || String(avatar.metadata?.number || avatar.name || 'avatar')).replace(/[^a-zA-Z0-9_-]/g, '_');
      const voxelPart = actualFormat && (actualFormat.includes('voxel') || actualFormat === 'voxel') ? '_voxel' : '';
      filename = `${cleanName}${voxelPart}${extension}`;
    }
    
    
    try {
      // Fetch the file directly
      // For IPFS URLs, we might need a longer timeout and retry logic
      const fetchOptions: RequestInit = {
        headers: {
          'Accept': '*/*',
        }
      };
      
      // Add timeout for IPFS URLs (use AbortSignal.timeout if available, otherwise skip)
      let timeoutId: NodeJS.Timeout | null = null;
      if (isIPFS && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
        try {
          fetchOptions.signal = AbortSignal.timeout(30000); // 30 seconds for IPFS
        } catch (e) {
          // Fallback: use manual timeout if AbortSignal.timeout is not available
          const controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(), 30000);
          fetchOptions.signal = controller.signal;
        }
      }
      
      const response = await fetch(normalizedUrl, fetchOptions);
      
      // Clear timeout if we set one manually
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        // For IPFS URLs, provide more helpful error messages
        if (isIPFS) {
          log.error({ status: response.status, statusText: response.statusText }, 'IPFS fetch failed');
          // Try alternative IPFS gateway if dweb.link fails
          if (normalizedUrl.includes('dweb.link')) {
            const alternativeUrl = normalizedUrl.replace('dweb.link', 'ipfs.io');
            try {
              // Create new fetch options for retry
              const retryFetchOptions: RequestInit = {
                headers: {
                  'Accept': '*/*',
                }
              };
              
              // Add timeout for retry too
              let retryTimeoutId: NodeJS.Timeout | null = null;
              if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
                try {
                  retryFetchOptions.signal = AbortSignal.timeout(30000);
                } catch (e) {
                  const controller = new AbortController();
                  retryTimeoutId = setTimeout(() => controller.abort(), 30000);
                  retryFetchOptions.signal = controller.signal;
                }
              }
              
              const retryResponse = await fetch(alternativeUrl, retryFetchOptions);
              
              if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
              }
              if (retryResponse.ok) {
                const buffer = await retryResponse.arrayBuffer();
                // Update download counts in the background
                try {
                  const downloadCounts = await getDownloadCounts() as DownloadCounts;
                  if (!downloadCounts.counts) {
                    downloadCounts.counts = {};
                  }
                  downloadCounts.counts[avatar.id] = (downloadCounts.counts[avatar.id] || 0) + 1;
                  saveDownloadCounts(downloadCounts).catch((err: Error) => 
                    log.error({ err }, 'Failed to save download count')
                  );
                } catch (error) {
                  log.error({ err: error }, 'Error updating download counts');
                }
                // Use application/octet-stream for all binary model files
                const contentType = (actualFormat === 'fbx' || actualFormat === 'glb' || actualFormat === 'voxel-fbx') 
                  ? 'application/octet-stream' 
                  : 'application/octet-stream';
                const encodedFilename = encodeURIComponent(filename);
                const contentDisposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;
                
                return new NextResponse(buffer, {
                  status: 200,
                  headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': contentDisposition,
                    'Cache-Control': 'public, max-age=86400',
                    'X-Content-Type-Options': 'nosniff',
                  }
                });
              }
            } catch (retryError) {
              log.error({ err: retryError }, 'Retry with alternative gateway also failed');
            }
          }
        }
        return NextResponse.json({
          error: `Failed to fetch file: ${response.status} ${response.statusText}${isIPFS ? ' (IPFS gateway may be slow or unavailable)' : ''}`
        }, { status: response.status });
      }
      
      // Get file buffer
      const buffer = await response.arrayBuffer();
      
      // Update download counts in the background
      try {
        const downloadCounts = await getDownloadCounts() as DownloadCounts;
        
        if (!downloadCounts.counts) {
          downloadCounts.counts = {};
        }
        
        downloadCounts.counts[avatar.id] = (downloadCounts.counts[avatar.id] || 0) + 1;
        saveDownloadCounts(downloadCounts).catch((err: Error) => 
          log.error({ err }, 'Failed to save download count')
        );
      } catch (error) {
        log.error({ err: error }, 'Error updating download counts');
        // Continue anyway
      }
      
      // Return the file with proper headers
      // Use application/octet-stream for all binary model files to ensure Chrome recognizes them correctly
      // This is safer than model/vrm which might not be recognized by all browsers
      const contentType = (actualFormat === 'fbx' || actualFormat === 'glb' || actualFormat === 'voxel-fbx') 
        ? 'application/octet-stream' 
        : 'application/octet-stream'; // Use octet-stream for VRM too for maximum compatibility
      
      // Properly encode filename in Content-Disposition header (RFC 5987)
      // Chrome requires this format for filenames with special characters
      const encodedFilename = encodeURIComponent(filename);
      const contentDisposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;
      
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDisposition,
          'Cache-Control': 'public, max-age=86400',
          'X-Content-Type-Options': 'nosniff', // Prevent MIME type sniffing
        }
      });
    } catch (error) {
      log.error({ err: error }, 'Download error');
      return NextResponse.json({
        error: 'Failed to download file',
        message: (error as Error).message
      }, { status: 500 });
    }
  } catch (error) {
    log.error({ err: error }, 'API error');
    return NextResponse.json({
      error: 'Internal server error',
      message: (error as Error).message
    }, { status: 500 });
  }
} 
