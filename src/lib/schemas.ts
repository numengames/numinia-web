/**
 * Zod schemas for validating JSON data from the GitHub data repo.
 *
 * These validate at the API boundary (raw JSON → typed objects).
 * If a field is missing or wrong type, Zod provides a clear error
 * instead of silent undefined propagation through the app.
 *
 * All schemas use .passthrough() to allow extra fields — this means
 * new fields added to the JSON don't break the app until we add them
 * to the schema explicitly.
 */

import { z } from 'zod';

// Allowed hosts for asset URLs
const ALLOWED_URL_HOSTS = [
  'raw.githubusercontent.com',
  'r2.dev',
  'r2.cloudflarestorage.com',
  'arweave.net',
  'ipfs.io',
  'gateway.pinata.cloud',
  'dweb.link',
  'assets.numinia.store',
  'assets.opensourceavatars.com',
];

/** Validate that a URL belongs to an allowed host */
export function isAllowedAssetUrl(url: string): boolean {
  if (!url) return true; // null/empty is fine
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_URL_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// Coerce unknown values to string — handles null, undefined, number gracefully
const str = z.coerce.string();
const optStr = z.string().nullish().transform(v => v ?? undefined);
const optNum = z.number().nullish().transform(v => v ?? undefined);
const bool = z.boolean().default(false);
const isoDate = z.string().default('');

/** Raw user from data repo (snake_case) */
export const RawUserSchema = z.object({
  id: str,
  username: str,
  email: optStr,
  role: str.default('user'),
  created_at: isoDate,
  updated_at: isoDate,
}).passthrough();

/** Raw project from data repo */
export const RawProjectSchema = z.object({
  id: str,
  name: str,
  creator_id: optStr,
  description: optStr,
  is_public: z.boolean().default(true),
  license: z.string().default('CC0'),
  created_at: isoDate,
  updated_at: isoDate,
  asset_data_file: optStr,
}).passthrough();

/** NFT metadata sub-object */
export const NftSchema = z.object({
  type: z.string().default('standard'),
  mint_status: z.string().default('unminted'),
  chain_id: z.string().nullish().default(null),
  contract: z.string().nullish().default(null),
  token_id: z.string().nullish().default(null),
  owner: z.string().nullish().default(null),
  mint_tx: z.string().nullish().default(null),
}).passthrough().nullish();

/** Storage metadata sub-object */
export const StorageSchema = z.object({
  r2: z.string().nullish().default(null),
  ipfs_cid: z.string().nullish().default(null),
  arweave_tx: z.string().nullish().default(null),
  github_raw: z.string().nullish().default(null),
}).passthrough().nullish();

/** Raw avatar/asset from data repo (snake_case) */
export const RawAvatarSchema = z.object({
  id: str,
  name: str,
  project_id: optStr,
  projectId: optStr,
  description: optStr,
  thumbnail_url: z.string().nullish().default(null),
  thumbnailUrl: z.string().nullish().default(null),
  model_file_url: z.string().nullish().default(null),
  modelFileUrl: z.string().nullish().default(null),
  polygon_count: optNum,
  polygonCount: optNum,
  format: z.string().default(''),
  material_count: optNum,
  materialCount: optNum,
  is_public: z.boolean().nullish().default(true),
  isPublic: z.boolean().nullish().default(true),
  is_draft: z.boolean().nullish().default(false),
  isDraft: z.boolean().nullish().default(false),
  created_at: isoDate,
  createdAt: isoDate,
  updated_at: isoDate,
  updatedAt: isoDate,
  metadata: z.record(z.string(), z.unknown()).default({}),
  // v1 schema fields (optional — may not exist on legacy entries)
  canonical: optStr,
  type: optStr,
  version: optStr,
  previous_version: optStr,
  status: z.string().default('active'),
  status_reason: optStr,
  license: z.string().default('CC0'),
  creator: optStr,
  content_type: optStr,
  file_size_bytes: optNum,
  file_hash: optStr,
  nft: NftSchema,
  storage: StorageSchema,
  tags: z.array(z.string()).optional().default([]),
}).passthrough();

/** Raw tag from data repo */
export const RawTagSchema = z.object({
  id: str,
  name: str,
  created_at: isoDate,
  updated_at: isoDate,
}).passthrough();

/** Raw download record */
export const RawDownloadSchema = z.object({
  id: str,
  avatar_id: str,
  user_id: optStr,
  downloaded_at: isoDate,
  ip_address: optStr,
  user_agent: optStr,
  created_at: isoDate,
  updated_at: isoDate,
}).passthrough();

/** Raw avatar-tag association */
export const RawAvatarTagSchema = z.object({
  avatar_id: str,
  tag_id: str,
}).passthrough();

/* ─── Request body schemas (API input validation) ─── */

const ACCEPTED_EXTENSIONS = ['glb', 'vrm', 'hyp', 'mp3', 'ogg', 'mp4', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'stl'];

/** POST /api/admin/presign — request a presigned upload URL */
export const PresignRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(500 * 1024 * 1024, { message: 'File too large (max 500MB)' }),
  name: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
}).refine(
  (d) => {
    const ext = d.fileName.split('.').pop()?.toLowerCase() ?? '';
    return ACCEPTED_EXTENSIONS.includes(ext);
  },
  { message: 'Unsupported format' },
);

/** POST /api/admin/presign/confirm — confirm upload and create metadata */
export const PresignConfirmRequestSchema = z.object({
  assetId: z.string().min(1),
  r2Key: z.string().min(1),
  displayName: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  format: z.string().min(1).max(10),
  fileSize: z.number().int().nonnegative().optional(),
  fileHash: z.string().max(128).optional(),
});

/** PATCH /api/assets/[id]/visibility — update asset fields */
export const AssetUpdateSchema = z.object({
  name: z.string().max(255).transform(v => v.trim()).optional(),
  description: z.string().max(2000).transform(v => v.trim()).optional(),
  creator: z.string().max(255).transform(v => v.trim()).optional(),
  license: z.string().max(50).transform(v => v.trim()).optional(),
  status: z.string().max(20).transform(v => v.trim()).optional(),
  version: z.string().max(20).transform(v => v.trim()).optional(),
  nft: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

/** PUT /api/favorites — save user favorites */
export const FavoritesRequestSchema = z.object({
  favorites: z.array(z.string().min(1).max(100)).max(500),
});

/** PUT /api/characters — save character sheet */
export const CharacterSaveSchema = z.object({
  content: z.string().min(1).max(100_000),
});

/**
 * Safely parse an array of items with a Zod schema.
 * Invalid items are logged and skipped instead of crashing.
 */
export function safeParseArray<T>(
  schema: z.ZodType<T>,
  data: unknown[],
  context: string,
): T[] {
  const results: T[] = [];
  for (let i = 0; i < data.length; i++) {
    const result = schema.safeParse(data[i]);
    if (result.success) {
      results.push(result.data);
    } else {
      console.warn(
        `[${context}] Skipped invalid entry at index ${i}:`,
        result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', '),
      );
    }
  }
  return results;
}
