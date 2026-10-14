/**
 * The assets room's GitHub doors (v0.89.0): every address leaves through
 * one encoding helper, points at the data repo's real files, and nothing a
 * catalog says can bend it into another page or another repo.
 */

import { describe, expect, it } from 'vitest';
import {
  addAssetHref,
  CATALOG_PATHS,
  CONTENT_DIRS,
  DATA_REPO,
  editAssetHref,
  githubHref,
  isEditableCategory,
} from '../asset-edit';
import { ASSET_CATEGORIES } from '../data';

const REPO = 'https://github.com/PabloFMM/numinia-digital-goods-data';

describe('githubHref — the one door to GitHub', () => {
  it('builds owner/repo/action/branch/path', () => {
    expect(githubHref(DATA_REPO, 'edit', 'data/images/numinia-images.json')).toBe(
      `${REPO}/edit/main/data/images/numinia-images.json`,
    );
  });

  it('encodes every segment, so a name cannot escape its place', () => {
    const href = githubHref(
      { owner: 'a b', name: 'r?x', branch: 'feat#1' },
      'upload',
      'content/mis imágenes/«x»&y',
    );
    expect(href).toBe(
      'https://github.com/a%20b/r%3Fx/upload/feat%231/content/mis%20im%C3%A1genes/%C2%ABx%C2%BB%26y',
    );
    expect(new URL(href).host).toBe('github.com');
  });

  it('adds a query through URLSearchParams, and none when it is empty', () => {
    const href = githubHref(DATA_REPO, 'upload', 'content/models', {
      message: 'Añadir «x» & y',
    });
    expect(new URL(href).searchParams.get('message')).toBe('Añadir «x» & y');
    expect(githubHref(DATA_REPO, 'upload', 'content/models', {})).toBe(
      `${REPO}/upload/main/content/models`,
    );
  });

  it('refuses a path that climbs or has empty segments, and an empty repo', () => {
    expect(() => githubHref(DATA_REPO, 'edit', '../secrets')).toThrow(/refused/);
    expect(() => githubHref(DATA_REPO, 'edit', 'data/./x.json')).toThrow(/refused/);
    expect(() => githubHref(DATA_REPO, 'edit', 'data//x.json')).toThrow(/refused/);
    expect(() => githubHref(DATA_REPO, 'edit', '')).toThrow(/refused/);
    expect(() => githubHref({ ...DATA_REPO, owner: '' }, 'edit', 'x.json')).toThrow(/refused/);
  });
});

describe('the room’s doors', () => {
  it('«Editar» opens each kind’s catalog in GitHub’s editor', () => {
    expect(editAssetHref('models')).toBe(`${REPO}/edit/main/data/assets/numinia-assets.json`);
    expect(editAssetHref('images')).toBe(`${REPO}/edit/main/data/images/numinia-images.json`);
  });

  it('«Añadir» opens GitHub’s upload page in the kind’s content folder', () => {
    expect(addAssetHref('avatars')).toBe(`${REPO}/upload/main/content/avatars`);
    expect(addAssetHref('worlds', { owner: 'o', name: 'n', branch: 'b' })).toBe(
      'https://github.com/o/n/upload/b/content/worlds',
    );
  });

  it('knows a catalog and a folder for every kind the archive reads', () => {
    for (const category of ASSET_CATEGORIES) {
      expect(CATALOG_PATHS[category]).toMatch(/^data\/[a-z]+\/numinia-[a-z]+\.json$/);
      expect(CONTENT_DIRS[category]).toBe(`content/${category}`);
      expect(editAssetHref(category)).toContain('/edit/main/data/');
    }
  });

  it('tells a kind the repo keeps from anything else the endpoint might send', () => {
    expect(isEditableCategory('video')).toBe(true);
    expect(isEditableCategory('3dprint')).toBe(false);
    expect(isEditableCategory('toString')).toBe(false);
  });
});
