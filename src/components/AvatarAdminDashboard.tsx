"use client";

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import AdminTableView from '@/components/admin/AdminTableView';
import { AssetDetailModal } from '@/components/admin/AssetDetailModal';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Avatar {
  id: string;
  name: string;
  project: string;
  description: string;
  createdAt: string;
  thumbnailUrl: string | null;
  modelFileUrl: string | null;
  polygonCount: number;
  format: string;
  materialCount: number;
  isPublic: boolean;
  isDraft: boolean;
  // New schema fields (may be absent on legacy assets)
  storage?: { r2?: string; ipfs_cid?: string; arweave_tx?: string; github_raw?: string };
  status?: string;
  version?: string;
  file_size_bytes?: number;
}

export default function AvatarAdminDashboard() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Avatar | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('admin-view-mode') as 'gallery' | 'table') || 'table';
    }
    return 'table';
  });
  // Toast-style status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = useCallback((text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const markBusy = useCallback((id: string) => {
    setBusyIds(prev => new Set(prev).add(id));
  }, []);

  const unmarkBusy = useCallback((id: string) => {
    setBusyIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const fetchAvatars = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/assets', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch avatars: ${response.statusText}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.avatars)) {
        setAvatars(data.avatars);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch avatars');
      setAvatars([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const handleDelete = async (avatarId: string) => {
    if (!confirm('Are you sure you want to delete this asset? This cannot be undone.')) return;

    markBusy(avatarId);
    try {
      const response = await fetch(`/api/assets/${avatarId}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(errorData.error || 'Failed to delete');
      }

      setAvatars(prev => prev.filter(a => a.id !== avatarId));
      showStatus('Asset deleted', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showStatus(err instanceof Error ? err.message : 'Failed to delete', 'error');
    } finally {
      unmarkBusy(avatarId);
    }
  };

  const toggleVisibility = async (avatarId: string) => {
    markBusy(avatarId);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${avatarId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update' }));
        throw new Error(errorData.error || 'Failed to update visibility');
      }

      setAvatars(prev =>
        prev.map(a => a.id === avatarId ? { ...a, isPublic: !a.isPublic } : a)
      );
      showStatus('Visibility updated', 'success');
    } catch (err) {
      console.error('Visibility error:', err);
      showStatus(err instanceof Error ? err.message : 'Failed to update visibility', 'error');
    } finally {
      unmarkBusy(avatarId);
    }
  };

  const saveAsset = async (avatarId: string, updates: Record<string, unknown>) => {
    markBusy(avatarId);
    try {
      const response = await fetch(`/api/assets/${avatarId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to save');
      setAvatars(prev =>
        prev.map(a => a.id === avatarId ? { ...a, ...updates } as Avatar : a)
      );
      // Update selected asset too
      setSelectedAsset(prev =>
        prev && prev.id === avatarId ? { ...prev, ...updates } as Avatar : prev
      );
      showStatus('Saved', 'success');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      unmarkBusy(avatarId);
    }
  };

  const startEditing = (avatar: Avatar) => {
    setEditingId(avatar.id);
    setEditValue(avatar.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveName = async (avatarId: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    markBusy(avatarId);
    try {
      const response = await fetch(`/api/assets/${avatarId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename');
      }

      setAvatars(prev =>
        prev.map(a => a.id === avatarId ? { ...a, name: trimmed } : a)
      );
      setEditingId(null);
      showStatus(`Renamed to "${trimmed}"`, 'success');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to rename', 'error');
    } finally {
      unmarkBusy(avatarId);
    }
  };

  // Get unique formats for filter buttons
  const formats = Array.from(new Set(avatars.map(a => a.format?.toUpperCase()).filter(Boolean))).sort();

  const filteredAvatars = avatars.filter(avatar => {
    const matchesSearch = avatar.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = !formatFilter || avatar.format?.toUpperCase() === formatFilter;
    return matchesSearch && matchesFormat;
  });

  return (
    <div className="min-h-screen bg-cream relative">
      <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>

        {/* Status toast */}
        {statusMessage && (
          <div className={`px-4 py-3 rounded text-sm font-medium transition-all ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-20 bg-cream/95 dark:bg-cream-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-8 text-sm bg-white dark:bg-gray-900 border-gray-200"
            />

            {/* Separator */}
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Type filters */}
            <Button variant={formatFilter === null ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setFormatFilter(null)}>
              All ({avatars.length})
            </Button>
            {formats.map(fmt => {
              const count = avatars.filter(a => a.format?.toUpperCase() === fmt).length;
              return (
                <Button key={fmt} variant={formatFilter === fmt ? 'default' : 'outline'} size="sm" className="h-7 text-xs"
                  onClick={() => setFormatFilter(formatFilter === fmt ? null : fmt)}>
                  {fmt} ({count})
                </Button>
              );
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Count */}
            <span className="text-xs text-gray-400">{filteredAvatars.length} assets</span>

            {/* View toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <button
                onClick={() => { setViewMode('gallery'); localStorage.setItem('admin-view-mode', 'gallery'); }}
                className={`p-1 transition-colors ${viewMode === 'gallery' ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-gray-700'}`}
                title="Gallery view"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button
                onClick={() => { setViewMode('table'); localStorage.setItem('admin-view-mode', 'table'); }}
                className={`p-1 transition-colors ${viewMode === 'table' ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-gray-700'}`}
                title="Table view"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Asset content */}
        <div>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading assets...</span>
              </div>
            ) : viewMode === 'table' ? (
              <AdminTableView
                avatars={filteredAvatars}
                busyIds={busyIds}
                onToggleVisibility={toggleVisibility}
                onDelete={handleDelete}
                onSelectAsset={setSelectedAsset}
              />
            ) : filteredAvatars.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchQuery ? 'No assets found matching your search.' : 'No assets available.'}
              </div>
            ) : (
              /* Mini-card grid — compact gallery view */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredAvatars.map(avatar => {
                  const isBusy = busyIds.has(avatar.id);
                  return (
                    <div
                      key={avatar.id}
                      onClick={() => setSelectedAsset(avatar)}
                      className={`group cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all ${isBusy ? 'opacity-50' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                        {avatar.thumbnailUrl ? (
                          <img src={avatar.thumbnailUrl} alt={avatar.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                            <Badge variant="secondary" className="text-[10px]">{avatar.format}</Badge>
                          </div>
                        )}
                        {/* Storage badge overlay */}
                        {avatar.storage?.r2 && (
                          <Badge variant="secondary" className="absolute top-1.5 right-1.5 bg-orange-100/90 text-orange-700 text-[8px] px-1" title="R2 CDN">R2</Badge>
                        )}
                        {!avatar.isPublic && (
                          <Badge variant="secondary" className="absolute top-1.5 left-1.5 bg-yellow-100/90 text-yellow-800 text-[8px] px-1">Hidden</Badge>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{avatar.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">{avatar.format}</Badge>
                          {avatar.file_size_bytes && (
                            <span className="text-[9px] text-gray-400">{(avatar.file_size_bytes / 1024 / 1024).toFixed(1)}MB</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
      </div>

      {/* Floating detail panel */}
      {selectedAsset && (
        <AssetDetailModal
          avatar={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onSave={saveAsset}
          onDelete={(id: string) => { handleDelete(id); setSelectedAsset(null); }}
          onToggleVisibility={toggleVisibility}
        />
      )}
    </div>
  );
}
