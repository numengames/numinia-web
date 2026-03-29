"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Eye, EyeOff, Loader2, Pencil, Check, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
}

export default function AvatarAdminDashboard() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  // Inline editing state: avatarId → current edit value
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

      // Remove from local state immediately (no need to refetch)
      setAvatars(prev => prev.filter(a => a.id !== avatarId));
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
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

      // Toggle in local state immediately
      setAvatars(prev =>
        prev.map(a => a.id === avatarId ? { ...a, isPublic: !a.isPublic } : a)
      );
    } catch (err) {
      console.error('Visibility error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
    } finally {
      unmarkBusy(avatarId);
    }
  };

  const filteredAvatars = avatars.filter(avatar =>
    avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
          <span className="text-sm text-gray-500">{avatars.length} assets</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md border-gray-200"
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="px-6">
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading assets...</span>
              </div>
            ) : filteredAvatars.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchQuery ? 'No assets found matching your search.' : 'No assets available.'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAvatars.map(avatar => {
                  const isBusy = busyIds.has(avatar.id);
                  return (
                    <Card key={avatar.id} className={`overflow-hidden transition-opacity ${isBusy ? 'opacity-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {avatar.thumbnailUrl ? (
                            <img
                              src={avatar.thumbnailUrl}
                              alt={avatar.name}
                              className="w-24 h-24 rounded-lg object-cover bg-gray-100"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                              No image
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div className="flex-1 min-w-0">
                                {editingId === avatar.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') saveName(avatar.id);
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                      className="h-8 text-lg font-medium"
                                      autoFocus
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => saveName(avatar.id)} disabled={isBusy}>
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={cancelEditing}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <h3
                                    className="font-medium text-lg text-gray-900 cursor-pointer hover:text-gray-600"
                                    onClick={() => startEditing(avatar)}
                                    title="Click to rename"
                                  >
                                    {avatar.name} <Pencil className="h-3 w-3 inline text-gray-400" />
                                  </h3>
                                )}
                                <p className="text-gray-500 text-sm">{avatar.description}</p>
                              </div>
                              <div className="flex gap-2 items-start ml-2">
                                {isBusy ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                ) : (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleVisibility(avatar.id)}
                                      title={avatar.isPublic ? 'Hide from gallery' : 'Show in gallery'}
                                    >
                                      {avatar.isPublic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDelete(avatar.id)}
                                      title="Delete asset"
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary">{avatar.format}</Badge>
                              {!avatar.isPublic && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
