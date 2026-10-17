/**
 * The Bazaar's view-model (v0.83.0) — the Finder rethought: every public
 * good of the city as one flat, serializable list, resolved at build time so
 * the island ships plain data and no domain resolvers (and no zod).
 *
 * Server side only: it reads the catalogue. The island imports
 * bazaar-view.ts, never this file.
 */

import type { AssetFormat } from '@numinia/domain';
import { downloadUrl, loadArchive } from './archive';
import { isPicture } from './bazaar-view';
import type { AssetCategory } from './data';
import { sizeText } from './goods';
import { previewSrc, thumbSrc, thumbSrcSet } from './thumbs';

export interface BazaarItem {
  readonly id: string;
  readonly name: string;
  /** The catalogue's one line about it; null when it has only the upload tool's stamp. */
  readonly line: string | null;
  readonly format: AssetFormat;
  readonly category: AssetCategory;
  /** The catalogue's collection (its project id); `uncollected` when it has none. */
  readonly collection: string;
  readonly license: string;
  /**
   * The card's picture: the baked local WebP when there is one, the
   * catalogue's thumbnail otherwise, and — for a picture — the picture
   * itself; null keeps the kind's glyph.
   */
  readonly thumbnailUrl: string | null;
  /** The card picture's 1x/2x srcset when it is the baked WebP (v0.89.0); null otherwise. */
  readonly thumbnailSrcSet: string | null;
  /**
   * A picture's baked preview (v0.91.0): the whole picture at 960px a side,
   * what the preview shows instead of a multi-megabyte original; null when
   * none was baked (the preview then shows the file itself).
   */
  readonly previewUrl: string | null;
  /** Best binary URL from the storage chain; null when nothing is reachable. */
  readonly url: string | null;
  /** The file's size in bytes as the catalogue states it; null when it does not. */
  readonly sizeBytes: number | null;
  /** That size in the page's words («63 MB», «196 KB»): said before a heavy model loads. */
  readonly size: string | null;
  /** When the good entered the catalogue (ISO 8601): the «newest first» order. */
  readonly createdAt: string;
}

export const UNCOLLECTED = 'uncollected';

/**
 * The catalogue's own line about a good — but not the upload tool's stamp
 * («GLB asset uploaded via Numinia Admin»), which says nothing about it.
 */
export function lineOf(description: string): string | null {
  const text = description.trim();
  if (text === '' || /uploaded via numinia admin/i.test(text)) return null;
  return text;
}

/**
 * Some goods reached the catalogue with the name of the file they came in
 * («med 1», «med (2)», «cover.png»): the uploader's file name, not a title
 * anybody wrote. These are the three marks of one — a known asset
 * extension, the duplicate marker a download folder adds, and an
 * uncapitalised stub with at most a trailing counter.
 */
const FILE_EXTENSION = /\.(glb|gltf|vrm|hyp|png|jpe?g|webp|mp3|mp4|zip|fbx)$/i;
const COPY_MARKER = /\(\d+\)$/;
const UNCAPITALISED_STUB = /^[a-z][a-z0-9_-]*(?: ?\d+)?$/;

/**
 * A good's title as a page says it, or null when the catalogue holds only
 * the file's own name: nothing beats a file name on a public page.
 */
export function goodTitle(name: string): string | null {
  const title = name.trim().replace(/\s+/g, ' ');
  if (title === '') return null;
  if (FILE_EXTENSION.test(title) || COPY_MARKER.test(title)) return null;
  return UNCAPITALISED_STUB.test(title) ? null : title;
}

/**
 * A good's card picture: its baked 480px WebP when the build has one (a
 * picture's own file is baked too: scripts/build-thumbs.mjs), else the
 * catalogue's thumbnail, else — for a PNG or JPG — the picture itself, so a
 * picture added after the bake still shows; a model without a thumbnail
 * keeps its kind's glyph (null).
 */
export function cardPicture(
  id: string,
  format: AssetFormat,
  thumbnailUrl: string | null,
  url: string | null,
): string | null {
  return thumbSrc(id, thumbnailUrl ?? (isPicture(format) ? url : null));
}

/** Every public good, newest first (the archive's order), its size in the page's words. */
export async function loadBazaarItems(locale: string): Promise<readonly BazaarItem[]> {
  const archive = await loadArchive();
  return archive.map(({ asset, category }) => {
    const url = downloadUrl(asset);
    return {
      id: asset.id,
      name: asset.name,
      line: lineOf(asset.description),
      format: asset.format,
      category,
      collection: asset.projectId || UNCOLLECTED,
      license: asset.license,
      thumbnailUrl: cardPicture(asset.id, asset.format, asset.thumbnailUrl, url),
      thumbnailSrcSet: thumbSrcSet(asset.id),
      previewUrl: previewSrc(asset.id),
      url,
      sizeBytes: asset.sizeBytes,
      size: asset.sizeBytes === null ? null : sizeText(asset.sizeBytes, locale),
      createdAt: asset.createdAt,
    };
  });
}
