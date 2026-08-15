/**
 * Unit tests for the inspector helpers — file classification, byte
 * formatting, and the stats readout shape.
 */

import { describe, expect, it } from 'vitest';
import { detectKind, formatBytes, statsRows, type ModelStats } from '../inspector';

describe('detectKind', () => {
  it('classifies by extension, case-insensitive', () => {
    expect(detectKind('model.glb')).toBe('glb');
    expect(detectKind('scene.GLTF')).toBe('glb');
    expect(detectKind('avatar.VRM')).toBe('vrm');
  });

  it('rejects everything else', () => {
    for (const name of ['notes.txt', 'archive.zip', 'model.glb.png', 'noextension', '']) {
      expect(detectKind(name)).toBeNull();
    }
  });
});

describe('formatBytes', () => {
  it('scales through units with one decimal', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});

describe('statsRows', () => {
  const labels = {
    meshes: 'Meshes',
    vertices: 'Vertices',
    triangles: 'Triangles',
    materials: 'Materials',
    textures: 'Textures',
    animations: 'Animations',
    vrmName: 'VRM name',
    vrmAuthors: 'VRM authors',
  } as const;

  const base: ModelStats = {
    meshes: 2,
    vertices: 12345,
    triangles: 6789,
    materials: 3,
    textures: 4,
    animations: 1,
    vrmName: null,
    vrmAuthors: null,
  };

  it('renders six rows for plain GLB stats with formatted numbers', () => {
    const rows = statsRows(base, labels);
    expect(rows).toHaveLength(6);
    expect(rows[1]).toEqual({ label: 'Vertices', value: '12,345' });
  });

  it('appends VRM rows only when metadata is present', () => {
    const rows = statsRows({ ...base, vrmName: 'Khepri', vrmAuthors: 'Numen Games' }, labels);
    expect(rows.slice(-2)).toEqual([
      { label: 'VRM name', value: 'Khepri' },
      { label: 'VRM authors', value: 'Numen Games' },
    ]);
  });
});
