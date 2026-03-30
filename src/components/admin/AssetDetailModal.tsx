'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Copy, ExternalLink, Save, Trash2, Download, Eye, EyeOff, Loader2, User, Camera, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

const VRMViewer = dynamic(
  () => import('@/components/VRMViewer/VRMViewer').then((mod) => mod.VRMViewer),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" /> }
);

interface Avatar {
  id: string;
  name: string;
  description: string;
  modelFileUrl: string | null;
  thumbnailUrl: string | null;
  format: string;
  isPublic: boolean;
  storage?: { r2?: string; ipfs_cid?: string; arweave_tx?: string; github_raw?: string };
  status?: string;
  version?: string;
  file_size_bytes?: number;
  canonical?: string;
  nft?: Record<string, unknown>;
  license?: string;
  creator?: string;
}

interface AssetDetailModalProps {
  avatar: Avatar;
  onClose: () => void;
  onSave: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function AssetDetailModal({ avatar, onClose, onSave, onDelete, onToggleVisibility }: AssetDetailModalProps) {
  const [name, setName] = useState(avatar.name);
  const [description, setDescription] = useState(avatar.description || '');
  const [creator, setCreator] = useState(avatar.creator || '');
  const [license, setLicense] = useState(avatar.license || 'CC0');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [thumbSaved, setThumbSaved] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setName(avatar.name);
    setDescription(avatar.description || '');
    setCreator(avatar.creator || '');
    setLicense(avatar.license || 'CC0');
    setSaved(false);
    setThumbSaved(false);
    setThumbnailPreview(null);
    setPosition({ x: 0, y: 0 });
  }, [avatar.id, avatar.name, avatar.description, avatar.creator, avatar.license]);

  // Escape to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await onSave(avatar.id, { name, description, creator, license });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [avatar.id, name, description, creator, license, onSave]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    setIsUploadingThumb(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/admin/upload-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64, avatarId: avatar.id }),
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setThumbnailPreview(data.thumbnailUrl || base64);
    } catch { /* silently fail */ } finally {
      setIsUploadingThumb(false);
    }
  }, [avatar.id]);

  // Capture the 3D viewer canvas as thumbnail
  const captureViewerThumbnail = useCallback(async () => {
    setIsUploadingThumb(true);
    setThumbSaved(false);
    try {
      const container = previewContainerRef.current;
      if (!container) throw new Error('No preview container');
      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('No canvas found');

      const dataUrl = canvas.toDataURL('image/png');

      const res = await fetch('/api/admin/upload-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, avatarId: avatar.id }),
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setThumbnailPreview(data.thumbnailUrl || dataUrl);
      setThumbSaved(true);
      setTimeout(() => setThumbSaved(false), 2500);
    } catch {
      // silently fail
    } finally {
      setIsUploadingThumb(false);
    }
  }, [avatar.id]);

  const url = avatar.modelFileUrl || '';
  const isVideo = /\.(mp4|webm)$/i.test(url);
  const isAudio = /\.(mp3|ogg)$/i.test(url);
  const is3D = !isVideo && !isAudio && !!url && /\.(vrm|glb|gltf|fbx)$/i.test(url);
  const nft = avatar.nft as Record<string, unknown> | undefined;
  const storage = avatar.storage;
  const displayThumb = thumbnailPreview || avatar.thumbnailUrl;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed z-50 top-1/2 left-1/2 w-[95vw] max-w-2xl max-h-[90vh] bg-cream dark:bg-cream-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
        style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          className={`flex items-center justify-center py-1.5 border-b border-gray-200 dark:border-gray-700 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <GripHorizontal className="h-4 w-4 text-gray-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="shrink-0 text-[10px]">{avatar.format}</Badge>
            <h3 className="font-semibold text-base truncate text-gray-900 dark:text-white">{avatar.name}</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose} title="Close (Esc)">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Preview — wider in modal */}
          <div ref={previewContainerRef} className={`bg-gray-100 dark:bg-gray-900 relative mx-5 rounded-lg overflow-hidden ${isVideo ? 'aspect-video' : 'aspect-[4/3]'} group`}>
            {isVideo ? (
              <video key={url} src={url} controls autoPlay muted loop playsInline className="w-full h-full object-contain" />
            ) : isAudio ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-6">
                <div className="flex items-end gap-[2px] h-16">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="w-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
                      style={{ height: `${14 + Math.sin(i * 0.5) * 24 + Math.random() * 20}px`, animationDelay: `${i * 0.05}s`, animationDuration: `${0.8 + Math.random() * 0.4}s` }} />
                  ))}
                </div>
                <audio key={url} src={url} controls autoPlay className="w-full max-w-sm" />
              </div>
            ) : is3D ? (
              <VRMViewer key={url} url={url} backgroundGLB={null} onMetadataLoad={() => {}} onTexturesLoad={() => {}} showInfoPanel={false} onToggleInfoPanel={() => {}} hideControls={true} cameraDistanceMultiplier={0.6} />
            ) : displayThumb ? (
              <img src={displayThumb} alt={avatar.name} className="w-full h-full object-contain bg-gray-50" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No preview</div>
            )}

            {/* Thumbnail capture (3D) or upload (non-3D) */}
            <button
              onClick={is3D ? captureViewerThumbnail : () => thumbInputRef.current?.click()}
              disabled={isUploadingThumb}
              className={`absolute bottom-2 right-2 rounded-md px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all ${
                thumbSaved
                  ? 'bg-green-500 text-white opacity-100'
                  : 'bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100'
              } disabled:opacity-70`}
              title={is3D ? 'Capture current view as thumbnail' : 'Upload thumbnail image'}
            >
              {isUploadingThumb ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
              ) : thumbSaved ? (
                <>✓ Saved!</>
              ) : (
                <><Camera className="h-3 w-3" /> Thumbnail</>
              )}
            </button>
            <input ref={thumbInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); }} />
          </div>

          <div className="p-5 space-y-4">
            {/* Editable fields — 2 column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-9 bg-white dark:bg-gray-900" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Description</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9 bg-white dark:bg-gray-900" placeholder="Add description..." />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">License</label>
                <select value={license} onChange={e => setLicense(e.target.value)}
                  className="w-full h-9 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 bg-white dark:bg-gray-900">
                  <option value="CC0">CC0</option>
                  <option value="CC-BY">CC BY 4.0</option>
                  <option value="CC-BY-SA">CC BY-SA</option>
                  <option value="CC-BY-NC">CC BY-NC</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Creator</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <Input value={creator} onChange={e => setCreator(e.target.value)} className="h-9 pl-8 bg-white dark:bg-gray-900" placeholder="Name" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Technical + Storage — compact two-column */}
            <div className="grid grid-cols-2 gap-4">
              {/* Technical */}
              <div className="space-y-1.5 text-xs">
                <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Technical</h4>
                <div className="flex justify-between"><span className="text-gray-400">Format</span><Badge variant="secondary" className="text-[10px]">{avatar.format}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-400">Size</span><span>{formatSize(avatar.file_size_bytes)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Version</span><span>{avatar.version ? `v${avatar.version}` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Status</span><Badge variant="secondary" className={`text-[10px] ${avatar.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{avatar.status || 'active'}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-400">Visibility</span><Badge variant="secondary" className={`text-[10px] ${avatar.isPublic ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{avatar.isPublic ? 'Public' : 'Hidden'}</Badge></div>
              </div>

              {/* Storage */}
              <div className="space-y-1.5 text-xs">
                <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Storage</h4>
                <div className="flex flex-wrap gap-1.5">
                  {storage?.r2 && <a href={storage.r2} target="_blank" rel="noopener noreferrer"><Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px] cursor-pointer hover:bg-orange-200" title="R2 CDN">R2 ↗</Badge></a>}
                  {storage?.github_raw && <a href={storage.github_raw} target="_blank" rel="noopener noreferrer"><Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] cursor-pointer hover:bg-gray-200" title="GitHub">GH ↗</Badge></a>}
                  {storage?.ipfs_cid && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]" title={`IPFS: ${storage.ipfs_cid}`}>IPFS</Badge>}
                  {storage?.arweave_tx && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]" title={`AR: ${storage.arweave_tx}`}>AR</Badge>}
                  {!storage?.r2 && !storage?.github_raw && !storage?.ipfs_cid && !storage?.arweave_tx && <span className="text-gray-400 italic">No info</span>}
                </div>

                {/* NFT */}
                {nft && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">NFT</h4>
                    <Badge variant="secondary" className={`text-[10px] ${nft.mint_status === 'minted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {String(nft.mint_status || 'unminted')}
                    </Badge>
                    {!!nft.contract && <div className="mt-1 text-[9px] font-mono text-gray-400 truncate">{String(nft.contract)}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* ID — copy to clipboard */}
            <button onClick={() => copyToClipboard(avatar.id)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-[10px] font-mono text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Copy Asset ID">
              <span className="truncate">{avatar.id}</span>
              <Copy className="h-3 w-3 shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 gap-1.5 h-9">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? '✓ Saved' : <><Save className="h-3.5 w-3.5" /> Save</>}
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => onToggleVisibility(avatar.id)} title={avatar.isPublic ? 'Hide' : 'Show'}>
            {avatar.isPublic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          {avatar.modelFileUrl && (
            <a href={avatar.modelFileUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0" title="Download"><Download className="h-3.5 w-3.5" /></Button>
            </a>
          )}
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:border-red-300" title="Delete"
            onClick={() => { if (confirm('Delete this asset permanently?')) onDelete(avatar.id); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
