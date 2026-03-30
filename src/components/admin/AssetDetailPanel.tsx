'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Copy, ExternalLink, Save, Trash2, Download, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

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

  useEffect(() => {
    setName(avatar.name);
    setDescription(avatar.description || '');
    setCreator(avatar.creator || '');
    setLicense(avatar.license || 'CC0');
    setSaved(false);
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

  const url = avatar.modelFileUrl || '';
  const isVideo = /\.(mp4|webm)$/i.test(url);
  const isAudio = /\.(mp3|ogg)$/i.test(url);
  const is3D = !isVideo && !isAudio && !!url;
  const nft = avatar.nft as Record<string, unknown> | undefined;
  const storage = avatar.storage;

  return (
    <div className="w-full sm:w-[420px] h-full border-l border-gray-200 dark:border-gray-800 bg-cream dark:bg-cream-dark flex flex-col overflow-hidden">
      {/* Header — sticky */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 bg-cream dark:bg-cream-dark">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="secondary" className="shrink-0 text-[10px]">{avatar.format}</Badge>
          <h3 className="font-semibold text-base truncate text-gray-900 dark:text-white">{avatar.name}</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose} title="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview — 16:9 aspect for video, square for 3D */}
        <div className={`bg-gray-100 dark:bg-gray-900 relative ${isVideo ? 'aspect-video' : 'aspect-square'}`}>
          {isVideo ? (
            <video key={url} src={url} controls autoPlay muted loop playsInline className="w-full h-full object-contain" />
          ) : isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-end gap-[2px] h-16">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
                    style={{
                      height: `${16 + Math.sin(i * 0.5) * 24 + Math.random() * 20}px`,
                      animationDelay: `${i * 0.05}s`,
                      animationDuration: `${0.8 + Math.random() * 0.4}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{avatar.name}</p>
              <audio key={url} src={url} controls autoPlay className="w-full max-w-[300px]" />
            </div>
          ) : is3D ? (
            <VRMViewer
              key={url}
              url={url}
              backgroundGLB={null}
              onMetadataLoad={() => {}}
              onTexturesLoad={() => {}}
              showInfoPanel={false}
              onToggleInfoPanel={() => {}}
              hideControls={true}
              cameraDistanceMultiplier={0.6}
            />
          ) : avatar.thumbnailUrl ? (
            <img src={avatar.thumbnailUrl} alt={avatar.name} className="w-full h-full object-contain bg-gray-50" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No preview</div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">

          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 bg-white dark:bg-gray-900 border-gray-200" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9 bg-white dark:bg-gray-900 border-gray-200" placeholder="Add description..." />
            </div>
          </div>

          {/* Creator & License */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">License</label>
              <select
                value={license}
                onChange={e => setLicense(e.target.value)}
                className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="CC0">CC0 (Public Domain)</option>
                <option value="CC-BY">CC BY 4.0</option>
                <option value="CC-BY-SA">CC BY-SA 4.0</option>
                <option value="CC-BY-NC">CC BY-NC 4.0</option>
                <option value="MIT">MIT</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Creator</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input value={creator} onChange={e => setCreator(e.target.value)} className="h-9 pl-8 bg-white dark:bg-gray-900 border-gray-200" placeholder="Creator name" />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Technical Details */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Technical</h4>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Format</span>
              <span className="text-right"><Badge variant="secondary" className="text-[10px]">{avatar.format}</Badge></span>

              <span className="text-gray-500">Size</span>
              <span className="text-right text-gray-900 dark:text-white">{formatSize(avatar.file_size_bytes)}</span>

              <span className="text-gray-500">Version</span>
              <span className="text-right text-gray-900 dark:text-white">{avatar.version ? `v${avatar.version}` : '—'}</span>

              <span className="text-gray-500">Status</span>
              <span className="text-right">
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    avatar.status === 'active' ? 'bg-green-100 text-green-700' :
                    avatar.status === 'deprecated' ? 'bg-gray-100 text-gray-600' :
                    avatar.status === 'stolen' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}
                >
                  {avatar.status || 'active'}
                </Badge>
              </span>

              <span className="text-gray-500">Visibility</span>
              <span className="text-right">
                <Badge variant="secondary" className={`text-[10px] ${avatar.isPublic ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                  {avatar.isPublic ? 'Public' : 'Hidden'}
                </Badge>
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Storage */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Storage Layers</h4>
            <div className="space-y-2">
              {storage?.r2 && (
                <div className="flex items-center justify-between py-1">
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px]">R2 CDN</Badge>
                  <a href={storage.r2} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
              {storage?.github_raw && (
                <div className="flex items-center justify-between py-1">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px]">GitHub</Badge>
                  <a href={storage.github_raw} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
              {storage?.ipfs_cid && (
                <div className="flex items-center justify-between py-1">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">IPFS</Badge>
                  <code className="text-[10px] text-gray-400 font-mono">{storage.ipfs_cid.slice(0, 20)}...</code>
                </div>
              )}
              {storage?.arweave_tx && (
                <div className="flex items-center justify-between py-1">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Arweave</Badge>
                  <code className="text-[10px] text-gray-400 font-mono">{storage.arweave_tx.slice(0, 20)}...</code>
                </div>
              )}
              {!storage?.r2 && !storage?.github_raw && !storage?.ipfs_cid && !storage?.arweave_tx && (
                <p className="text-xs text-gray-400 italic">No storage info</p>
              )}
            </div>
          </div>

          {/* NFT */}
          {nft && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <div>
                <h4 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">NFT</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-gray-500">Mint status</span>
                  <span className="text-right">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        nft.mint_status === 'minted' ? 'bg-green-100 text-green-700' :
                        nft.mint_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {String(nft.mint_status || 'unminted')}
                    </Badge>
                  </span>
                  {!!nft.chain_id && <>
                    <span className="text-gray-500">Chain</span>
                    <span className="text-right">{String(nft.chain_id)}</span>
                  </>}
                  {!!nft.contract && <>
                    <span className="text-gray-500">Contract</span>
                    <code className="text-right text-[10px] font-mono truncate">{String(nft.contract)}</code>
                  </>}
                  {!!nft.token_id && <>
                    <span className="text-gray-500">Token</span>
                    <span className="text-right">#{String(nft.token_id)}</span>
                  </>}
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Asset ID */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Identifiers</h4>
            <div className="space-y-1.5">
              <button
                onClick={() => copyToClipboard(avatar.id)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded text-[11px] font-mono text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Click to copy Asset ID"
              >
                <span className="truncate">{avatar.id}</span>
                <Copy className="h-3 w-3 shrink-0 ml-2" />
              </button>
              {avatar.canonical && (
                <button
                  onClick={() => copyToClipboard(avatar.canonical!)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 rounded text-[10px] font-mono text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Click to copy Canonical ID (used in NFT tokenURI)"
                >
                  <span className="truncate">{avatar.canonical}</span>
                  <Copy className="h-3 w-3 shrink-0 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions footer — sticky bottom */}
      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-cream dark:bg-cream-dark flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 gap-1.5 h-9"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? '✓ Saved' : <><Save className="h-3.5 w-3.5" /> Save</>}
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={() => onToggleVisibility(avatar.id)} title={avatar.isPublic ? 'Hide' : 'Show'}>
          {avatar.isPublic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        {avatar.modelFileUrl && (
          <a href={avatar.modelFileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-9" title="Download file"><Download className="h-3.5 w-3.5" /></Button>
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-red-500 hover:text-red-700 hover:border-red-300"
          onClick={() => { if (confirm('Delete this asset permanently?')) onDelete(avatar.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
