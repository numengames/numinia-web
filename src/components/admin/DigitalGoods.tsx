'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Diamond, ExternalLink, Search, Plus, Loader2 } from 'lucide-react';
import { ThumbnailImage } from '@/components/ui/ThumbnailImage';

interface NftAsset {
  id: string;
  name: string;
  format: string;
  thumbnailUrl: string | null;
  nft?: {
    chain?: string;
    contract?: string;
    token_id?: string;
    type?: string;
    mint_status?: string;
  };
}

interface NftCollection {
  chain: string;
  contract: string;
  type: string;
  assets: NftAsset[];
}

function getOpenSeaUrl(chain: string, contract: string, tokenId?: string) {
  const base = `https://opensea.io/assets/${chain === 'ethereum' ? 'ethereum' : chain}/${contract}`;
  return tokenId ? `${base}/${tokenId}` : base;
}

function ChainBadge({ chain }: { chain: string }) {
  const colors: Record<string, string> = {
    base: 'bg-blue-100 text-blue-700',
    ethereum: 'bg-indigo-100 text-indigo-700',
    polygon: 'bg-purple-100 text-purple-700',
    arbitrum: 'bg-sky-100 text-sky-700',
    optimism: 'bg-red-100 text-red-700',
  };
  return (
    <Badge variant="secondary" className={`text-[10px] ${colors[chain] || 'bg-gray-100 text-gray-600'}`}>
      {chain}
    </Badge>
  );
}

export function DigitalGoods() {
  const [assets, setAssets] = useState<NftAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => {
        const all = (data.avatars || []) as NftAsset[];
        setAssets(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by contract
  const nftAssets = assets.filter(a => a.nft?.contract);
  const nonNftAssets = assets.filter(a => !a.nft?.contract);

  const collections = nftAssets.reduce<NftCollection[]>((acc, asset) => {
    const key = `${asset.nft!.chain}:${asset.nft!.contract}`;
    let col = acc.find(c => `${c.chain}:${c.contract}` === key);
    if (!col) {
      col = { chain: asset.nft!.chain || 'unknown', contract: asset.nft!.contract!, type: asset.nft!.type || 'ERC-1155', assets: [] };
      acc.push(col);
    }
    col.assets.push(asset);
    return acc;
  }, []);

  const filteredUnlinked = search
    ? nonNftAssets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : nonNftAssets.slice(0, 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Digital Goods</h1>
        <p className="text-sm text-gray-500">NFT-linked assets and collections in the Numinia ecosystem.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{nftAssets.length}</div>
          <div className="text-xs text-gray-500 mt-1">NFT-Linked</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{collections.length}</div>
          <div className="text-xs text-gray-500 mt-1">Collections</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{nonNftAssets.length}</div>
          <div className="text-xs text-gray-500 mt-1">Unlinked</div>
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Collections</h2>
          {collections.map((col) => (
            <div key={`${col.chain}:${col.contract}`} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              {/* Collection header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Diamond className="h-4 w-4 text-violet-500 shrink-0" />
                  <span className="text-xs font-mono text-gray-500 truncate">{col.contract.slice(0, 6)}...{col.contract.slice(-4)}</span>
                  <ChainBadge chain={col.chain} />
                  <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">{col.type}</Badge>
                </div>
                <a
                  href={getOpenSeaUrl(col.chain, col.contract)}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  OpenSea <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Assets in collection */}
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {col.assets.map(asset => (
                  <div key={asset.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                    {asset.thumbnailUrl ? (
                      <ThumbnailImage src={asset.thumbnailUrl} alt={asset.name} fill={false} width={40} height={40} className="rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                        <Diamond className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate text-gray-900 dark:text-white">{asset.name}</div>
                      <div className="text-[10px] text-gray-400">
                        {asset.nft?.token_id ? `#${asset.nft.token_id}` : 'No token ID'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <Diamond className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No collections yet</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Link NFT contracts to assets via the asset detail modal. Collections will appear here automatically.
          </p>
        </div>
      )}

      {/* Unlinked assets (for quick linking) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Unlinked Assets</h2>
          <span className="text-xs text-gray-400">{nonNftAssets.length} assets</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets to link..."
            className="pl-9 h-9 bg-white dark:bg-gray-900"
          />
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filteredUnlinked.map(asset => (
            <div key={asset.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                {asset.thumbnailUrl ? (
                  <ThumbnailImage src={asset.thumbnailUrl} alt={asset.name} fill={false} width={32} height={32} className="rounded object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-800 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate text-gray-900 dark:text-white">{asset.name}</div>
                  <Badge variant="secondary" className="text-[9px]">{asset.format}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-gray-900 gap-1" title="Link NFT in asset detail">
                <Plus className="h-3 w-3" /> Link
              </Button>
            </div>
          ))}
          {filteredUnlinked.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              {search ? 'No matching unlinked assets' : 'All assets are linked'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
