'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'numinia-favorites';

function readLocal(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeLocal(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load: localStorage first (instant), then merge from data repo if logged in
  useEffect(() => {
    const local = readLocal();
    setFavorites(local);

    // Try to load from data repo (File Over App)
    fetch('/api/favorites')
      .then(r => r.json())
      .then(data => {
        if (data.favorites && Array.isArray(data.favorites) && data.favorites.length > 0) {
          const merged = new Set([...local, ...data.favorites]);
          setFavorites(merged);
          writeLocal(merged);
        }
      })
      .catch(() => {}); // Not logged in or network error — use local only
  }, []);

  // Debounced sync to data repo (saves after 2s of no changes)
  const syncToRepo = useCallback((ids: Set<string>) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch('/api/favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: [...ids] }),
      }).catch(() => {}); // Best-effort — localStorage is the cache
    }, 2000);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeLocal(next);
      syncToRepo(next);
      return next;
    });
  }, [syncToRepo]);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite, count: favorites.size };
}
