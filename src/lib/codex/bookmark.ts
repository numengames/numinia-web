'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CodexBookmark } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'numinia-codex-bookmark';

export { STORAGE_KEY };

// ---------------------------------------------------------------------------
// Pure functions (localStorage wrappers)
// ---------------------------------------------------------------------------

/** Read the saved bookmark from localStorage, or null if absent / invalid. */
export function readBookmark(): CodexBookmark | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isBookmark(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Persist a bookmark to localStorage. */
export function writeBookmark(bookmark: CodexBookmark): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmark));
  } catch {
    // Storage full or unavailable -- silently ignore.
  }
}

/** Remove the stored bookmark. */
export function clearBookmark(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export interface UseBookmarkReturn {
  bookmark: CodexBookmark | null;
  saveBookmark: (bookmark: CodexBookmark) => void;
  clearBookmark: () => void;
}

/**
 * SSR-safe hook that exposes the current bookmark with save/clear helpers.
 * On mount it reads from localStorage; writes are reflected immediately.
 */
export function useBookmark(): UseBookmarkReturn {
  const [bookmark, setBookmark] = useState<CodexBookmark | null>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setBookmark(readBookmark());
  }, []);

  const save = useCallback((bm: CodexBookmark) => {
    writeBookmark(bm);
    setBookmark(bm);
  }, []);

  const clear = useCallback(() => {
    clearBookmark();
    setBookmark(null);
  }, []);

  return { bookmark, saveBookmark: save, clearBookmark: clear };
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isBookmark(value: unknown): value is CodexBookmark {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.chapterIndex === 'number' &&
    typeof obj.fragmentIndex === 'number' &&
    typeof obj.scrollPosition === 'number' &&
    typeof obj.timestamp === 'number'
  );
}
