'use client';

import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ImageViewerProps {
  url: string;
  name: string;
}

const ZOOM_STEP_BUTTON = 1.3;
const ZOOM_STEP_WHEEL = 1.1;
const ZOOM_MAX = 8;
const ZOOM_MIN = 0.25;

export function ImageViewer({ url, name }: ImageViewerProps) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoom(z => Math.min(z * ZOOM_STEP_BUTTON, ZOOM_MAX));
  const zoomOut = () => setZoom(z => Math.max(z / ZOOM_STEP_BUTTON, ZOOM_MIN));
  const resetView = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) setZoom(z => Math.min(z * ZOOM_STEP_WHEEL, ZOOM_MAX));
    else setZoom(z => Math.max(z / ZOOM_STEP_WHEEL, ZOOM_MIN));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-gray-50 dark:bg-gray-900 overflow-hidden select-none"
      role="img"
      aria-label={`Image: ${name}. Use scroll to zoom, drag to pan.`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {/* Image */}
      <div className="w-full h-full flex items-center justify-center">
        <img
          src={url}
          alt={name}
          className="max-w-full max-h-full object-contain transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            pointerEvents: 'none',
          }}
          draggable={false}
          onError={(e) => {
            const el = e.currentTarget;
            if (!el.src.includes('/placeholder.png')) el.src = '/placeholder.png';
          }}
        />
      </div>

      {/* Controls — matches 3D viewer toolbar style */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-cream dark:bg-cream-dark border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
        <button onClick={zoomIn} className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors" title={t('avatar.imageViewer.zoomIn') as string}>
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={zoomOut} className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors" title={t('avatar.imageViewer.zoomOut') as string}>
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={resetView} className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors" title={t('avatar.imageViewer.resetView') as string}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={toggleFullscreen} className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors" title={t('avatar.imageViewer.fullscreen') as string}>
          <Maximize2 className="h-4 w-4" />
        </button>
        <button onClick={handleDownload} className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors" title={t('avatar.imageViewer.download') as string}>
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-3 left-3 z-10 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
