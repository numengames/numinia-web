'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const size = 512; // Output size
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, size, size,
  );

  return canvas.toDataURL('image/png');
}

export function AvatarCropModal({ open, onClose, onSave }: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }, []);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave(cropped);
      onClose();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [imageSrc, croppedAreaPixels, onSave, onClose]);

  const handleClose = useCallback(() => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={handleClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[#1e1e22] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Select an image</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          {!imageSrc ? (
            /* Upload state */
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-white/5 transition-all">
                <Upload className="h-8 w-8 text-gray-500 mb-2" />
                <span className="text-sm text-gray-400">Upload image</span>
                <span className="text-xs text-gray-600 mt-1">JPG, PNG, GIF, WebP</span>
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </label>
            </div>
          ) : (
            /* Crop state */
            <div className="space-y-4">
              {/* Crop area */}
              <div className="relative h-64 rounded-lg overflow-hidden bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-gray-500 shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <ZoomIn className="h-4 w-4 text-gray-500 shrink-0" />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setImageSrc(null)} className="flex-1 text-gray-400 hover:text-white">
                  Change image
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                  {saving ? 'Saving...' : 'Apply'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
