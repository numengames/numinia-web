'use client';

import React, { memo } from 'react';
import { Download, Image as ImageIcon, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { getAvailableFileTypes, getAllAvatarFiles } from './utils/fileTypes';
import { downloadAvatar } from '@/lib/download-utils';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

import type { PreviewPanelProps, FileTypeInfo } from './preview/types';
import {
  formatFileSize,
  formatFileSizeInMB,
  getDownloadButtonText,
  extractFormat,
  getFileFormat,
  getLicenseTypeName,
  renderLinkableText,
  getAllowedUserName,
  getUsageName,
} from './preview/preview-helpers';
import {
  getTextureImageUrl,
  downloadExtractedTexture,
} from './preview/texture-helpers';
import { usePreviewState } from './preview/usePreviewState';

import ImageLightbox from './ImageLightbox';

const VRMViewer = dynamic(
  () => import('@/components/VRMViewer/VRMViewer').then((mod) => mod.VRMViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading viewer...</p>
      </div>
    ),
  }
);

const TextureRenderer = dynamic(
  () => import('@/components/VRMViewer/TextureRenderer'),
  { ssr: false }
);

function PreviewPanel({ avatar, selectedFile, projects }: PreviewPanelProps) {
  const {
    t,
    tString,
    getTranslationString,
    captureRef,
    thumbnailUpload,
    handleCaptureThumbnail,
    imageDimensions,
    imageFileSize,
    imageFormat,
    correctedFilename,
    modelFileSize,
    vrmMetadata,
    vrmVersion,
    modelStats,
    activeTab,
    setActiveTab,
    extractedTextures,
    lightboxImage,
    setLightboxImage,
    getExtensionFromFormat,
    handleMetadataLoad,
    handleTexturesLoad,
    previewFile,
    isVRMFile,
    isModelFile,
  } = usePreviewState(avatar, selectedFile);

  if (!avatar) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {t('finder.preview.noSelection')}
        </p>
      </div>
    );
  }

  const project = projects.find((p) => p.id === avatar.projectId);
  const fileTypes = getAvailableFileTypes(avatar);
  const allFiles = getAllAvatarFiles(avatar);
  const modelFileTypes = fileTypes.filter((ft) => ft.category === 'model');
  const thumbnailFiles = allFiles.filter((ft) => ft.category === 'thumbnail');
  const textureFiles = allFiles.filter((ft) => ft.category === 'texture');

  const handleDownload = async () => {
    try {
      // For model files (VRM, FBX, GLB), route through server-side API to preserve user gesture chain
      // This prevents Chrome security warnings
      if (selectedFile && selectedFile.category === 'model' && avatar) {
        // Determine format based on file ID
        let format: string | null = null;
        const fileId = selectedFile.id;
        if (fileId === 'voxel_fbx' || fileId === 'voxel-fbx') {
          format = 'voxel-fbx';
        } else if (fileId === 'voxel_vrm' || fileId === 'voxel') {
          format = 'voxel';
        } else if (fileId === 'fbx') {
          format = 'fbx';
        } else if (fileId === 'glb') {
          format = 'glb';
        }
        // For vrm_main and other VRM files, format is null (default)

        // Use server-side API to preserve user gesture chain
        downloadAvatar(avatar, format);
      } else if (selectedFile && selectedFile.url) {
        // For thumbnails and textures, use direct download (small files, less critical)
        // But we still need to preserve user gesture chain
        // Create link immediately without async fetch to preserve gesture
        const link = document.createElement('a');
        link.href = selectedFile.url;

        // Determine filename - prefer correctedFilename (with detected extension), then selectedFile.filename, fallback to extracting from URL or avatar name
        let filename = correctedFilename || selectedFile.filename;
        if (!filename && selectedFile.url) {
          // Try to extract from URL
          const urlParts = selectedFile.url.split('/');
          const urlFilename = urlParts[urlParts.length - 1];
          // Check if URL filename has an extension
          if (urlFilename.includes('.') && !urlFilename.includes('?')) {
            filename = urlFilename.split('?')[0]; // Remove query params
          } else {
            // Fallback: use avatar name with extension from detected format, label, or URL
            const extension = imageFormat ? getExtensionFromFormat(imageFormat) :
                             (selectedFile.url ? selectedFile.url.split('.').pop()?.split('?')[0] : null) ||
                             selectedFile.label.split('.').pop()?.toLowerCase() ||
                             'bin';
            filename = `${avatar?.name || 'file'}.${extension}`;
          }
        }

        // Ensure filename is defined
        if (!filename) {
          filename = selectedFile.filename || selectedFile.label || 'file';
        }

        link.download = filename;
        link.style.display = 'none';
        link.setAttribute('rel', 'noopener noreferrer'); // Security best practice
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Default: download avatar
        downloadAvatar(avatar, null);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleTextureDownload = async (texture: FileTypeInfo) => {
    if (!texture.url) return;
    try {
      // Fetch as blob to ensure proper download
      const response = await fetch(texture.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = texture.filename || `${texture.label}.${texture.url ? texture.url.split('.').pop() : 'png'}`;
      link.style.display = 'none';
      link.setAttribute('rel', 'noopener noreferrer'); // Security best practice
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke URL after a short delay to ensure download starts
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
    } catch (error) {
      console.error('Texture download error:', error);
    }
  };

  // Helper functions for texture info (similar to VRMInspector)
  const getImageFormat = (texture: THREE.Texture): string => {
    if (texture.userData && texture.userData.mimeType) {
      const mimeType = texture.userData.mimeType;
      if (mimeType.includes('image/')) {
        return mimeType.split('/')[1].toUpperCase();
      }
    }
    if (texture.image && texture.image.src) {
      const src = texture.image.src;
      if (src.includes('data:image/')) {
        const mimeType = src.split(';')[0].split(':')[1];
        return mimeType.split('/')[1].toUpperCase();
      } else {
        const extension = src.split('.').pop()?.toLowerCase();
        if (extension && ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
          return extension.toUpperCase();
        }
      }
    }
    if (texture.format === THREE.RGBAFormat) {
      return 'PNG (inferred)';
    }
    const translation = t('finder.common.unknown');
    return Array.isArray(translation) ? translation[0] : translation;
  };

  // Calculate vertices from polygonCount (approximate: vertices ≈ triangles * 2/3)
  const vertices = avatar.polygonCount ? Math.round(avatar.polygonCount * 2 / 3) : null;
  const triangles = avatar.polygonCount || null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-cream dark:bg-cream-dark min-w-0 max-w-full w-full">
      {/* Header - With tabs for all 3D model files (VRM, GLB, FBX) */}
      <div className="flex-none px-4 py-3 border-b border-gray-300 dark:border-gray-700 min-w-0 overflow-hidden">
        {isModelFile ? (
          <div className="flex items-center gap-0">
            {/* Show Model tab for all 3D model files */}
            <button
              onClick={() => setActiveTab('model')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'model'
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Model
            </button>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            {/* Show Textures tab for all 3D model files (VRM, GLB, FBX) */}
            <button
              onClick={() => setActiveTab('textures')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'textures'
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Textures
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {avatar.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {allFiles.length} {allFiles.length === 1 ? 'file' : 'files'}
            </p>
          </div>
        )}
      </div>

      {/* Textures Tab - Full panel when active (for all 3D model files) */}
      {isModelFile && activeTab === 'textures' ? (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 grid gap-4">
            {extractedTextures.length > 0 ? (
              extractedTextures.map((texture, index) => {
                const tex = texture.texture;
                const dimensions = tex.image ? `${tex.image.width} × ${tex.image.height}` : (t('finder.common.unknown') as string);

                return (
                  <div key={index} className="bg-cream dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                    {/* Texture Preview - Fixed height container for uniform display */}
                    <div
                      className="w-full h-[240px] relative bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={async () => {
                        try {
                          const imageUrl = await getTextureImageUrl(texture);
                          setLightboxImage({
                            url: imageUrl,
                            alt: texture.name,
                            filename: `${texture.name || 'texture'}.png`,
                            downloadHandler: () => downloadExtractedTexture(texture),
                          });
                        } catch (error) {
                          console.error('Error opening texture in lightbox:', error);
                        }
                      }}
                    >
                      <TextureRenderer
                        texture={tex}
                        size={220}
                      />
                    </div>

                    {/* Texture Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2 truncate" title={texture.name}>
                        {texture.name}
                      </h3>

                      <div className="space-y-1 text-xs min-w-0 max-w-full w-full">
                        <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.texture.dimensions')}:</span>
                          <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{dimensions}</span>
                        </div>
                        <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.texture.fileSize')}:</span>
                          <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{texture.fileSize}</span>
                        </div>
                        <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.texture.type')}:</span>
                          <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{texture.type}</span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() => downloadExtractedTexture(texture)}
                        className="mt-3 w-full inline-flex items-center justify-center p-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 bg-cream dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-900 dark:hover:border-gray-100 transition-all"
                        title={t('vrmviewer.texture.download') as string}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <p className="text-gray-500 dark:text-gray-400">{t('vrmviewer.textures.noTextures') || 'No textures found'}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Preview Area - Fixed 1:1 aspect ratio with proper overflow handling - Only show on model tab */}
          <div className="flex-none bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 min-w-0 relative" style={{ aspectRatio: '1 / 1', minHeight: '180px', maxHeight: '250px', width: '100%' }}>
            {/* Media players — check BEFORE 3D model to prevent VRMViewer loading audio/video */}
            {previewFile?.url && /\.(mp4|webm)$/i.test(previewFile.url) ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black rounded-lg">
                <video
                  key={previewFile.url}
                  src={previewFile.url}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            ) : previewFile?.url && /\.(mp3|ogg)$/i.test(previewFile.url) ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4">
                {/* Audio waveform visual */}
                <div className="flex items-end gap-[2px] h-12">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
                      style={{
                        height: `${12 + Math.sin(i * 0.5) * 20 + Math.random() * 16}px`,
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: `${0.8 + Math.random() * 0.4}s`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{previewFile.label || avatar?.name}</p>
                <audio
                  key={previewFile.url}
                  src={previewFile.url}
                  controls
                  autoPlay
                  className="w-full max-w-[220px]"
                />
              </div>
            ) : previewFile && previewFile.category === 'model' && previewFile.url ? (
              <VRMViewer
                key={previewFile.url}
                url={previewFile.url}
                backgroundGLB={null}
                onMetadataLoad={handleMetadataLoad}
                onTexturesLoad={handleTexturesLoad}
                showInfoPanel={false}
                onToggleInfoPanel={() => {}}
                hideControls={true}
                cameraDistanceMultiplier={0.6}
                captureRef={captureRef as any}
              />
            ) : previewFile && (previewFile.category === 'thumbnail' || previewFile.category === 'texture') && previewFile.url ? (
              // Show image for thumbnail and texture files
              <div className="w-full h-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800">
                <img
                  src={previewFile.url}
                  alt={previewFile.label}
                  className="max-w-full max-h-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.src.includes('/placeholder.png')) return;
                    el.src = '/placeholder.png';
                  }}
                  onClick={() => {
                    if (!previewFile.url) return;
                    setLightboxImage({
                      url: previewFile.url,
                      alt: previewFile.label,
                      filename: correctedFilename || previewFile.filename,
                      downloadHandler: () => {
                        handleDownload();
                      },
                    });
                  }}
                />
              </div>
            ) : (
              // Default: show 3D viewer or video with main model
              avatar?.modelFileUrl ? (
                /\.(mp4|webm)$/i.test(avatar.modelFileUrl) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black rounded-lg">
                    <video
                      key={avatar.modelFileUrl}
                      src={avatar.modelFileUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  </div>
                ) : /\.(mp3|ogg)$/i.test(avatar.modelFileUrl) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4">
                    <div className="flex items-end gap-[2px] h-12">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
                          style={{
                            height: `${12 + Math.sin(i * 0.5) * 20 + Math.random() * 16}px`,
                            animationDelay: `${i * 0.05}s`,
                            animationDuration: `${0.8 + Math.random() * 0.4}s`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{avatar.name}</p>
                    <audio
                      key={avatar.modelFileUrl}
                      src={avatar.modelFileUrl}
                      controls
                      autoPlay
                      className="w-full max-w-[220px]"
                    />
                  </div>
                ) : (
                  <VRMViewer
                    key={avatar.modelFileUrl}
                    url={avatar.modelFileUrl}
                    backgroundGLB={null}
                    onMetadataLoad={handleMetadataLoad}
                    onTexturesLoad={handleTexturesLoad}
                    showInfoPanel={false}
                    onToggleInfoPanel={() => {}}
                    hideControls={true}
                    cameraDistanceMultiplier={0.6}
                    captureRef={captureRef as any}
                  />
                )
              ) : null
            )}
            {/* Thumbnail capture removed — available in admin panel only */}
          </div>

          {/* Scrollable Info Section */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 max-w-full">
        <div className="p-2 sm:p-4 space-y-4 min-w-0 max-w-full w-full box-border">
          {/* Quick Info - Always visible */}
          <div className="space-y-2">
            {selectedFile && (
              <div className="flex items-center gap-2">
                {selectedFile.category === 'model' ? (
                  <Box className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0">
                  {correctedFilename || selectedFile.filename || selectedFile.label}
                </h3>
              </div>
            )}
            {!selectedFile && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('finder.preview.metadata.collection')}: {project?.name || avatar.projectId}
                </p>
                <div>
                  <Badge variant="secondary" className="text-xs">
                    {project?.license || 'CC0'}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Image Information - Direct display (not in accordion) */}
          {selectedFile && (selectedFile.category === 'thumbnail' || selectedFile.category === 'texture') && (
            <div className="space-y-1 border-b border-gray-200 dark:border-gray-700 pb-4 px-2 sm:px-4 text-xs">
              <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Type:</span>
                <span className="text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1 text-right max-w-full">
                  {selectedFile.category === 'thumbnail' ? (t('finder.common.thumbnail') as string) : (t('finder.common.texture') as string)}
                </span>
              </div>
              {(correctedFilename || selectedFile.filename) && (
                <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Filename:</span>
                  <span className="text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1 text-right max-w-full">
                    {correctedFilename || selectedFile.filename}
                  </span>
                </div>
              )}
              <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Format:</span>
                <span className="text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1 text-right max-w-full">
                  {imageFormat || extractFormat(selectedFile.label) || 'Unknown'}
                </span>
              </div>
              {imageDimensions && (
                <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Dimensions:</span>
                  <span className="text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1 text-right max-w-full">
                    {imageDimensions.width.toLocaleString()} × {imageDimensions.height.toLocaleString()}
                  </span>
                </div>
              )}
              {imageFileSize && (
                <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">File Size:</span>
                  <span className="text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1 text-right max-w-full">
                    {formatFileSize(imageFileSize, tString)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Collapsible Sections - Conditional based on selection */}
          <div className="min-w-0 max-w-full w-full overflow-hidden box-border">
          <Accordion>
            {/* Case 1: Avatar selected (no specific file) - Show all info */}
            {!selectedFile && (
              <>
                {/* VRM Basic Information - from VRM file */}
                {vrmMetadata && (
                  <AccordionItem title={t('finder.sections.basicInformation') as string} defaultOpen>
                    <div className="space-y-1 text-xs min-w-0 max-w-full w-full">
                      <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Name:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{vrmMetadata.title || 'undefined'}</span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.author')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-all min-w-0 flex-1 text-right max-w-full">{vrmMetadata.author || 'undefined'}</span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.version')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {vrmMetadata?.version && vrmMetadata.version !== getTranslationString(t('finder.common.unknown')) ? `v${vrmMetadata.version}` : 'undefined'}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.contactInfo')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-all min-w-0 flex-1 text-right max-w-full">{vrmMetadata.contactInformation || 'undefined'}</span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.references')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-all min-w-0 flex-1 text-right max-w-full">{vrmMetadata.reference || 'undefined'}</span>
                      </div>
                    </div>
                  </AccordionItem>
                )}

                {/* Model Information - merged with statistics */}
                <AccordionItem title={t('finder.sections.modelInformation') as string} defaultOpen>
                  <div className="space-y-1 text-xs min-w-0">
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Format:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {avatar?.modelFileUrl ? getFileFormat({
                            id: 'vrm_main',
                            label: 'VRM',
                            url: avatar.modelFileUrl,
                            isVoxel: false,
                            category: 'model'
                          }) : 'Unknown'}
                        </span>
                      </div>
                    {vrmVersion && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">VRM Type:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {vrmVersion}
                        </span>
                      </div>
                    )}
                    {modelStats.fileSize !== getTranslationString(t('finder.common.unknown')) && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.fileSize')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{modelStats.fileSize}</span>
                      </div>
                    )}
                    {modelStats.height > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.height')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.height.toFixed(2)}m
                        </span>
                      </div>
                    )}
                    {modelStats.vertices > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.vertices')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.vertices.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {modelStats.triangles > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.triangles')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.triangles.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {((vertices && vertices > 0) || (triangles && triangles > 0)) && !modelStats.triangles && (
                      <>
                        {vertices && vertices > 0 && (
                          <div className="flex gap-x-3 items-start min-w-0">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Vertices:</span>
                            <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                              {vertices.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {triangles && triangles > 0 && (
                          <div className="flex gap-x-3 items-start min-w-0">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Triangles:</span>
                            <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                              {triangles.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {((modelStats.materials > 0) || (avatar.materialCount && avatar.materialCount > 0)) && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.materials')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.materials > 0 ? modelStats.materials : (avatar.materialCount && avatar.materialCount > 0 ? avatar.materialCount : modelStats.materials)}
                        </span>
                      </div>
                    )}
                    {(extractedTextures.length > 0 || (modelStats.textures > 0 && extractedTextures.length === 0)) && (
                      <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.textures')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {extractedTextures.length > 0 ? extractedTextures.length : modelStats.textures}
                        </span>
                      </div>
                    )}
                    {modelStats.bones > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.bones')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{modelStats.bones}</span>
                      </div>
                    )}
                  </div>
                </AccordionItem>

                {/* VRM License Information - from VRM file */}
                {vrmMetadata && (vrmMetadata.licenseType !== undefined || vrmMetadata.licenseName || vrmMetadata.allowedUserName !== undefined || vrmMetadata.commercialUsageName !== undefined || vrmMetadata.violentUsageName !== undefined || vrmMetadata.sexualUsageName !== undefined) && (
                  <AccordionItem title={t('finder.sections.licenseInformation') as string} defaultOpen>
                    <div className="space-y-1 text-xs min-w-0 max-w-full w-full">
                      <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.type')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getLicenseTypeName(vrmMetadata.licenseType, vrmMetadata.licenseName, vrmMetadata.otherPermissions, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.allowedUsers')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getAllowedUserName(vrmMetadata.allowedUserName, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.commercialUse')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getUsageName(vrmMetadata.commercialUsageName, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.violentUsage')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getUsageName(vrmMetadata.violentUsageName, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.sexualUsage')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getUsageName(vrmMetadata.sexualUsageName, tString)}
                        </span>
                      </div>
                      {vrmMetadata.otherPermissions && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('vrmviewer.metadata.otherPermissions')}</div>
                          <div className="text-xs text-gray-900 dark:text-gray-100 break-words">
                            {renderLinkableText(vrmMetadata.otherPermissions)}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                )}

                {/* Available Files */}
                {allFiles.length > 0 && (
                  <AccordionItem title={t('finder.sections.availableFiles') as string} defaultOpen>
                    <div className="space-y-2">
                      {allFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {file.category === 'model' && <Box className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                            {file.category === 'thumbnail' && <ImageIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                            {file.category === 'texture' && <ImageIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                            <span className="text-gray-700 dark:text-gray-300 truncate">
                              {file.label}
                            </span>
                            {file.filename && (
                              <span className="text-xs text-gray-500 dark:text-gray-500 truncate">
                                ({file.filename})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionItem>
                )}

                {/* Textures */}
                {textureFiles.length > 0 && (
                  <AccordionItem title={`TEXTURES (${textureFiles.length})`} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-3">
                      {textureFiles.map((texture) => (
                        <div
                          key={texture.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-md p-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                        >
                          {texture.url ? (
                            <>
                              <img
                                src={texture.url}
                                alt={texture.label}
                                className="w-full aspect-square object-cover rounded mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  const el = e.currentTarget;
                                  if (el.src.includes('/placeholder.png')) return;
                                  el.src = '/placeholder.png';
                                }}
                                onClick={() => {
                                  setLightboxImage({
                                    url: texture.url!,
                                    alt: texture.label,
                                    filename: texture.filename,
                                    downloadHandler: () => handleTextureDownload(texture),
                                  });
                                }}
                              />
                              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                {texture.filename || texture.label}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {texture.label}
                                </p>
                                <button
                                  onClick={() => handleTextureDownload(texture)}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Download
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded mb-2 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionItem>
                )}

                {/* Description */}
                {avatar.description && (
                  <AccordionItem title={t('finder.sections.description') as string} defaultOpen={false}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {avatar.description}
                    </p>
                  </AccordionItem>
                )}
              </>
            )}

            {/* Case 2: Model file selected - Show model info and stats only */}
            {selectedFile && selectedFile.category === 'model' && (
              <>
                {/* VRM Basic Information - from VRM file */}
                {vrmMetadata && (
                  <AccordionItem title={t('finder.sections.basicInformation') as string} defaultOpen>
                    <div className="space-y-1 text-xs min-w-0 max-w-full w-full">
                      <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Name:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{vrmMetadata.title || 'undefined'}</span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.author')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-all min-w-0 flex-1 text-right max-w-full">{vrmMetadata.author || 'undefined'}</span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.version')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {vrmMetadata?.version && vrmMetadata.version !== getTranslationString(t('finder.common.unknown')) ? `v${vrmMetadata.version}` : 'undefined'}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.contactInfo')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-all min-w-0 flex-1 text-right max-w-full">{vrmMetadata.contactInformation || 'undefined'}</span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.metadata.references')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-all min-w-0 flex-1 text-right max-w-full">{vrmMetadata.reference || 'undefined'}</span>
                      </div>
                    </div>
                  </AccordionItem>
                )}

                {/* File Information - merged with model statistics */}
                <AccordionItem title={t('finder.sections.fileInformation') as string} defaultOpen>
                  <div className="space-y-1 text-xs min-w-0">
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Format:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getFileFormat(selectedFile)}
                        </span>
                      </div>
                    {selectedFile?.filename && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Filename:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {selectedFile.filename}
                        </span>
                      </div>
                    )}
                    {/* Show file size for GLB/FBX files */}
                    {(() => {
                      const fileFormat = getFileFormat(selectedFile);
                      const isGLBOrFBX = fileFormat === 'FBX' || fileFormat === 'GLB' || fileFormat === 'GLTF';

                      if (isGLBOrFBX && modelFileSize !== null) {
                        return (
                          <div className="flex gap-x-3 items-start min-w-0">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.fileSize')}:</span>
                            <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                              {formatFileSizeInMB(modelFileSize, tString)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* Show VRM Type only for VRM files */}
                    {vrmVersion && getFileFormat(selectedFile) === 'VRM' && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">VRM Type:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {vrmVersion}
                        </span>
                      </div>
                    )}
                    {/* Show file size from modelStats (for VRM files loaded via VRMViewer) */}
                    {modelStats.fileSize !== getTranslationString(t('finder.common.unknown')) && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.fileSize')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{modelStats.fileSize}</span>
                      </div>
                    )}
                    {/* Show model statistics for all 3D model files (VRM, GLB, GLTF) */}
                    {modelStats.height > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.height')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.height.toFixed(2)}m
                        </span>
                      </div>
                    )}
                    {modelStats.vertices > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.vertices')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.vertices.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {modelStats.triangles > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.triangles')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.triangles.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Fallback to avatar-level polygon count if modelStats not loaded yet */}
                    {((vertices && vertices > 0) || (triangles && triangles > 0)) && !modelStats.triangles && (
                      <>
                        {vertices && vertices > 0 && (
                          <div className="flex gap-x-3 items-start min-w-0">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Vertices:</span>
                            <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                              {vertices.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {triangles && triangles > 0 && (
                          <div className="flex gap-x-3 items-start min-w-0">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">Triangles:</span>
                            <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                              {triangles.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {((modelStats.materials > 0) || (avatar.materialCount && avatar.materialCount > 0)) && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.materials')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {modelStats.materials > 0 ? modelStats.materials : (avatar.materialCount && avatar.materialCount > 0 ? avatar.materialCount : modelStats.materials)}
                        </span>
                      </div>
                    )}
                    {(extractedTextures.length > 0 || (modelStats.textures > 0 && extractedTextures.length === 0)) && (
                      <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.textures')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {extractedTextures.length > 0 ? extractedTextures.length : modelStats.textures}
                        </span>
                      </div>
                    )}
                    {modelStats.bones > 0 && (
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.statistics.bones')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">{modelStats.bones}</span>
                      </div>
                    )}
                  </div>
                </AccordionItem>

                {/* VRM License Information - from VRM file */}
                {vrmMetadata && (vrmMetadata.licenseType !== undefined || vrmMetadata.licenseName || vrmMetadata.allowedUserName !== undefined || vrmMetadata.commercialUsageName !== undefined || vrmMetadata.violentUsageName !== undefined || vrmMetadata.sexualUsageName !== undefined) && (
                  <AccordionItem title={t('finder.sections.licenseInformation') as string} defaultOpen>
                    <div className="space-y-1 text-xs min-w-0 max-w-full w-full">
                      <div className="flex gap-x-3 items-start min-w-0 max-w-full w-full">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.type')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getLicenseTypeName(vrmMetadata.licenseType, vrmMetadata.licenseName, vrmMetadata.otherPermissions, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.allowedUsers')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getAllowedUserName(vrmMetadata.allowedUserName, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.commercialUse')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getUsageName(vrmMetadata.commercialUsageName, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.violentUsage')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getUsageName(vrmMetadata.violentUsageName, tString)}
                        </span>
                      </div>
                      <div className="flex gap-x-3 items-start min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">{t('vrmviewer.license.sexualUsage')}:</span>
                        <span className="text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1 text-right max-w-full">
                          {getUsageName(vrmMetadata.sexualUsageName, tString)}
                        </span>
                      </div>
                      {vrmMetadata.otherPermissions && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('vrmviewer.metadata.otherPermissions')}</div>
                          <div className="text-xs text-gray-900 dark:text-gray-100 break-words">
                            {renderLinkableText(vrmMetadata.otherPermissions)}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                )}
              </>
            )}
          </Accordion>
          </div>
        </div>
      </div>

          {/* Sticky Download Button at Bottom */}
          <div className="flex-none border-t border-gray-300 dark:border-gray-700 p-4 bg-cream dark:bg-cream-dark min-w-0 overflow-hidden">
            <Button
              onClick={handleDownload}
              variant="default"
              className="w-full min-w-0"
            >
              <Download className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate min-w-0">{getDownloadButtonText(selectedFile, avatar, tString)}</span>
            </Button>
          </div>
        </>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxImage !== null}
        imageUrl={lightboxImage?.url || ''}
        imageAlt={lightboxImage?.alt || ''}
        filename={lightboxImage?.filename}
        onClose={() => setLightboxImage(null)}
        onDownload={lightboxImage?.downloadHandler}
      />
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders when parent re-renders
// Only re-render if avatar, selectedFile, or projects actually change
export default memo(PreviewPanel, (prevProps, nextProps) => {
  // Return true if props are equal (should NOT re-render)
  // Return false if props are different (should re-render)

  // Check avatar
  if (prevProps.avatar?.id !== nextProps.avatar?.id) return false;
  if (prevProps.avatar?.modelFileUrl !== nextProps.avatar?.modelFileUrl) return false;

  // Check selectedFile
  if (prevProps.selectedFile?.id !== nextProps.selectedFile?.id) return false;
  if (prevProps.selectedFile?.url !== nextProps.selectedFile?.url) return false;

  // Check projects array length (shallow check - if length changes, re-render)
  if (prevProps.projects.length !== nextProps.projects.length) return false;

  // Props are equal, don't re-render
  return true;
});
