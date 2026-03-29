import { describe, it, expect } from 'vitest';
import {
  normalizeIPFSUrl,
  isIPFSUrl,
  isGitHubRawUrl,
  getFileExtension,
  getModelFilenameForFormat,
  type AvatarMetadata,
} from '@/lib/download-utils';

// ---------------------------------------------------------------------------
// normalizeIPFSUrl
// ---------------------------------------------------------------------------
describe('normalizeIPFSUrl', () => {
  it('converts ipfs:// protocol to dweb.link gateway', () => {
    expect(normalizeIPFSUrl('ipfs://QmHash123')).toBe('https://dweb.link/ipfs/QmHash123');
  });

  it('strips redundant ipfs/ prefix after protocol', () => {
    expect(normalizeIPFSUrl('ipfs://ipfs/QmHash123')).toBe('https://dweb.link/ipfs/QmHash123');
  });

  it('leaves https:// URLs untouched', () => {
    const url = 'https://arweave.net/some-tx-id';
    expect(normalizeIPFSUrl(url)).toBe(url);
  });

  it('leaves GitHub raw URLs untouched', () => {
    const url = 'https://raw.githubusercontent.com/org/repo/main/file.vrm';
    expect(normalizeIPFSUrl(url)).toBe(url);
  });
});

// ---------------------------------------------------------------------------
// isIPFSUrl
// ---------------------------------------------------------------------------
describe('isIPFSUrl', () => {
  it('detects ipfs:// protocol', () => {
    expect(isIPFSUrl('ipfs://QmHash')).toBe(true);
  });

  it('detects dweb.link gateway URLs', () => {
    expect(isIPFSUrl('https://dweb.link/ipfs/QmHash')).toBe(true);
  });

  it('detects URLs containing "ipfs"', () => {
    expect(isIPFSUrl('https://ipfs.io/ipfs/QmHash')).toBe(true);
  });

  it('returns false for Arweave URLs', () => {
    expect(isIPFSUrl('https://arweave.net/tx-id')).toBe(false);
  });

  it('returns false for GitHub raw URLs', () => {
    expect(isIPFSUrl('https://raw.githubusercontent.com/org/repo/main/model.vrm')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isGitHubRawUrl
// ---------------------------------------------------------------------------
describe('isGitHubRawUrl', () => {
  it('detects raw.githubusercontent.com URLs', () => {
    expect(isGitHubRawUrl('https://raw.githubusercontent.com/org/repo/main/model.vrm')).toBe(true);
  });

  it('detects github.com/raw/ URLs', () => {
    expect(isGitHubRawUrl('https://github.com/org/repo/raw/main/model.vrm')).toBe(true);
  });

  it('returns false for Arweave URLs', () => {
    expect(isGitHubRawUrl('https://arweave.net/tx-id')).toBe(false);
  });

  it('returns false for IPFS gateway URLs', () => {
    expect(isGitHubRawUrl('https://dweb.link/ipfs/QmHash')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getFileExtension
// ---------------------------------------------------------------------------
describe('getFileExtension', () => {
  it('returns .fbx for fbx format', () => {
    expect(getFileExtension('fbx')).toBe('.fbx');
  });

  it('returns .fbx for voxel-fbx format', () => {
    expect(getFileExtension('voxel-fbx')).toBe('.fbx');
  });

  it('returns .fbx for voxel_fbx format', () => {
    expect(getFileExtension('voxel_fbx')).toBe('.fbx');
  });

  it('returns .glb for glb format', () => {
    expect(getFileExtension('glb')).toBe('.glb');
  });

  it('returns .vrm for vrm format', () => {
    expect(getFileExtension('vrm')).toBe('.vrm');
  });

  it('returns .vrm as default for unknown formats', () => {
    expect(getFileExtension('voxel')).toBe('.vrm');
    expect(getFileExtension('unknown')).toBe('.vrm');
    expect(getFileExtension('')).toBe('.vrm');
  });
});

// ---------------------------------------------------------------------------
// getModelFilenameForFormat
// ---------------------------------------------------------------------------
describe('getModelFilenameForFormat', () => {
  const metadata: AvatarMetadata = {
    alternateModels: {
      fbx: 'model.fbx',
      glb: 'model.glb',
      voxel_vrm: 'model_voxel.vrm',
      voxel_fbx: 'model_voxel.fbx',
    },
  };

  it('returns null when format is null', () => {
    expect(getModelFilenameForFormat(metadata, null)).toBeNull();
  });

  it('returns null when alternateModels is missing', () => {
    expect(getModelFilenameForFormat({}, 'fbx')).toBeNull();
  });

  it('returns the fbx filename for "fbx" format', () => {
    expect(getModelFilenameForFormat(metadata, 'fbx')).toBe('model.fbx');
  });

  it('returns the glb filename for "glb" format', () => {
    expect(getModelFilenameForFormat(metadata, 'glb')).toBe('model.glb');
  });

  it('returns voxel_vrm filename for "voxel" format', () => {
    expect(getModelFilenameForFormat(metadata, 'voxel')).toBe('model_voxel.vrm');
  });

  it('returns voxel_fbx filename for "voxel-fbx" format', () => {
    expect(getModelFilenameForFormat(metadata, 'voxel-fbx')).toBe('model_voxel.fbx');
  });

  it('returns voxel_fbx filename for "voxel_fbx" format', () => {
    expect(getModelFilenameForFormat(metadata, 'voxel_fbx')).toBe('model_voxel.fbx');
  });

  it('falls back to voxel-fbx key when voxel_fbx is missing', () => {
    const metaWithDash: AvatarMetadata = {
      alternateModels: { 'voxel-fbx': 'model_voxel_dash.fbx' },
    };
    expect(getModelFilenameForFormat(metaWithDash, 'voxel-fbx')).toBe('model_voxel_dash.fbx');
  });

  it('returns null for a format not present in alternateModels', () => {
    const minimalMeta: AvatarMetadata = { alternateModels: {} };
    expect(getModelFilenameForFormat(minimalMeta, 'fbx')).toBeNull();
  });

  it('returns null for an unrecognised format string', () => {
    expect(getModelFilenameForFormat(metadata, 'unknown-format')).toBeNull();
  });
});
