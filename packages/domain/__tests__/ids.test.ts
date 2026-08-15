import { describe, expect, it } from 'vitest';
import { PHYSICAL_ATTRIBUTES, PSYCHIC_ATTRIBUTES } from '../src/types/attribute.js';
import { POSITION_IDS } from '../src/types/position.js';
import { PERMISSION_GROUPS } from '../src/types/permission.js';
import { ASSET_FORMATS, STORAGE_LAYERS } from '../src/types/asset.js';
import { DIALECT_IDS, LINGO_IDS, SOCIOLECT_IDS } from '../src/types/linguistic.js';
import {
  AGENT_TYPES,
  MISSION_EFFORTS,
  MISSION_PRIORITIES,
  MISSION_STATUSES,
} from '../src/types/mission.js';
import { REWARD_TRACKS, SEASON_STATUSES } from '../src/types/season.js';
import { ATTACK_TYPES } from '../src/types/equipment.js';

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

  it('linguistic variations match glossary §S4', () => {
    expect(DIALECT_IDS).toEqual(['cybernetic', 'epistolary', 'primordial', 'bizarre', 'prophetic']);
    expect(SOCIOLECT_IDS).toEqual(['erudite', 'histrionic', 'professorial', 'mystic']);
    expect(LINGO_IDS).toEqual(['transmutative', 'mythological', 'pragmatic', 'martial']);
  });

  it('operational enums are pinned (missions, seasons, equipment)', () => {
    expect(AGENT_TYPES).toEqual(['biological', 'digital', 'hybrid']);
    expect(MISSION_PRIORITIES).toEqual(['critical', 'high', 'medium', 'low']);
    expect(MISSION_EFFORTS).toEqual(['xs', 's', 'm', 'l', 'xl']);
    expect(MISSION_STATUSES).toEqual(['backlog', 'in-progress', 'in-review', 'done']);
    expect(SEASON_STATUSES).toEqual(['upcoming', 'active', 'ended']);
    expect(REWARD_TRACKS).toEqual(['free', 'premium']);
    expect(ATTACK_TYPES).toEqual(['light', 'heavy', 'special']);
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
