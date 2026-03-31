'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ExternalLink, Copy, LogOut, Loader2, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbnailImage } from '@/components/ui/ThumbnailImage';
import { useFavorites } from '@/lib/hooks/useFavorites';

interface UserSession {
  authenticated: boolean;
  address?: string;
  username?: string;
  role: string;
}

interface Asset {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  format: string;
  project: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const { favorites, isFavorite } = useFavorites();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/wallet/session').then(r => r.json()),
      fetch('/api/assets').then(r => r.json()),
    ]).then(([sessionData, assetData]) => {
      if (!sessionData.authenticated) {
        router.push('/en/archive');
        return;
      }
      setSession(sessionData);
      setAssets(assetData.avatars || []);
    }).catch(() => {
      router.push('/en/archive');
    }).finally(() => setLoading(false));
  }, [router]);

  const favoriteAssets = assets.filter(a => isFavorite(a.id));

  const handleSignOut = async () => {
    await fetch('/api/auth/wallet/session', { method: 'DELETE' });
    router.push('/en/archive');
  };

  const copyAddress = () => {
    if (session?.address) {
      navigator.clipboard.writeText(session.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-cream-dark">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session?.authenticated) return null;

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon-khepri.svg" alt="Numinia" className="h-5 w-5" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/en/archive')} className="text-xs">
              Gallery
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-gray-500 hover:text-red-600">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Identity card */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center gap-4">
            {/* Avatar circle */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {session.address ? session.address.slice(2, 4).toUpperCase() : session.username?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {session.username && (
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{session.username}</div>
              )}
              {session.address && (
                <button onClick={copyAddress} className="flex items-center gap-1.5 text-sm font-mono text-gray-500 hover:text-gray-700 transition-colors">
                  {session.address.slice(0, 6)}...{session.address.slice(-4)}
                  {copied ? <span className="text-green-500 text-xs">Copied!</span> : <Copy className="h-3 w-3" />}
                </button>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`text-[10px] ${session.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                  {session.role}
                </Badge>
                {session.address && (
                  <a
                    href={`https://basescan.org/address/${session.address}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    Basescan <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
            <Heart className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{favorites.size}</div>
            <div className="text-xs text-gray-500">Favorites</div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
            <Diamond className="h-5 w-5 mx-auto text-violet-400 mb-1" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
            <div className="text-xs text-gray-500">NFTs Owned</div>
          </div>
        </div>

        {/* Favorites grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
            Favorites ({favoriteAssets.length})
          </h2>
          {favoriteAssets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {favoriteAssets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => router.push(`/en/archive?asset=${asset.id}`)}
                  className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-gray-400 transition-all text-left"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                    {asset.thumbnailUrl ? (
                      <ThumbnailImage src={asset.thumbnailUrl} alt={asset.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Heart className="h-6 w-6 fill-current text-red-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-white dark:bg-gray-900">
                    <div className="text-xs font-medium truncate text-gray-900 dark:text-white">{asset.name}</div>
                    <Badge variant="secondary" className="text-[9px] mt-1">{asset.format}</Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <Heart className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">No favorites yet</p>
              <p className="text-xs text-gray-400 mt-1">Browse the gallery and click hearts to add favorites</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
