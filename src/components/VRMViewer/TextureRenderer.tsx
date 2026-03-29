'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface TextureRendererProps {
  texture: THREE.Texture;
  size?: number;
}

// Compact texture preview component - optimized for uniform thumbnail display
const TextureRenderer = ({ texture, size = 200 }: TextureRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!texture || !canvasRef.current) return;

    // Get the actual texture dimensions
    const img = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas | null;
    if (!img) {
      console.warn('Texture has no image data');
      return;
    }

    const textureWidth = (img as HTMLImageElement).width || size;
    const textureHeight = (img as HTMLImageElement).height || size;
    const aspectRatio = textureWidth / textureHeight;

    // Calculate thumbnail dimensions maintaining aspect ratio
    let thumbWidth: number, thumbHeight: number;

    if (aspectRatio >= 1) {
      thumbWidth = size;
      thumbHeight = size / aspectRatio;
    } else {
      thumbHeight = size;
      thumbWidth = size * aspectRatio;
    }

    thumbWidth = Math.round(thumbWidth);
    thumbHeight = Math.round(thumbHeight);

    const canvas = canvasRef.current;
    canvas.width = thumbWidth;
    canvas.height = thumbHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, thumbWidth, thumbHeight);

    try {
      if (
        img instanceof HTMLImageElement ||
        img instanceof HTMLCanvasElement ||
        img instanceof ImageBitmap ||
        img instanceof OffscreenCanvas
      ) {
        ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
      } else {
        renderWithWebGL(texture, canvas, thumbWidth, thumbHeight);
      }
    } catch {
      renderWithWebGL(texture, canvas, thumbWidth, thumbHeight);
    }
  }, [texture, size]);

  const renderWithWebGL = (tex: THREE.Texture, canvas: HTMLCanvasElement, width: number, height: number) => {
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);

      const material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const plane = new THREE.Mesh(geometry, material);

      scene.add(plane);
      renderer.render(scene, camera);

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    } catch {
      // Silent fallback — canvas stays blank
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', imageRendering: 'auto' }}
      className="mx-auto"
    />
  );
};

export default TextureRenderer;
