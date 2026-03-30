import { describe, it, expect } from 'vitest';
import { getContentPath, getFormat } from '@/lib/content-paths';

describe('getContentPath', () => {
  it('maps VRM to avatars', () => {
    const p = getContentPath('VRM');
    expect(p.folder).toBe('content/avatars');
    expect(p.catalogFile).toBe('data/avatars/numinia-avatars.json');
    expect(p.projectId).toBe('numinia-avatars');
  });

  it('maps GLB to models', () => {
    const p = getContentPath('GLB');
    expect(p.folder).toBe('content/models');
    expect(p.projectId).toBe('numinia-assets');
  });

  it('maps HYP to worlds', () => {
    const p = getContentPath('HYP');
    expect(p.folder).toBe('content/worlds');
    expect(p.projectId).toBe('numinia-worlds');
  });

  it('maps audio formats (MP3, OGG)', () => {
    expect(getContentPath('MP3').folder).toBe('content/audio');
    expect(getContentPath('OGG').folder).toBe('content/audio');
    expect(getContentPath('OGG').projectId).toBe('numinia-audio');
  });

  it('maps video formats (MP4, WEBM)', () => {
    expect(getContentPath('MP4').folder).toBe('content/video');
    expect(getContentPath('WEBM').folder).toBe('content/video');
  });

  it('maps image formats (JPG, JPEG, PNG, WEBP)', () => {
    expect(getContentPath('JPG').folder).toBe('content/images');
    expect(getContentPath('JPEG').folder).toBe('content/images');
    expect(getContentPath('PNG').folder).toBe('content/images');
    expect(getContentPath('WEBP').folder).toBe('content/images');
    expect(getContentPath('PNG').projectId).toBe('numinia-images');
  });

  it('is case-insensitive', () => {
    expect(getContentPath('vrm').folder).toBe('content/avatars');
    expect(getContentPath('Glb').folder).toBe('content/models');
    expect(getContentPath('hyp').folder).toBe('content/worlds');
  });

  it('falls back to other for unknown formats', () => {
    const p = getContentPath('ZIP');
    expect(p.folder).toBe('content/other');
    expect(p.projectId).toBe('numinia-assets');
  });
});

describe('getFormat', () => {
  it('extracts format from filename', () => {
    expect(getFormat('model.glb')).toBe('GLB');
    expect(getFormat('avatar.vrm')).toBe('VRM');
    expect(getFormat('world.hyp')).toBe('HYP');
    expect(getFormat('song.mp3')).toBe('MP3');
  });

  it('handles dotted filenames', () => {
    expect(getFormat('my.avatar.v2.vrm')).toBe('VRM');
  });

  it('returns empty uppercase for no extension', () => {
    expect(getFormat('noext')).toBe('NOEXT');
  });
});
