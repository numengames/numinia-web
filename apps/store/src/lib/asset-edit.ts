/**
 * Editing the archive from the Oracle's assets room (v0.89.0, «aquí lo que
 * debería es poder editar los assets, eliminarlos o añadir»): keyless, the
 * way v0.85.0 edits a community (`editHref` in communities.ts). The data
 * repo is public files in git, so every change is a change to a file made
 * in GitHub's own editor, which asks, commits or opens the pull request.
 * The site holds no key and writes nothing.
 *
 * The repo keeps ONE catalog file per kind (data/<kind>/numinia-<kind>.json)
 * and the binaries under content/<kind>/. So:
 *   - «Editar» opens the kind's catalog in GitHub's editor (find the id);
 *   - «Eliminar» opens the same editor: the entry is removed there. GitHub's
 *     delete page would delete the WHOLE catalog of that kind, so it is
 *     never offered;
 *   - «Añadir» opens GitHub's upload page in the kind's content folder; the
 *     new file's entry then goes into the catalog with «Editar».
 *
 * Every address is built by ONE helper, `githubHref`, which encodes each
 * path segment and the query: no data reaches an href unencoded (CodeQL).
 */

import type { AssetCategory } from './data';

/** The public data repo the archive is read from. */
export interface DataRepo {
  readonly owner: string;
  readonly name: string;
  readonly branch: string;
}

export const DATA_REPO: DataRepo = {
  owner: 'PabloFMM',
  name: 'numinia-digital-goods-data',
  branch: 'main',
};

/** The catalog file of each kind, in the data repo. */
export const CATALOG_PATHS: Readonly<Record<AssetCategory, string>> = {
  models: 'data/assets/numinia-assets.json',
  avatars: 'data/avatars/numinia-avatars.json',
  worlds: 'data/worlds/numinia-worlds.json',
  audio: 'data/audio/numinia-audio.json',
  video: 'data/video/numinia-video.json',
  images: 'data/images/numinia-images.json',
  // 3dprint deliberately absent: the catalog is 404 (data-doctor report).
};

/** Where each kind's binaries live, in the data repo. */
export const CONTENT_DIRS: Readonly<Record<AssetCategory, string>> = {
  models: 'content/models',
  avatars: 'content/avatars',
  worlds: 'content/worlds',
  audio: 'content/audio',
  video: 'content/video',
  images: 'content/images',
};

/** GitHub's pages on a file or a folder. */
type GithubAction = 'edit' | 'upload';

/**
 * The one door to GitHub: `https://github.com/<owner>/<repo>/<action>/<branch>/<path>`,
 * each segment percent-encoded, the query (if any) through URLSearchParams.
 * A path that climbs (`..`), an empty segment or an empty owner is refused.
 */
export function githubHref(
  repo: DataRepo,
  action: GithubAction,
  path: string,
  query?: Readonly<Record<string, string>>,
): string {
  const segments = path.split('/');
  const parts = [repo.owner, repo.name, action, repo.branch, ...segments];
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`githubHref: refused path «${path}»`);
  }
  const href = `https://github.com/${parts.map(encodeURIComponent).join('/')}`;
  const search = query === undefined ? '' : new URLSearchParams(query).toString();
  return search === '' ? href : `${href}?${search}`;
}

/** Whether a kind (as the endpoint sends it) is one the repo keeps a catalog for. */
export function isEditableCategory(category: string): category is AssetCategory {
  return Object.hasOwn(CATALOG_PATHS, category);
}

/** «Editar» (and «Eliminar»): GitHub's editor on the kind's catalog. */
export function editAssetHref(category: AssetCategory, repo: DataRepo = DATA_REPO): string {
  return githubHref(repo, 'edit', CATALOG_PATHS[category]);
}

/** «Añadir»: GitHub's upload page in the kind's content folder. */
export function addAssetHref(category: AssetCategory, repo: DataRepo = DATA_REPO): string {
  return githubHref(repo, 'upload', CONTENT_DIRS[category]);
}
