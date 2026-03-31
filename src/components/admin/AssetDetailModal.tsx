'use client';
import { csrfHeaders } from '@/lib/csrf-client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Copy, ExternalLink, Save, Trash2, Download, Eye, EyeOff, Loader2, User, Camera, GripHorizontal, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { HypViewer } from '@/components/asset/HypViewer';
import { STLViewer } from '@/components/asset/STLViewer';
import { ImageViewer } from '@/components/asset/ImageViewer';

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
  tags?: string[];
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
  const [tags, setTags] = useState<string[]>(avatar.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [nftChain, setNftChain] = useState<string>((avatar.nft as Record<string, string> | undefined)?.chain || '');
  const [nftContract, setNftContract] = useState<string>((avatar.nft as Record<string, string> | undefined)?.contract || '');
  const [nftTokenId, setNftTokenId] = useState<string>((avatar.nft as Record<string, string> | undefined)?.token_id || '');
  const [nftType, setNftType] = useState<string>((avatar.nft as Record<string, string> | undefined)?.type || 'ERC-1155');
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
    const nftData = avatar.nft as Record<string, string> | undefined;
    setName(avatar.name);
    setDescription(avatar.description || '');
    setCreator(avatar.creator || '');
    setLicense(avatar.license || 'CC0');
    setTags(avatar.tags || []);
    setTagInput('');
    setNftChain(nftData?.chain || '');
    setNftContract(nftData?.contract || '');
    setNftTokenId(nftData?.token_id || '');
    setNftType(nftData?.type || 'ERC-1155');
    setSaved(false);
    setThumbSaved(false);
    setThumbnailPreview(null);
    setPosition({ x: 0, y: 0 });
  }, [avatar.id, avatar.name, avatar.description, avatar.creator, avatar.license, avatar.nft]);

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
      const updates: Record<string, unknown> = { name, description, creator, license, tags };
      // Include NFT data if any field is filled
      if (nftContract || nftChain || nftTokenId) {
        updates.nft = {
          chain: nftChain || undefined,
          contract: nftContract || undefined,
          token_id: nftTokenId || undefined,
          type: nftType,
          mint_status: nftContract ? 'minted' : 'unminted',
        };
      }
      await onSave(avatar.id, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [avatar.id, name, description, creator, license, nftChain, nftContract, nftTokenId, nftType, onSave]);

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
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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
  const isHyp = /\.hyp$/i.test(url);
  const isStl = /\.stl$/i.test(url);
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  const is3D = !isVideo && !isAudio && !isHyp && !isStl && !isImage && !!url && /\.(vrm|glb|gltf|fbx)$/i.test(url);
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
              <video key={url} src={url} controls muted loop playsInline className="w-full h-full object-contain" />
            ) : isAudio ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-6">
                <div className="flex items-end gap-[2px] h-16">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="w-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
                      style={{ height: `${14 + Math.sin(i * 0.5) * 24 + Math.random() * 20}px`, animationDelay: `${i * 0.05}s`, animationDuration: `${0.8 + Math.random() * 0.4}s` }} />
                  ))}
                </div>
                <audio key={url} src={url} controls className="w-full max-w-sm" />
              </div>
            ) : isHyp ? (
              <HypViewer key={url} url={url} name={avatar.name} />
            ) : isStl ? (
              <STLViewer key={url} url={url} name={avatar.name} />
            ) : isImage ? (
              <ImageViewer key={url} url={url} name={avatar.name} />
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

            {/* Tags */}
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="text-gray-400 hover:text-red-500 ml-0.5">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim().toLowerCase();
                      if (!tags.includes(newTag)) setTags([...tags, newTag]);
                      setTagInput('');
                    }
                  }}
                  className="h-8 text-xs bg-white dark:bg-gray-900 flex-1"
                  placeholder="animation, emote, idle..."
                />
                <div className="flex gap-1 shrink-0">
                  {['animation', 'emote', 'idle', 'combat', 'social'].filter(t => !tags.includes(t)).slice(0, 3).map(t => (
                    <button key={t} onClick={() => setTags([...tags, t])} className="px-1.5 py-0.5 text-[9px] rounded bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      +{t}
                    </button>
                  ))}
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

              {/* Storage — all 4 layers with status + sync */}
              <div className="space-y-1.5 text-xs">
                <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Storage</h4>
                <div className="space-y-1">
                  {[
                    { key: 'R2', url: storage?.r2, ok: !!storage?.r2, color: 'text-orange-500', bgOk: 'bg-orange-50', label: 'Cloudflare R2 CDN', syncTo: 'r2' },
                    { key: 'GitHub', url: storage?.github_raw, ok: !!storage?.github_raw, color: 'text-gray-600', bgOk: 'bg-gray-50', label: 'GitHub Raw', syncTo: 'github' },
                    { key: 'IPFS', url: storage?.ipfs_cid ? `https://ipfs.io/ipfs/${storage.ipfs_cid}` : null, ok: !!storage?.ipfs_cid, color: 'text-blue-500', bgOk: 'bg-blue-50', label: 'IPFS', syncTo: 'ipfs' },
                    { key: 'Arweave', url: storage?.arweave_tx ? `https://arweave.net/${storage.arweave_tx}` : null, ok: !!storage?.arweave_tx, color: 'text-green-500', bgOk: 'bg-green-50', label: 'Arweave', syncTo: 'arweave' },
                  ].map(layer => (
                    <div key={layer.key} className={`flex items-center justify-between px-2 py-1 rounded ${layer.ok ? layer.bgOk + ' dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-900'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm ${layer.ok ? layer.color : 'text-gray-300 dark:text-gray-700'}`}>{layer.ok ? '●' : '○'}</span>
                        <span className={`text-[10px] ${layer.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>{layer.key}</span>
                      </div>
                      {layer.ok && layer.url ? (
                        <a href={layer.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline">View ↗</a>
                      ) : !layer.ok && (layer.syncTo === 'r2' || layer.syncTo === 'github') ? (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/admin/sync-to-${layer.syncTo}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ assetId: avatar.id }),
                              });
                              if (res.ok) window.location.reload();
                            } catch {}
                          }}
                          className="text-[9px] text-violet-500 hover:text-violet-700 font-medium"
                        >
                          Sync →
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {(() => {
                  const count = [storage?.r2, storage?.github_raw, storage?.ipfs_cid, storage?.arweave_tx].filter(Boolean).length;
                  return count <= 1 ? (
                    <div className="text-[9px] text-red-400 mt-1">⚠ Single point of failure — sync to more layers</div>
                  ) : (
                    <div className="text-[9px] text-green-600 mt-1">✓ Redundant ({count} layers)</div>
                  );
                })()}
              </div>
            </div>

            {/* NFT section — editable */}
            <div className="border-t border-gray-200 dark:border-gray-700" />
            <div>
              <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">NFT</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Chain</label>
                  <select value={nftChain} onChange={e => setNftChain(e.target.value)}
                    className="w-full h-9 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 bg-white dark:bg-gray-900">
                    <option value="">— Select —</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="base">Base</option>
                    <option value="polygon">Polygon</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Type</label>
                  <select value={nftType} onChange={e => setNftType(e.target.value)}
                    className="w-full h-9 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 bg-white dark:bg-gray-900">
                    <option value="ERC-721">ERC-721</option>
                    <option value="ERC-1155">ERC-1155</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Contract Address</label>
                  <Input value={nftContract} onChange={e => setNftContract(e.target.value)} className="h-9 bg-white dark:bg-gray-900 font-mono text-xs" placeholder="0x..." />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Token ID</label>
                  <Input value={nftTokenId} onChange={e => setNftTokenId(e.target.value)} className="h-9 bg-white dark:bg-gray-900 font-mono text-xs" placeholder="1" />
                </div>
                <div className="flex items-end">
                  {nftContract && nftChain && (
                    <a
                      href={`https://opensea.io/assets/${nftChain === 'ethereum' ? 'ethereum' : nftChain}/${nftContract}${nftTokenId ? `/${nftTokenId}` : ''}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors h-9"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      View on OpenSea
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
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
