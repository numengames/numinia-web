/**
 * Asset catalog validation — the data-repo JSON is external data and MUST be
 * validated with Zod; the build fails loudly on mismatch (MISSION-000 spike).
 *
 * The schema mirrors the CURRENT real shape (snake_case legacy records) and
 * normalizes into the domain `Asset`. Schema migration is Phase 1.
 */

import { z } from 'zod';
import { ASSET_FORMATS, type Asset, type AssetFormat } from '../types/asset.js';

const formatSchema = z
  .string()
  .transform((value) => value.toLowerCase())
  .pipe(z.enum(ASSET_FORMATS));

/**
 * Display facts (a card's data line): read when the record states them in
 * the expected shape, null otherwise. They never fail the build — a
 * catalogue that writes them differently only loses the line, not the page.
 * `.optional()` comes first: in zod 4 an absent key reaches the transform
 * only when the input side is optional, else it fails as "nonoptional".
 */
const optionalText = z
  .unknown()
  .optional()
  .transform((value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null));
const optionalBytes = z
  .unknown()
  .optional()
  .transform((value) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null,
  );

const assetRecordSchema = z
  .looseObject({
    id: z.string().min(1),
    name: z.string().min(1),
    type: formatSchema,
    description: z.string().default(''),
    license: z.string().default('CC0'),
    project_id: z.string().default(''),
    model_file_url: z.string().default(''),
    thumbnail_url: z.string().nullable().default(null),
    tags: z.array(z.string()).default([]),
    is_public: z.boolean().default(true),
    is_draft: z.boolean().default(false),
    created_at: z.string().default(''),
    updated_at: z.string().default(''),
    version: optionalText,
    file_size_bytes: optionalBytes,
    storage: z
      .looseObject({
        arweave_tx: z.string().nullable().default(null),
        r2: z.string().nullable().default(null),
        ipfs_cid: z.string().nullable().default(null),
        github_raw: z.string().nullable().default(null),
      })
      .default({ arweave_tx: null, r2: null, ipfs_cid: null, github_raw: null }),
  })
  .transform((record): Asset => ({
    id: record.id,
    name: record.name,
    description: record.description,
    format: record.type as AssetFormat,
    license: record.license,
    projectId: record.project_id,
    modelFileUrl: record.model_file_url,
    thumbnailUrl: record.thumbnail_url,
    tags: record.tags,
    isPublic: record.is_public,
    isDraft: record.is_draft,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    version: record.version,
    sizeBytes: record.file_size_bytes,
    storage: {
      arweaveTx: record.storage.arweave_tx,
      r2Url: record.storage.r2,
      ipfsCid: record.storage.ipfs_cid,
      githubRawUrl: record.storage.github_raw,
    },
  }));

export function parseAssetRecord(input: unknown): Asset {
  return assetRecordSchema.parse(input);
}

export function parseAssetCatalog(input: unknown): readonly Asset[] {
  const arrayResult = z.array(z.unknown()).safeParse(input);
  if (!arrayResult.success) {
    throw new Error('Asset catalog must be a JSON array');
  }
  return arrayResult.data.map((record, index) => {
    const result = assetRecordSchema.safeParse(record);
    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Asset catalog invalid at index ${index} — ${detail}`);
    }
    return result.data;
  });
}
