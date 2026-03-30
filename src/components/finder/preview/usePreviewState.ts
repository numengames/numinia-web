import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { getExtensionFromUrl } from '@/lib/urlUtils';
import type { Avatar, FileTypeInfo, VRMMetadata, ModelStats, ExtractedTexture } from './types';
import { getFileFormat } from './preview-helpers';

export function usePreviewState(avatar: Avatar | null, selectedFile: FileTypeInfo | null) {
  const { t } = useI18n();

  // Helper function to ensure translation result is a string
  const getTranslationString = (value: string | string[]): string => {
    return Array.isArray(value) ? value[0] : value;
  };

  // Wrapper function to convert t() to the signature expected by helper functions
  const tString = (key: string): string => {
    return getTranslationString(t(key));
  };

  const captureRef = useRef<(() => string | null) | null>(null);
  const [thumbnailUpload, setThumbnailUpload] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

  const handleCaptureThumbnail = useCallback(async () => {
    if (!avatar || !captureRef.current) return;
    const dataUrl = captureRef.current();
    if (!dataUrl) return;
    setThumbnailUpload('uploading');
    try {
      const res = await fetch('/api/admin/upload-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, avatarId: avatar.id }),
      });
      if (!res.ok) throw new Error('Upload failed');
      setThumbnailUpload('done');
      setTimeout(() => setThumbnailUpload('idle'), 3000);
    } catch {
      setThumbnailUpload('error');
      setTimeout(() => setThumbnailUpload('idle'), 3000);
    }
  }, [avatar]);

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageFileSize, setImageFileSize] = useState<number | null>(null);
  const [imageFormat, setImageFormat] = useState<string | null>(null); // Detected format from Content-Type
  const [correctedFilename, setCorrectedFilename] = useState<string | null>(null); // Filename with correct extension
  const [modelFileSize, setModelFileSize] = useState<number | null>(null);
  const [vrmMetadata, setVrmMetadata] = useState<VRMMetadata | null>(null);
  const [vrmVersion, setVrmVersion] = useState<string | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats>({
    fileSize: t('finder.common.unknown') as string,
    format: t('finder.common.unknown') as string,
    height: 0,
    vertices: 0,
    triangles: 0,
    materials: 0,
    textures: 0,
    bones: 0,
  });
  const [activeTab, setActiveTab] = useState<'model' | 'textures'>('model');
  const [extractedTextures, setExtractedTextures] = useState<ExtractedTexture[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    alt: string;
    filename?: string;
    downloadHandler?: () => void;
  } | null>(null);

  // Helper to map Content-Type to image format
  const getImageFormatFromContentType = (contentType: string | null): string | null => {
    if (!contentType) return null;

    const contentTypeLower = contentType.toLowerCase();
    const formatMap: Record<string, string> = {
      'image/png': 'PNG',
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/gif': 'GIF',
      'image/webp': 'WEBP',
      'image/svg+xml': 'SVG',
      'image/bmp': 'BMP',
      'image/tiff': 'TIFF',
      'image/x-icon': 'ICO',
    };

    // Check exact match first
    if (formatMap[contentTypeLower]) {
      return formatMap[contentTypeLower];
    }

    // Check if it starts with image/
    if (contentTypeLower.startsWith('image/')) {
      const format = contentTypeLower.split('/')[1].split(';')[0].toUpperCase();
      return format;
    }

    return null;
  };

  // Helper to get file extension from format
  const getExtensionFromFormat = (format: string): string => {
    const extMap: Record<string, string> = {
      'PNG': 'png',
      'JPEG': 'jpg',
      'GIF': 'gif',
      'WEBP': 'webp',
      'SVG': 'svg',
      'BMP': 'bmp',
      'TIFF': 'tiff',
      'ICO': 'ico',
    };
    return extMap[format.toUpperCase()] || 'png';
  };

  // Load image dimensions, file size, and format when image file is selected
  useEffect(() => {
    if (selectedFile && (selectedFile.category === 'thumbnail' || selectedFile.category === 'texture') && selectedFile.url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        setImageDimensions(null);
      };

      img.src = selectedFile.url;

      // Fetch file size and Content-Type
      fetch(selectedFile.url, { method: 'HEAD' })
        .then((response) => {
          // Get Content-Type to determine actual format
          const contentType = response.headers.get('content-type');
          const detectedFormat = getImageFormatFromContentType(contentType);

          if (detectedFormat) {
            setImageFormat(detectedFormat);

            // Update filename with correct extension if missing
            const currentFilename = selectedFile.filename || (selectedFile.url ? selectedFile.url.split('/').pop() : null) || 'image';
            const hasExtension = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico)$/i.test(currentFilename);

            if (!hasExtension) {
              const extension = getExtensionFromFormat(detectedFormat);
              const baseName = currentFilename.split('.')[0] || currentFilename;
              setCorrectedFilename(`${baseName}.${extension}`);
            } else {
              setCorrectedFilename(null); // Filename already has extension
            }
          } else {
            setImageFormat(null);
            setCorrectedFilename(null);
          }

          // Get file size
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            setImageFileSize(parseInt(contentLength, 10));
          }
        })
        .catch(() => {
          // If HEAD fails, try to get size and type from the loaded image/blob
          if (!selectedFile.url) return;

          let detectedFormatFromResponse: string | null = null;

          fetch(selectedFile.url)
            .then((response) => {
              // Try to get Content-Type from response
              const contentType = response.headers.get('content-type');
              detectedFormatFromResponse = getImageFormatFromContentType(contentType);

              if (detectedFormatFromResponse) {
                setImageFormat(detectedFormatFromResponse);

                // Update filename with correct extension if missing
                const currentFilename = selectedFile.filename || (selectedFile.url ? selectedFile.url.split('/').pop() : null) || 'image';
                const hasExtension = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico)$/i.test(currentFilename);

                if (!hasExtension) {
                  const extension = getExtensionFromFormat(detectedFormatFromResponse);
                  const baseName = currentFilename.split('.')[0] || currentFilename;
                  setCorrectedFilename(`${baseName}.${extension}`);
                } else {
                  setCorrectedFilename(null);
                }
              } else {
                setImageFormat(null);
                setCorrectedFilename(null);
              }

              return response.blob();
            })
            .then((blob) => {
              setImageFileSize(blob.size);

              // If we didn't get format from headers, try from blob type
              if (!detectedFormatFromResponse && blob.type) {
                const detectedFormat = getImageFormatFromContentType(blob.type);
                if (detectedFormat) {
                  setImageFormat(detectedFormat);

                  const currentFilename = selectedFile.filename || (selectedFile.url ? selectedFile.url.split('/').pop() : null) || 'image';
                  const hasExtension = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico)$/i.test(currentFilename);

                  if (!hasExtension) {
                    const extension = getExtensionFromFormat(detectedFormat);
                    const baseName = currentFilename.split('.')[0] || currentFilename;
                    setCorrectedFilename(`${baseName}.${extension}`);
                  } else {
                    setCorrectedFilename(null);
                  }
                }
              }
            })
            .catch(() => {
              setImageFileSize(null);
              setImageFormat(null);
              setCorrectedFilename(null);
            });
        });
    } else {
      setImageDimensions(null);
      setImageFileSize(null);
      setImageFormat(null);
      setCorrectedFilename(null);
    }
  }, [selectedFile]);

  // Load file size for GLB/FBX model files
  useEffect(() => {
    if (selectedFile && selectedFile.category === 'model' && selectedFile.url) {
      const fileFormat = getFileFormat(selectedFile);
      // Only fetch file size for GLB/FBX files (not VRM, as VRM file size comes from metadata)
      if (fileFormat === 'FBX' || fileFormat === 'GLB' || fileFormat === 'GLTF') {
        // Fetch file size
        fetch(selectedFile.url, { method: 'HEAD' })
          .then((response) => {
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              setModelFileSize(parseInt(contentLength, 10));
            } else {
              // If HEAD doesn't provide content-length, try fetching as blob
              if (!selectedFile.url) return;
              fetch(selectedFile.url)
                .then((response) => response.blob())
                .then((blob) => {
                  setModelFileSize(blob.size);
                })
                .catch(() => {
                  setModelFileSize(null);
                });
            }
          })
          .catch(() => {
            // If HEAD fails, try to get size from fetching the blob
            if (!selectedFile.url) return;
            fetch(selectedFile.url)
              .then((response) => response.blob())
              .then((blob) => {
                setModelFileSize(blob.size);
              })
              .catch(() => {
                setModelFileSize(null);
              });
          });
      } else {
        setModelFileSize(null);
      }
    } else {
      setModelFileSize(null);
    }
  }, [selectedFile]);

  // Handle metadata load from VRMViewer
  const handleMetadataLoad = useMemo(() => {
    return (data: Record<string, unknown> | null) => {
      if (!data) return;

      // Update model stats
      // Cast data properties for model stats — values come from VRM parser
      const d = data as Record<string, string | number | boolean | null | undefined | Record<string, unknown>>;
      setModelStats(prev => ({
        ...prev,
        triangles: (d.triangleCount as number) || 0,
        materials: (d.materialCount as number) || 0,
        format: (d.format as string) || (t('finder.common.unknown') as string),
        height: (d.avatarHeight as number) || 0,
        fileSize: (d.fileSize as string) || (t('finder.common.unknown') as string),
        vertices: (d.vertexCount as number) || 0,
        textures: (d.textureCount as number) || 0,
        bones: (d.boneCount as number) || 0,
      }));

      // Set VRM version
      setVrmVersion((d.vrmVersion as string) || (t('finder.common.unknown') as string));

      // Process VRM metadata if available
      if (d.rawMetadata) {
        try {
          const rawMeta = d.rawMetadata as Record<string, unknown>;
          const authors = rawMeta.authors as string[] | undefined;
          const cleanedMetadata: VRMMetadata = {
            title: (rawMeta.title as string) || (t('finder.common.unknown') as string),
            version: (d.version as string) || (rawMeta.version as string) || (rawMeta.specVersion as string) || (t('finder.common.unknown') as string),
            author: (rawMeta.author as string) || authors?.[0] || (t('finder.common.unknown') as string),
            contactInformation: (d.contactInformation as string) || (rawMeta.contactInformation as string) || '',
            reference: (d.reference as string) || (rawMeta.reference as string) || '',
            licenseType: rawMeta.licenseType as number | undefined,
            licenseName: (d.licenseName as string) || (rawMeta.licenseName as string) || '',
            allowedUserName: rawMeta.allowedUserName as number | undefined,
            commercialUsageName: (rawMeta.commercialUsageName || rawMeta.commercialUssageName) as number | undefined,
            violentUsageName: (rawMeta.violentUsageName || rawMeta.violentUssageName) as number | undefined,
            sexualUsageName: (rawMeta.sexualUsageName || rawMeta.sexualUssageName) as number | undefined,
            otherPermissions: (rawMeta.otherPermissionUrl as string) || (rawMeta.otherPermissions as string) || '',
          };

          setVrmMetadata(cleanedMetadata);
        } catch (error) {
          console.error('Error processing metadata:', error);
        }
      }
    };
  }, []);

  // Handle textures load from VRMViewer
  const handleTexturesLoad = useMemo(() => {
    return (textures: ExtractedTexture[]) => {
      setExtractedTextures(textures);
    };
  }, []);

  // Reset metadata when avatar or selected file changes
  useEffect(() => {
    setVrmMetadata(null);
    setVrmVersion(null);
    setExtractedTextures([]);
    setModelFileSize(null); // Reset model file size
    setModelStats({
      fileSize: t('finder.common.unknown') as string,
      format: t('finder.common.unknown') as string,
      height: 0,
      vertices: 0,
      triangles: 0,
      materials: 0,
      textures: 0,
      bones: 0,
    });
  }, [avatar?.id, selectedFile?.id]);

  // Determine which file to preview - memoized to prevent unnecessary VRMViewer reloads
  // Must be called before any early returns to follow Rules of Hooks
  const previewFile = useMemo(() => {
    if (selectedFile) {
      return selectedFile;
    }
    if (avatar?.modelFileUrl) {
      return {
        id: 'vrm_main',
        label: 'VRM',
        url: avatar.modelFileUrl,
        isVoxel: false,
        category: 'model' as const,
      };
    }
    return null;
  }, [selectedFile, avatar?.modelFileUrl]);

  // Check if we're viewing a 3D model file (VRM or GLB) - must be before early returns to follow Rules of Hooks
  // Show tabs for VRM files only (GLB files can display textures but don't have VRM-specific metadata)
  const isVRMFile = useMemo(() => {
    // Helper to check if a file is VRM
    const checkIsVRM = (file: { id?: string; filename?: string; url?: string | null; label?: string } | null): boolean => {
      if (!file) return false;

      // First, check file ID (most reliable indicator)
      if (file.id) {
        const fileId = file.id.toLowerCase();
        if (fileId === 'fbx' || fileId === 'voxel_fbx' || fileId === 'glb') {
          return false; // Explicitly not VRM
        }
        if (fileId === 'vrm' || fileId === 'vrm_main' || fileId === 'voxel_vrm') {
          return true;
        }
      }

      // Check filename (most reliable for Arweave files)
      if (file.filename) {
        const filenameExt = file.filename.split('.').pop()?.toLowerCase();
        if (filenameExt === 'fbx' || filenameExt === 'glb' || filenameExt === 'gltf') {
          return false; // Explicitly not VRM
        }
        if (filenameExt === 'vrm') return true;
      }

      // Check URL extension (pathname-based; avoids ?query breaking split('.').pop())
      if (file.url) {
        const urlExt = getExtensionFromUrl(file.url);
        if (urlExt === 'fbx' || urlExt === 'glb' || urlExt === 'gltf') {
          return false; // Explicitly not VRM
        }
        if (urlExt === 'vrm') return true;
      }

      // Check label (fallback - should contain format info)
      if (file.label) {
        const labelLower = file.label.toLowerCase();
        if (labelLower.includes('fbx') || labelLower.includes('glb') || labelLower.includes('gltf')) {
          return false; // Explicitly not VRM
        }
        if (labelLower.includes('vrm')) {
          return true;
        }
      }

      // If no extension in URL (Arweave), only assume VRM if we have no indication it's FBX/GLB
      if (file.url && (file.url.includes('arweave.net') || !file.url.includes('.'))) {
        // Only assume VRM if filename doesn't indicate otherwise
        if (file.filename) {
          const filenameExt = file.filename.split('.').pop()?.toLowerCase();
          if (filenameExt && filenameExt !== 'vrm' && filenameExt.length <= 5) {
            return false; // Has a non-VRM extension
          }
        }
        // If we can't determine from filename, check label
        if (file.label && !file.label.toLowerCase().includes('vrm')) {
          return false; // Label doesn't mention VRM
        }
        return true; // Arweave URL without clear indication, assume VRM
      }

      return false;
    };

    // If a specific file is selected, check if it's a VRM model
    if (previewFile) {
      // Only show tabs for model files, not for thumbnails or textures
      if (previewFile.category === 'model' && previewFile.url) {
        return checkIsVRM(previewFile);
      }
      // If it's a thumbnail or texture, don't show tabs
      return false;
    }
    // If no specific file is selected, check if the default model is VRM
    if (avatar?.modelFileUrl) {
      return checkIsVRM({ url: avatar.modelFileUrl });
    }
    return false;
  }, [previewFile, avatar?.modelFileUrl]);

  // Check if we're viewing any 3D model file (VRM, GLB, or FBX) for texture extraction
  // GLB files can have texture extraction even though they don't have VRM-specific metadata
  const isModelFile = useMemo(() => {
    // Helper to check if a file is a 3D model
    const checkIsModel = (file: { id?: string; filename?: string; url?: string | null; label?: string } | null): boolean => {
      if (!file) return false;

      // Check file ID
      if (file.id) {
        const fileId = file.id.toLowerCase();
        if (fileId === 'vrm' || fileId === 'vrm_main' || fileId === 'voxel_vrm' ||
            fileId === 'fbx' || fileId === 'voxel_fbx' || fileId === 'glb') {
          return true;
        }
      }

      // Check filename
      if (file.filename) {
        const filenameExt = file.filename.split('.').pop()?.toLowerCase();
        if (filenameExt === 'vrm' || filenameExt === 'fbx' || filenameExt === 'glb' || filenameExt === 'gltf') {
          return true;
        }
      }

      // Check URL extension
      if (file.url) {
        const urlExt = getExtensionFromUrl(file.url);
        if (urlExt === 'vrm' || urlExt === 'fbx' || urlExt === 'glb' || urlExt === 'gltf') {
          return true;
        }
      }

      // Check label
      if (file.label) {
        const labelLower = file.label.toLowerCase();
        if (labelLower.includes('vrm') || labelLower.includes('fbx') ||
            labelLower.includes('glb') || labelLower.includes('gltf')) {
          return true;
        }
      }

      return false;
    };

    // Check if the preview file is a 3D model
    if (previewFile && previewFile.category === 'model' && previewFile.url) {
      return checkIsModel(previewFile);
    }

    // Check if the default model is a 3D model
    if (avatar?.modelFileUrl) {
      return checkIsModel({ url: avatar.modelFileUrl });
    }

    return false;
  }, [previewFile, avatar?.modelFileUrl]);

  // Handle tab selection based on file type (must be after isVRMFile and isModelFile are defined)
  useEffect(() => {
    // Default to model tab for all 3D model files (VRM, GLB, FBX)
    if (isModelFile) {
      setActiveTab('model');
    }
  }, [isModelFile]);

  return {
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
  };
}
