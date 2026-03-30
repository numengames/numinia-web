import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from '@/lib/hooks/useFavorites';

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.count).toBe(0);
    expect(result.current.isFavorite('any-id')).toBe(false);
  });

  it('toggles a favorite on', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite('asset-1');
    });

    expect(result.current.isFavorite('asset-1')).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it('toggles a favorite off', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite('asset-1');
    });
    act(() => {
      result.current.toggleFavorite('asset-1');
    });

    expect(result.current.isFavorite('asset-1')).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('handles multiple favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite('a');
      result.current.toggleFavorite('b');
      result.current.toggleFavorite('c');
    });

    expect(result.current.count).toBe(3);
    expect(result.current.isFavorite('a')).toBe(true);
    expect(result.current.isFavorite('b')).toBe(true);
    expect(result.current.isFavorite('c')).toBe(true);
    expect(result.current.isFavorite('d')).toBe(false);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite('persist-me');
    });

    const stored = JSON.parse(localStorage.getItem('numinia-favorites') || '[]');
    expect(stored).toContain('persist-me');
  });

  it('loads from localStorage on mount', () => {
    localStorage.setItem('numinia-favorites', JSON.stringify(['pre-existing']));

    const { result } = renderHook(() => useFavorites());

    expect(result.current.isFavorite('pre-existing')).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('numinia-favorites', 'not-json!!!');

    const { result } = renderHook(() => useFavorites());

    expect(result.current.count).toBe(0);
  });
});
