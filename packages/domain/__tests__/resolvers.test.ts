import { describe, expect, it } from 'vitest';
import {
  classifyStorageUrl,
  resolveAssetUrl,
  toArweaveUrl,
  toIpfsGatewayUrl,
} from '../src/resolvers/asset-url.js';
import {
  getBranch,
  getGuild,
  getHouse,
  listHousesOfGuild,
  resolveGuildPath,
} from '../src/resolvers/guild-resolver.js';

describe('resolveAssetUrl (Arweave → R2 → IPFS → GitHub)', () => {
  const full = {
    arweaveTx: 'tx123',
    r2Url: 'https://pub-abc.r2.dev/content/models/a.glb',
    ipfsCid: 'QmHash',
    githubRawUrl: 'https://raw.githubusercontent.com/o/r/main/a.glb',
  };

  it('prefers Arweave when present', () => {
    expect(resolveAssetUrl(full)).toBe('https://arweave.net/tx123');
  });

  it('falls back layer by layer', () => {
    expect(resolveAssetUrl({ ...full, arweaveTx: null })).toBe(full.r2Url);
    expect(resolveAssetUrl({ ...full, arweaveTx: null, r2Url: null })).toBe(
      'https://dweb.link/ipfs/QmHash',
    );
    expect(resolveAssetUrl({ ...full, arweaveTx: null, r2Url: null, ipfsCid: null })).toBe(
      full.githubRawUrl,
    );
  });

  it('returns null when no layer is available', () => {
    expect(
      resolveAssetUrl({ arweaveTx: null, r2Url: null, ipfsCid: null, githubRawUrl: null }),
    ).toBeNull();
  });

  it('builds gateway URLs explicitly', () => {
    expect(toArweaveUrl('abc')).toBe('https://arweave.net/abc');
    expect(toIpfsGatewayUrl('Qm1')).toBe('https://dweb.link/ipfs/Qm1');
  });
});

describe('classifyStorageUrl (parsed hostnames, never substrings — audit B6)', () => {
  it('classifies by exact host or registered suffix', () => {
    expect(classifyStorageUrl('https://arweave.net/tx')).toBe('arweave');
    expect(classifyStorageUrl('https://pub-abc.r2.dev/x.glb')).toBe('r2');
    expect(classifyStorageUrl('https://bucket.r2.cloudflarestorage.com/x')).toBe('r2');
    expect(classifyStorageUrl('https://dweb.link/ipfs/Qm')).toBe('ipfs');
    expect(classifyStorageUrl('https://ipfs.io/ipfs/Qm')).toBe('ipfs');
    expect(classifyStorageUrl('https://raw.githubusercontent.com/o/r/m/f')).toBe('github');
  });

  it('is immune to the substring bypasses that fooled the legacy helpers', () => {
    expect(classifyStorageUrl('https://evil.com/?u=arweave.net')).toBeNull();
    expect(classifyStorageUrl('https://arweave.net.evil.com/tx')).toBeNull();
    expect(classifyStorageUrl('https://example.com/ipfs-notes.pdf')).toBeNull();
    expect(classifyStorageUrl('https://myr2.dev.evil.io/x')).toBeNull();
  });

  it('returns null for garbage input instead of throwing', () => {
    expect(classifyStorageUrl('not a url')).toBeNull();
    expect(classifyStorageUrl('')).toBeNull();
  });
});

describe('guild-resolver (superordinate → basic → subordinate)', () => {
  it('resolves guilds, branches and houses by id', () => {
    expect(getGuild('sentinels')?.id).toBe('sentinels');
    expect(getBranch('archangels')?.guildId).toBe('sentinels');
    expect(getHouse('explorers')?.branchId).toBe('archangels');
  });

  it('returns undefined for unknown ids', () => {
    expect(getGuild('unknown' as never)).toBeUndefined();
    expect(getBranch('unknown' as never)).toBeUndefined();
    expect(getHouse('unknown' as never)).toBeUndefined();
  });

  it('resolves a full path from a house id', () => {
    expect(resolveGuildPath('thaumaturges')).toEqual({
      guildId: 'exegetes',
      branchId: 'scholars',
      houseId: 'thaumaturges',
    });
    expect(resolveGuildPath('unknown' as never)).toBeUndefined();
  });

  it('lists the four houses of a guild', () => {
    expect(listHousesOfGuild('alchemists').map((h) => h.id)).toEqual([
      'projectors',
      'aesthetes',
      'architects',
      'automata',
    ]);
  });

  it('lists nothing for an unknown guild', () => {
    expect(listHousesOfGuild('unknown' as never)).toEqual([]);
  });
});
