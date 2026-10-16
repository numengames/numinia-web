import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import catalogs from '../../../fixtures/catalogs.json';
import baked from '../../generated/local-thumbs.json';
import { PROFILE_AVATARS, isProfileAvatar } from '../profile-avatars';

const publicFile = (path: string): URL => new URL(`../../../public${path}`, import.meta.url);

interface RawAsset {
  readonly id: string;
  readonly name: string;
  readonly is_public?: boolean;
  readonly is_draft?: boolean;
}

describe('the avatars a person may show beside their name', () => {
  it('are the Bazar’s public avatars that have a baked thumbnail, in the catalogue’s order', () => {
    const avatars = (catalogs as unknown as { avatars: RawAsset[] }).avatars;
    const expected = avatars
      .filter((asset) => asset.is_public === true && asset.is_draft !== true)
      .filter((asset) => (baked as string[]).includes(asset.id))
      .map((asset) => asset.id);
    expect(expected.length).toBeGreaterThanOrEqual(2);
    expect(PROFILE_AVATARS.map((avatar) => avatar.id)).toEqual(expected);
  });

  it('carry the catalogue’s name and the 1x thumbnail, each one on disk', () => {
    expect(PROFILE_AVATARS.find((avatar) => avatar.id === 'avatar-arla-mncdhz3l')).toEqual({
      id: 'avatar-arla-mncdhz3l',
      name: 'Avatar Arla',
      face: '/thumbs/1x/avatar-arla-mncdhz3l.webp',
    });
    for (const avatar of PROFILE_AVATARS) {
      expect(avatar.face).toBe(`/thumbs/1x/${avatar.id}.webp`);
      expect(existsSync(publicFile(avatar.face)), avatar.face).toBe(true);
      expect(avatar.name.trim()).not.toBe('');
    }
  });

  it('are the only ids a person may choose: no other good, nothing unbaked, nothing made up', () => {
    for (const avatar of PROFILE_AVATARS) expect(isProfileAvatar(avatar.id)).toBe(true);
    // A good of another kind is baked too, but it is not an avatar.
    expect((baked as string[]).includes('starter-chair-01')).toBe(true);
    expect(isProfileAvatar('starter-chair-01')).toBe(false);
    for (const id of ['', 'avatar-arla', 'AVATAR-ARLA-MNCDHZ3L', '../avatar-arla-mncdhz3l']) {
      expect(isProfileAvatar(id), id).toBe(false);
    }
  });
});
