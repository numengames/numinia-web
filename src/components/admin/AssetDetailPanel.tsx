'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Copy, ExternalLink, Save, Trash2, Download, Eye, EyeOff, Loader2 } from 'lucide-react';
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

  // Reset form when avatar changes
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
    <div className="w-[400px] h-full border-l bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-sm truncate">{avatar.name}</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="aspect-square bg-gray-100 dark:bg-gray-900 relative">
          {isVideo ? (
            <video
              key={url}
              src={url}
              controls autoPlay muted loop playsInline
              className="w-full h-full object-contain"
            />
          ) : isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-end gap-[2px] h-16">
                {Array.from({ length: 24 }).map((_, i) => (
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
              <audio key={url} src={url} controls autoPlay className="w-full max-w-[280px]" />
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
            <img src={avatar.thumbnailUrl} alt={avatar.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No preview</div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Identity */}
          <section className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />

            <label className="text-xs font-medium text-gray-500">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-sm" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">ID</span>
              <button
                onClick={() => copyToClipboard(avatar.id)}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 font-mono"
              >
                {avatar.id.length > 30 ? avatar.id.slice(0, 15) + '...' + avatar.id.slice(-8) : avatar.id}
                <Copy className="h-3 w-3" />
              </button>
            </div>

            {avatar.canonical && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Canonical</span>
                <code className="text-[9px] text-gray-400 font-mono truncate max-w-[200px]">{avatar.canonical}</code>
              </div>
            )}
          </section>

          {/* Technical */}
          <section className="space-y-1">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Technical</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-gray-400">Format</span>
              <Badge variant="secondary" className="text-[10px] w-fit">{avatar.format}</Badge>

              <span className="text-gray-400">Size</span>
              <span>{formatSize(avatar.file_size_bytes)}</span>

              <span className="text-gray-400">Version</span>
              <span>{avatar.version ? `v${avatar.version}` : '—'}</span>

              <span className="text-gray-400">Status</span>
              <span>{avatar.status || 'active'}</span>
            </div>
          </section>

          {/* License & Creator */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">License & Creator</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400">License</label>
                <select
                  value={license}
                  onChange={e => setLicense(e.target.value)}
                  className="w-full h-7 text-xs border rounded px-2 bg-white dark:bg-gray-900"
                >
                  <option value="CC0">CC0</option>
                  <option value="CC-BY">CC BY</option>
                  <option value="CC-BY-SA">CC BY-SA</option>
                  <option value="CC-BY-NC">CC BY-NC</option>
                  <option value="MIT">MIT</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400">Creator</label>
                <Input value={creator} onChange={e => setCreator(e.target.value)} className="h-7 text-xs" />
              </div>
            </div>
          </section>

          {/* Storage */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage</h4>
            <div className="space-y-1">
              {storage?.r2 && (
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px]">R2 CDN</Badge>
                  <a href={storage.r2} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {storage?.github_raw && (
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px]">GitHub</Badge>
                  <a href={storage.github_raw} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {storage?.ipfs_cid && (
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">IPFS</Badge>
                  <span className="text-[10px] text-gray-400 font-mono">{storage.ipfs_cid.slice(0, 16)}...</span>
                </div>
              )}
              {storage?.arweave_tx && (
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Arweave</Badge>
                  <span className="text-[10px] text-gray-400 font-mono">{storage.arweave_tx.slice(0, 16)}...</span>
                </div>
              )}
              {!storage?.r2 && !storage?.github_raw && !storage?.ipfs_cid && !storage?.arweave_tx && (
                <p className="text-xs text-gray-400">No storage info available</p>
              )}
            </div>
          </section>

          {/* NFT */}
          {nft && (
            <section className="space-y-1">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NFT</h4>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-400">Mint status</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] w-fit ${
                    nft.mint_status === 'minted' ? 'bg-green-100 text-green-700' :
                    nft.mint_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}
                >
                  {String(nft.mint_status || 'unminted')}
                </Badge>

                {!!nft.chain_id && <>
                  <span className="text-gray-400">Chain</span>
                  <span>{String(nft.chain_id)}</span>
                </>}

                {!!nft.contract && <>
                  <span className="text-gray-400">Contract</span>
                  <span className="font-mono text-[10px] truncate">{String(nft.contract)}</span>
                </>}

                {!!nft.token_id && <>
                  <span className="text-gray-400">Token ID</span>
                  <span>#{String(nft.token_id)}</span>
                </>}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div className="p-3 border-t flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 gap-1"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? '✓ Saved' : <><Save className="h-3 w-3" /> Save</>}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleVisibility(avatar.id)}
          title={avatar.isPublic ? 'Hide' : 'Show'}
        >
          {avatar.isPublic ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        {avatar.modelFileUrl && (
          <a href={avatar.modelFileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><Download className="h-3 w-3" /></Button>
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 hover:text-red-700"
          onClick={() => { if (confirm('Delete this asset?')) onDelete(avatar.id); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
