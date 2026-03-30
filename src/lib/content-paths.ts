/**
 * Maps asset formats to their storage paths and catalog files.
 * Shared between upload, presign, and other routes.
 */

/** Get the content folder, JSON catalog file, and project ID for a format */
export function getContentPath(format: string): {
  folder: string;
  catalogFile: string;
  projectId: string;
} {
  switch (format.toUpperCase()) {
    case 'VRM':  return { folder: 'content/avatars',  catalogFile: 'data/avatars/numinia-avatars.json',  projectId: 'numinia-avatars' };
    case 'GLB':  return { folder: 'content/models',   catalogFile: 'data/assets/numinia-assets.json',   projectId: 'numinia-assets' };
    case 'HYP':  return { folder: 'content/worlds',   catalogFile: 'data/worlds/numinia-worlds.json',   projectId: 'numinia-worlds' };
    case 'MP3':
    case 'OGG':  return { folder: 'content/audio',    catalogFile: 'data/audio/numinia-audio.json',     projectId: 'numinia-audio' };
    case 'MP4':
    case 'WEBM': return { folder: 'content/video',    catalogFile: 'data/video/numinia-video.json',     projectId: 'numinia-video' };
    default:     return { folder: 'content/other',    catalogFile: 'data/assets/numinia-assets.json',   projectId: 'numinia-assets' };
  }
}

/** Get format label from filename */
export function getFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ext.toUpperCase();
}
