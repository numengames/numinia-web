import { describe, it, expect } from 'vitest';
import {
  generateAssetId,
  formatCanonical,
  extractUUID,
  isNuminiaId,
  createAssetMetadata,
} from '@/lib/asset-id';

describe('generateAssetId', () => {
  it('returns ndg- prefixed UUID v7', () => {
    const id = generateAssetId();
    expect(id).toMatch(/^ndg-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produces different IDs on sequential calls', async () => {
    const id1 = generateAssetId();
    await new Promise(r => setTimeout(r, 2));
    const id2 = generateAssetId();
    expect(id1).not.toBe(id2);
  });

  it('IDs are chronologically sortable', async () => {
    const id1 = generateAssetId();
    await new Promise(r => setTimeout(r, 5));
    const id2 = generateAssetId();
    // UUID v7 sorts chronologically by string comparison
    expect(id1 < id2).toBe(true);
  });

  it('generates monotonically within same ms', () => {
    const ids = Array.from({ length: 100 }, () => generateAssetId());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });
});

describe('extractUUID', () => {
  it('strips ndg- prefix', () => {
    const uuid = '019078e5-5a4c-7b00-8000-1a2b3c4d5e6f';
    expect(extractUUID(`ndg-${uuid}`)).toBe(uuid);
  });

  it('returns input unchanged for non-ndg IDs', () => {
    expect(extractUUID('starter-avatar-01')).toBe('starter-avatar-01');
    expect(extractUUID('some-old-id')).toBe('some-old-id');
  });
});

describe('formatCanonical', () => {
  it('builds canonical format', () => {
    const id = 'ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f';
    const canonical = formatCanonical(id, 'VRM', '0.1.0');
    expect(canonical).toBe('ndg:vrm:019078e5-5a4c-7b00-8000-1a2b3c4d5e6f:v0.1.0');
  });

  it('lowercases type', () => {
    const id = 'ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f';
    expect(formatCanonical(id, 'GLB', '1.0.0')).toContain(':glb:');
  });
});

describe('isNuminiaId', () => {
  it('returns true for valid ndg UUID v7 IDs', () => {
    const id = generateAssetId();
    expect(isNuminiaId(id)).toBe(true);
  });

  it('returns false for old-format IDs', () => {
    expect(isNuminiaId('starter-avatar-01')).toBe(false);
    expect(isNuminiaId('ndg-vrm-avatar-arla-mncdhz3l')).toBe(false);
    expect(isNuminiaId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isNuminiaId('')).toBe(false);
  });
});

describe('createAssetMetadata', () => {
  it('creates a complete metadata object', () => {
    const id = generateAssetId();
    const meta = createAssetMetadata(
      id,
      'Crystal Sword',
      'glb',
      'A crystal sword',
      'https://example.com/sword.glb',
      'numinia-assets',
    );

    expect(meta.id).toBe(id);
    expect(meta.name).toBe('Crystal Sword');
    expect(meta.type).toBe('glb');
    expect(meta.version).toBe('0.1.0');
    expect(meta.status).toBe('active');
    expect(meta.license).toBe('CC0');
    expect(meta.canonical).toContain('ndg:glb:');
    expect(meta.canonical).toContain(':v0.1.0');
    expect(meta.previous_version).toBeNull();
    expect(meta.is_public).toBe(true);
    expect(meta.is_draft).toBe(false);
  });

  it('has NFT fields defaulted to unminted', () => {
    const meta = createAssetMetadata(generateAssetId(), 'Test', 'vrm', '', '', '');
    const nft = meta.nft as Record<string, unknown>;
    expect(nft.mint_status).toBe('unminted');
    expect(nft.chain_id).toBeNull();
    expect(nft.contract).toBeNull();
    expect(nft.token_id).toBeNull();
  });

  it('has storage fields', () => {
    const meta = createAssetMetadata(
      generateAssetId(), 'Test', 'vrm', '',
      'https://raw.githubusercontent.com/test/file.vrm', '',
    );
    const storage = meta.storage as Record<string, unknown>;
    expect(storage.github_raw).toBe('https://raw.githubusercontent.com/test/file.vrm');
    expect(storage.ipfs_cid).toBeNull();
    expect(storage.arweave_tx).toBeNull();
  });
});
