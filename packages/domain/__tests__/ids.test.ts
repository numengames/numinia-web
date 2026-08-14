import { describe, expect, it } from 'vitest';
import { PHYSICAL_ATTRIBUTES, PSYCHIC_ATTRIBUTES } from '../src/types/attribute.js';
import { POSITION_IDS } from '../src/types/position.js';
import { PERMISSION_GROUPS } from '../src/types/permission.js';
import { ASSET_FORMATS, STORAGE_LAYERS } from '../src/types/asset.js';

describe('glossary id pins (ADR-012 — changing these means changing the glossary first)', () => {
  it('attributes are 4 physical + 4 psychic', () => {
    expect(PHYSICAL_ATTRIBUTES).toEqual(['strength', 'movement', 'size', 'constitution']);
    expect(PSYCHIC_ATTRIBUTES).toEqual(['intelligence', 'wisdom', 'perception', 'charisma']);
  });

  it('the fifteen positions match glossary §S2, in manual order', () => {
    expect(POSITION_IDS).toEqual([
      'guardian-of-the-gates',
      'pythia',
      'ambassador',
      'game-master',
      'legionary',
      'armonaut',
      'whisperer-of-machines',
      'runner-of-the-veil',
      'archivist',
      'hermeneut',
      'mediator-of-the-prism',
      'cartographer-of-the-wind',
      'oneiromancer',
      'anacharchid',
      'ethnarch',
    ]);
  });

  it('permission groups and storage/formats are pinned', () => {
    expect(PERMISSION_GROUPS).toEqual([
      'browse',
      'identity',
      'season',
      'create',
      'admin',
      'oracle',
    ]);
    expect(ASSET_FORMATS).toEqual(['glb', 'vrm', 'hyp', 'mp3', 'mp4', 'png', 'jpg']);
    expect(STORAGE_LAYERS).toEqual(['arweave', 'r2', 'ipfs', 'github']);
  });
});
