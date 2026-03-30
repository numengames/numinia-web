import { describe, it, expect } from 'vitest';
import {
  generateAssetId,
  parseAssetId,
  isNuminiaId,
  slugify,
  extensionToTypeCode,
} from '@/lib/asset-id';

describe('slugify', () => {
  it('converts to lowercase with hyphens', () => {
    expect(slugify('Avatar Arla')).toBe('avatar-arla');
  });

  it('removes file extension', () => {
    expect(slugify('Crystal Sword.glb')).toBe('crystal-sword');
  });

  it('handles special characters', () => {
    expect(slugify('Model (v2) [final]!')).toBe('model-v2-final');
  });

  it('truncates at maxLen', () => {
    const long = 'a-very-long-name-that-exceeds-the-maximum-length-limit';
    expect(slugify(long, 16).length).toBeLessThanOrEqual(16);
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('---test---')).toBe('test');
  });
});

describe('extensionToTypeCode', () => {
  it('maps vrm to vrm', () => expect(extensionToTypeCode('vrm')).toBe('vrm'));
  it('maps glb to glb', () => expect(extensionToTypeCode('glb')).toBe('glb'));
  it('maps gltf to glb', () => expect(extensionToTypeCode('gltf')).toBe('glb'));
  it('maps hyp to hyp', () => expect(extensionToTypeCode('hyp')).toBe('hyp'));
  it('maps mp3 to mp3', () => expect(extensionToTypeCode('mp3')).toBe('mp3'));
  it('maps ogg to ogg', () => expect(extensionToTypeCode('ogg')).toBe('ogg'));
  it('maps mp4 to mp4', () => expect(extensionToTypeCode('mp4')).toBe('mp4'));
  it('maps webm to webm', () => expect(extensionToTypeCode('webm')).toBe('webm'));
  it('maps png to img', () => expect(extensionToTypeCode('png')).toBe('img'));
  it('maps jpg to img', () => expect(extensionToTypeCode('jpg')).toBe('img'));
  it('defaults unknown to glb', () => expect(extensionToTypeCode('xyz')).toBe('glb'));
  it('is case insensitive', () => expect(extensionToTypeCode('VRM')).toBe('vrm'));
});

describe('generateAssetId', () => {
  it('follows ndg-{type}-{slug}-{timestamp} format', () => {
    const id = generateAssetId('Avatar Arla', 'vrm');
    expect(id).toMatch(/^ndg-vrm-avatar-arla-[a-z0-9]+$/);
  });

  it('uses correct type code for each extension', () => {
    expect(generateAssetId('Test', 'glb')).toMatch(/^ndg-glb-/);
    expect(generateAssetId('Test', 'hyp')).toMatch(/^ndg-hyp-/);
    expect(generateAssetId('Test', 'mp3')).toMatch(/^ndg-mp3-/);
  });

  it('handles filenames with extensions', () => {
    const id = generateAssetId('Sword.glb', 'glb');
    expect(id).toMatch(/^ndg-glb-sword-[a-z0-9]+$/);
  });

  it('produces different IDs for sequential calls', async () => {
    const id1 = generateAssetId('Test', 'vrm');
    await new Promise(r => setTimeout(r, 2));
    const id2 = generateAssetId('Test', 'vrm');
    expect(id1).not.toBe(id2);
  });
});

describe('parseAssetId', () => {
  it('parses a valid ndg ID', () => {
    const result = parseAssetId('ndg-vrm-avatar-arla-mncdhz3l');
    expect(result).toEqual({
      namespace: 'ndg',
      type: 'vrm',
      slug: 'avatar-arla',
      timestamp: 'mncdhz3l',
    });
  });

  it('returns null for non-ndg IDs', () => {
    expect(parseAssetId('starter-avatar-01')).toBeNull();
    expect(parseAssetId('550e8400-e29b-41d4-a716-446655440000')).toBeNull();
    expect(parseAssetId('')).toBeNull();
  });

  it('parses IDs with multi-segment slugs', () => {
    const result = parseAssetId('ndg-glb-crystal-chaos-sword-m3n8kz3');
    expect(result?.slug).toBe('crystal-chaos-sword');
    expect(result?.type).toBe('glb');
  });
});

describe('isNuminiaId', () => {
  it('returns true for valid ndg IDs', () => {
    expect(isNuminiaId('ndg-vrm-avatar-arla-mncdhz3l')).toBe(true);
    expect(isNuminiaId('ndg-glb-sword-m3n8kz3')).toBe(true);
  });

  it('returns false for legacy IDs', () => {
    expect(isNuminiaId('starter-avatar-01')).toBe(false);
    expect(isNuminiaId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isNuminiaId('avatar-arla-mncdhz3l')).toBe(false);
  });
});
