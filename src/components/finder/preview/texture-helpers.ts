import * as THREE from 'three';
import type { ExtractedTexture } from './types';

// Helper function to get image URL from texture (for lightbox)
export const getTextureImageUrl = (texture: ExtractedTexture): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // If the texture image is already an HTMLImageElement with a src, use it
      if (texture.texture.image instanceof HTMLImageElement && texture.texture.image.src) {
        resolve(texture.texture.image.src);
        return;
      }

      // Otherwise, convert to data URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx || !texture.texture.image) {
        reject(new Error('Cannot get texture image: missing context or image'));
        return;
      }

      canvas.width = texture.texture.image.width;
      canvas.height = texture.texture.image.height;

      if (texture.texture.image instanceof HTMLImageElement) {
        ctx.drawImage(texture.texture.image, 0, 0);
        resolve(canvas.toDataURL('image/png', 0.95));
      } else if (texture.texture.image instanceof HTMLCanvasElement) {
        ctx.drawImage(texture.texture.image, 0, 0);
        resolve(canvas.toDataURL('image/png', 0.95));
      } else {
        // Use WebGL renderer for other types
        const tempScene = new THREE.Scene();
        const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const tempRenderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true
        });
        tempRenderer.setSize(texture.texture.image.width, texture.texture.image.height);

        const tempMaterial = new THREE.MeshBasicMaterial({
          map: texture.texture,
          side: THREE.DoubleSide
        });
        const tempGeometry = new THREE.PlaneGeometry(2, 2);
        const tempMesh = new THREE.Mesh(tempGeometry, tempMaterial);
        tempScene.add(tempMesh);

        tempRenderer.render(tempScene, tempCamera);
        ctx.drawImage(tempRenderer.domElement, 0, 0);

        tempGeometry.dispose();
        tempMaterial.dispose();
        tempRenderer.dispose();

        resolve(canvas.toDataURL('image/png', 0.95));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to download extracted texture as image (from VRM)
export const downloadExtractedTexture = (texture: ExtractedTexture) => {
  // Create a canvas to render the texture
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx || !texture.texture.image) {
    console.error('Cannot download texture: missing context or image');
    return;
  }

  // Set canvas dimensions to match the texture
  canvas.width = texture.texture.image.width;
  canvas.height = texture.texture.image.height;

  // If it's a normal HTML image, we can draw it directly
  if (texture.texture.image instanceof HTMLImageElement) {
    ctx.drawImage(texture.texture.image, 0, 0);
  }
  // If it's a canvas (which might be the case for some textures), we can use the canvas directly
  else if (texture.texture.image instanceof HTMLCanvasElement) {
    ctx.drawImage(texture.texture.image, 0, 0);
  }
  // For other types of images (like ImageBitmap or OffscreenCanvas)
  else {
    // Create a temporary renderer to render the texture to canvas
    // Don't specify canvas in WebGLRenderer - it will create its own
    const tempScene = new THREE.Scene();
    const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const tempRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    tempRenderer.setSize(texture.texture.image.width, texture.texture.image.height);

    // Create a plane with the texture
    const tempMaterial = new THREE.MeshBasicMaterial({
      map: texture.texture,
      side: THREE.DoubleSide
    });
    const tempGeometry = new THREE.PlaneGeometry(2, 2);
    const tempMesh = new THREE.Mesh(tempGeometry, tempMaterial);
    tempScene.add(tempMesh);

    // Render to the renderer's canvas
    tempRenderer.render(tempScene, tempCamera);

    // Draw the renderer's canvas to our download canvas
    ctx.drawImage(tempRenderer.domElement, 0, 0);

    // Clean up
    tempGeometry.dispose();
    tempMaterial.dispose();
    tempRenderer.dispose();
  }

  // Convert to data URL and download
  try {
    const mimeType = 'image/png';
    const dataURL = canvas.toDataURL(mimeType, 0.95);
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${texture.name || 'texture'}.png`;
    link.style.display = 'none';
    link.setAttribute('rel', 'noopener noreferrer'); // Security best practice
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error creating download link:', error);
  }
};

// Helper functions for texture info (similar to VRMInspector)
export const getImageFormat = (texture: THREE.Texture, t: (key: string) => string | string[]): string => {
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
