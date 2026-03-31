'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Copy, ExternalLink, Save, Trash2, Download, Eye, EyeOff, Loader2, User, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { ThumbnailImage } from '@/components/ui/ThumbnailImage';

const VRMViewer = dynamic(
  () => import('@/components/VRMViewer/VRMViewer').then((mod) => mod.VRMViewer),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse" /> }
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

interface AssetDetailPanelProps {
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

export function AssetDetailPanel({ avatar, onClose, onSave, onDelete, onToggleVisibility }: AssetDetailPanelProps) {
  const [name, setName] = useState(avatar.name);
  const [description, setDescription] = useState(avatar.description || '');
  const [creator, setCreator] = useState(avatar.creator || '');
  const [license, setLicense] = useState(avatar.license || 'CC0');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(avatar.name);
    setDescription(avatar.description || '');
    setCreator(avatar.creator || '');
    setLicense(avatar.license || 'CC0');
    setSaved(false);
    setThumbnailPreview(null);
  }, [avatar.id, avatar.name, avatar.description, avatar.creator, avatar.license]);

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
      // Convert to base64 for the upload-thumbnail endpoint
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
    } catch {
      // Silently fail — preview stays as is
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
    <div className="w-full sm:w-[420px] h-full bg-cream dark:bg-cream-dark flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="secondary" className="shrink-0 text-[10px]">{avatar.format}</Badge>
          <h3 className="font-semibold text-sm truncate text-gray-900 dark:text-white">{avatar.name}</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose} title="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className={`bg-gray-100 dark:bg-gray-900 relative ${isVideo ? 'aspect-video' : 'aspect-square'} group`}>
          {isVideo ? (
            <video key={url} src={url} controls autoPlay muted loop playsInline className="w-full h-full object-contain" />
          ) : isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-4">
              <div className="flex items-end gap-[2px] h-12">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="w-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
                    style={{ height: `${14 + Math.sin(i * 0.5) * 20 + Math.random() * 16}px`, animationDelay: `${i * 0.05}s`, animationDuration: `${0.8 + Math.random() * 0.4}s` }} />
                ))}
              </div>
              <audio key={url} src={url} controls autoPlay className="w-full max-w-[280px]" />
            </div>
          ) : is3D ? (
            <VRMViewer key={url} url={url} backgroundGLB={null} onMetadataLoad={() => {}} onTexturesLoad={() => {}} showInfoPanel={false} onToggleInfoPanel={() => {}} hideControls={true} cameraDistanceMultiplier={0.6} />
          ) : displayThumb ? (
            <ThumbnailImage src={displayThumb} alt={avatar.name} className="object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No preview</div>
          )}

          {/* Thumbnail upload overlay */}
          <button
            onClick={() => thumbInputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-md px-2 py-1 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Change thumbnail"
          >
            {isUploadingThumb ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            Thumbnail
          </button>
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleThumbnailUpload(f);
            }}
          />
        </div>

        <div className="p-4 space-y-4">
          {/* Name & Description */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-sm bg-white dark:bg-gray-900" placeholder="Add description..." />
            </div>
          </div>

          {/* Creator & License */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">License</label>
              <select value={license} onChange={e => setLicense(e.target.value)}
                className="w-full h-8 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 bg-white dark:bg-gray-900">
                <option value="CC0">CC0</option>
                <option value="CC-BY">CC BY 4.0</option>
                <option value="CC-BY-SA">CC BY-SA</option>
                <option value="CC-BY-NC">CC BY-NC</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Creator</label>
              <div className="relative">
                <User className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                <Input value={creator} onChange={e => setCreator(e.target.value)} className="h-8 text-xs pl-7 bg-white dark:bg-gray-900" placeholder="Name" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Technical */}
          <div className="grid grid-cols-2 gap-y-1.5 text-xs">
            <span className="text-gray-400">Format</span>
            <span className="text-right"><Badge variant="secondary" className="text-[10px]">{avatar.format}</Badge></span>
            <span className="text-gray-400">Size</span>
            <span className="text-right">{formatSize(avatar.file_size_bytes)}</span>
            <span className="text-gray-400">Version</span>
            <span className="text-right">{avatar.version ? `v${avatar.version}` : '—'}</span>
            <span className="text-gray-400">Status</span>
            <span className="text-right"><Badge variant="secondary" className={`text-[10px] ${avatar.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{avatar.status || 'active'}</Badge></span>
            <span className="text-gray-400">Visibility</span>
            <span className="text-right"><Badge variant="secondary" className={`text-[10px] ${avatar.isPublic ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{avatar.isPublic ? 'Public' : 'Hidden'}</Badge></span>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Storage */}
          <div>
            <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Storage</h4>
            <div className="flex flex-wrap gap-1.5">
              {storage?.r2 && <a href={storage.r2} target="_blank" rel="noopener noreferrer"><Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px] cursor-pointer hover:bg-orange-200" title="Cloudflare R2 CDN">R2 ↗</Badge></a>}
              {storage?.github_raw && <a href={storage.github_raw} target="_blank" rel="noopener noreferrer"><Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] cursor-pointer hover:bg-gray-200" title="GitHub Raw">GH ↗</Badge></a>}
              {storage?.ipfs_cid && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]" title={`IPFS: ${storage.ipfs_cid}`}>IPFS</Badge>}
              {storage?.arweave_tx && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]" title={`Arweave: ${storage.arweave_tx}`}>AR</Badge>}
              {!storage?.r2 && !storage?.github_raw && !storage?.ipfs_cid && !storage?.arweave_tx && <span className="text-[10px] text-gray-400 italic">No storage info</span>}
            </div>
          </div>

          {/* NFT */}
          {nft && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-gray-400">NFT</span>
                <span className="text-right"><Badge variant="secondary" className={`text-[10px] ${nft.mint_status === 'minted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{String(nft.mint_status || 'unminted')}</Badge></span>
                {!!nft.contract && <><span className="text-gray-400">Contract</span><code className="text-right text-[9px] font-mono truncate">{String(nft.contract)}</code></>}
                {!!nft.token_id && <><span className="text-gray-400">Token</span><span className="text-right">#{String(nft.token_id)}</span></>}
              </div>
            </>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* IDs */}
          <div className="space-y-1">
            <button onClick={() => copyToClipboard(avatar.id)}
              className="w-full flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded text-[10px] font-mono text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Copy Asset ID">
              <span className="truncate">{avatar.id}</span>
              <Copy className="h-3 w-3 shrink-0 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1.5 shrink-0 bg-cream dark:bg-cream-dark">
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 gap-1 h-8 text-xs">
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? '✓ Saved' : <><Save className="h-3 w-3" /> Save</>}
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onToggleVisibility(avatar.id)} title={avatar.isPublic ? 'Hide' : 'Show'}>
          {avatar.isPublic ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        {avatar.modelFileUrl && (
          <a href={avatar.modelFileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Download file"><Download className="h-3 w-3" /></Button>
          </a>
        )}
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" title="Delete asset"
          onClick={() => { if (confirm('Delete this asset permanently?')) onDelete(avatar.id); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
