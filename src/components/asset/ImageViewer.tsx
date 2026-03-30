'use client';

import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Download } from 'lucide-react';

interface ImageViewerProps {
  url: string;
  name: string;
}

export function ImageViewer({ url, name }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoom(z => Math.min(z * 1.3, 8));
  const zoomOut = () => setZoom(z => Math.max(z / 1.3, 0.25));
  const resetView = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) setZoom(z => Math.min(z * 1.1, 8));
    else setZoom(z => Math.max(z / 1.1, 0.25));
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

      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
        <button onClick={zoomIn} className="p-1.5 text-white/80 hover:text-white transition-colors" title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={zoomOut} className="p-1.5 text-white/80 hover:text-white transition-colors" title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={resetView} className="p-1.5 text-white/80 hover:text-white transition-colors" title="Reset view">
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-white/20" />
        <button onClick={toggleFullscreen} className="p-1.5 text-white/80 hover:text-white transition-colors" title="Fullscreen">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button onClick={handleDownload} className="p-1.5 text-white/80 hover:text-white transition-colors" title="Download">
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
