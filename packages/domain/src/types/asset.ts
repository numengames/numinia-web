/**
 * Assets — seven-format digital goods (ADR-003) and their storage layers.
 *
 * Phase 0 mirrors the REAL data-repo JSON shape (snake_case records written by
 * the legacy platform). Schema migration to richer i18n metadata is Phase 1.
 */

export const ASSET_FORMATS = ['glb', 'vrm', 'hyp', 'mp3', 'mp4', 'png', 'jpg'] as const;
export type AssetFormat = (typeof ASSET_FORMATS)[number];

/** Resolution priority: permanence first, then CDN, then fallbacks. */
export const STORAGE_LAYERS = ['arweave', 'r2', 'ipfs', 'github'] as const;
export type StorageLayer = (typeof STORAGE_LAYERS)[number];

export interface AssetStorage {
  readonly arweaveTx: string | null;
  readonly r2Url: string | null;
  readonly ipfsCid: string | null;
  readonly githubRawUrl: string | null;
}

export interface Asset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly format: AssetFormat;
  readonly license: string;
  readonly projectId: string;
  readonly modelFileUrl: string;
  readonly thumbnailUrl: string | null;
  readonly storage: AssetStorage;
  readonly tags: readonly string[];
  readonly isPublic: boolean;
  readonly isDraft: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
