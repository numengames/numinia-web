/**
 * Numinia Digital Goods — Asset ID System
 * Specification v1.0 — 2026-03-30
 *
 * Format: ndg-{uuid-v7}
 * Example: ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f
 *
 * Based on RFC 9562 (UUID v7):
 * - 122 bits of entropy — collision impossible at any scale including IoT
 * - Timestamp-sortable — first 48 bits are Unix ms
 * - Monotonic within same ms — uuidv7 library auto-increments
 * - Native DB support — Postgres, MySQL 8+, MongoDB
 * - Universal library support — JS, Python, Rust, Go, C#, Java
 *
 * The ndg- prefix identifies provenance (Numinia Digital Goods protocol).
 * Like ERC is from Ethereum but used everywhere.
 *
 * See ID_SYSTEM.md for the full specification with decision rationale.
 */

import { uuidv7 } from 'uuidv7';

/**
 * Generate a new Numinia asset ID.
 * Returns `ndg-{uuid-v7}` — globally unique, timestamp-sortable.
 * Can be generated offline, without coordination, at any scale.
 */
export function generateAssetId(): string {
  return `ndg-${uuidv7()}`;
}

/**
 * Build the canonical form of an asset ID.
 * Used in NFT tokenURIs, IPFS metadata, and formal exports.
 * Format: ndg:{type}:{uuid}:v{version}
 *
 * Example: ndg:vrm:019078e5-5a4c-7b00-8000-1a2b3c4d5e6f:v0.1.0
 */
export function formatCanonical(id: string, type: string, version: string): string {
  const uuid = extractUUID(id);
  return `ndg:${type.toLowerCase()}:${uuid}:v${version}`;
}

/**
 * Extract the raw UUID from an ndg ID.
 * ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f → 019078e5-5a4c-7b00-8000-1a2b3c4d5e6f
 * Returns the input unchanged if it's not an ndg ID.
 */
export function extractUUID(id: string): string {
  if (id.startsWith('ndg-')) {
    return id.slice(4);
  }
  return id;
}

/**
 * Check whether an ID follows the ndg UUID v7 format.
 * Validates: ndg- prefix + valid UUID structure (8-4-4-4-12 hex).
 */
export function isNuminiaId(id: string): boolean {
  return /^ndg-[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
}

/**
 * Create the default metadata fields for a new asset.
 * Used by upload routes to build the initial JSON entry.
 */
/** MIME type mapping for asset formats */
const FORMAT_TO_MIME: Record<string, string> = {
  vrm: 'model/gltf-binary',
  glb: 'model/gltf-binary',
  hyp: 'application/octet-stream',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  png: 'image/png',
  jpg: 'image/jpeg',
};

export function createAssetMetadata(
  id: string,
  name: string,
  type: string,
  description: string,
  modelFileUrl: string,
  projectId: string,
  options?: {
    fileSizeBytes?: number;
    fileHash?: string;
  },
): Record<string, unknown> {
  const now = new Date().toISOString();
  const typeLower = type.toLowerCase();
  return {
    id,
    canonical: formatCanonical(id, typeLower, '0.1.0'),
    name,
    type: typeLower,
    version: '0.1.0',
    previous_version: null,
    status: 'active',
    status_reason: null,
    license: 'CC0',
    creator: null,
    description,
    model_file_url: modelFileUrl,
    thumbnail_url: null,
    format: type.toUpperCase(),
    content_type: FORMAT_TO_MIME[typeLower] ?? 'application/octet-stream',
    file_size_bytes: options?.fileSizeBytes ?? null,
    file_hash: options?.fileHash ?? null,
    project_id: projectId,
    nft: {
      type: 'standard',
      mint_status: 'unminted',
      chain_id: null,
      contract: null,
      token_id: null,
      owner: null,
      mint_tx: null,
    },
    storage: {
      r2: modelFileUrl.includes('r2.') ? modelFileUrl : null,
      ipfs_cid: null,
      arweave_tx: null,
      github_raw: modelFileUrl.includes('raw.githubusercontent') ? modelFileUrl : null,
    },
    is_public: true,
    is_draft: false,
    created_at: now,
    updated_at: now,
    metadata: {},
  };
}
