import { downloadAvatar } from '@/lib/download-utils';
import type { FileTypeInfo } from './types';

interface DownloadContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  avatar: any;
  selectedFile: FileTypeInfo | null;
  correctedFilename: string | null;
  imageFormat: string | null;
  getExtensionFromFormat: (format: string) => string;
}

export function handleFileDownload(ctx: DownloadContext) {
  const { avatar, selectedFile, correctedFilename, imageFormat, getExtensionFromFormat } = ctx;

  try {
    if (selectedFile && selectedFile.category === 'model' && avatar) {
      let format: string | null = null;
      const fileId = selectedFile.id;
      if (fileId === 'voxel_fbx' || fileId === 'voxel-fbx') format = 'voxel-fbx';
      else if (fileId === 'voxel_vrm' || fileId === 'voxel') format = 'voxel';
      else if (fileId === 'fbx') format = 'fbx';
      else if (fileId === 'glb') format = 'glb';

      downloadAvatar(avatar, format);
    } else if (selectedFile && selectedFile.url) {
      const link = document.createElement('a');
      link.href = selectedFile.url;

      let filename = correctedFilename || selectedFile.filename;
      if (!filename && selectedFile.url) {
        const urlParts = selectedFile.url.split('/');
        const urlFilename = urlParts[urlParts.length - 1];
        if (urlFilename.includes('.') && !urlFilename.includes('?')) {
          filename = urlFilename.split('?')[0];
        } else {
          const extension = imageFormat ? getExtensionFromFormat(imageFormat) :
            (selectedFile.url ? selectedFile.url.split('.').pop()?.split('?')[0] : null) ||
            selectedFile.label.split('.').pop()?.toLowerCase() || 'bin';
          filename = `${avatar?.name || 'file'}.${extension}`;
        }
      }
      if (!filename) filename = selectedFile.filename || selectedFile.label || 'file';

      link.download = filename;
      link.style.display = 'none';
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadAvatar(avatar, null);
    }
  } catch (error) {
    console.error('Download error:', error);
  }
}

export async function handleTextureDownload(texture: FileTypeInfo) {
  if (!texture.url) return;
  try {
    const response = await fetch(texture.url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = texture.filename || `${texture.label}.${texture.url.split('.').pop() || 'png'}`;
    link.style.display = 'none';
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
  } catch (error) {
    console.error('Texture download error:', error);
  }
}
