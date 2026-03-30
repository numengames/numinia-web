/**
 * Numinia Digital Goods — Asset ID System
 *
 * Format: ndg-{type}-{slug}-{timestamp}
 *
 * - ndg        — namespace (Numinia Digital Goods)
 * - {type}     — asset type code (vrm, glb, hyp, mp3, etc.)
 * - {slug}     — slugified name, max 32 chars
 * - {timestamp} — Date.now() in base36, 8 chars
 *
 * Example: ndg-vrm-avatar-arla-mncdhz3l
 *
 * Properties:
 * - Globally unique (timestamp + slug)
 * - URL-safe (lowercase alphanumeric + hyphens)
 * - Human-readable (slug tells you what it is)
 * - Type-encoded (format without metadata lookup)
 * - Sortable by creation time (base36 preserves order)
 * - Cross-platform (ndg- prefix identifies provenance)
 */

/** Valid asset type codes */
export const ASSET_TYPE_CODES = ['vrm', 'glb', 'hyp', 'mp3', 'ogg', 'mp4', 'webm', 'img'] as const;
export type AssetTypeCode = typeof ASSET_TYPE_CODES[number];

/** Map file extensions to asset type codes */
const EXT_TO_TYPE: Record<string, AssetTypeCode> = {
  vrm: 'vrm',
  glb: 'glb',
  gltf: 'glb',
  hyp: 'hyp',
  mp3: 'mp3',
  ogg: 'ogg',
  mp4: 'mp4',
  webm: 'webm',
  png: 'img',
  jpg: 'img',
  jpeg: 'img',
  webp: 'img',
  gif: 'img',
};

/** Slugify a name: lowercase, alphanumeric + hyphens, max length */
export function slugify(name: string, maxLen = 32): string {
  return name
    .replace(/\.[^.]+$/, '') // remove file extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen);
}

/** Resolve file extension to AssetTypeCode */
export function extensionToTypeCode(ext: string): AssetTypeCode {
  return EXT_TO_TYPE[ext.toLowerCase()] ?? 'glb';
}

/** Generate a unique Numinia asset ID */
export function generateAssetId(name: string, extension: string): string {
  const type = extensionToTypeCode(extension);
  const slug = slugify(name);
  const ts = Date.now().toString(36);
  return `ndg-${type}-${slug}-${ts}`;
}

/** Parse a Numinia asset ID into its components. Returns null for non-ndg IDs. */
export function parseAssetId(id: string): {
  namespace: string;
  type: string;
  slug: string;
  timestamp: string;
} | null {
  const match = id.match(/^ndg-([a-z0-9]+)-(.+)-([a-z0-9]{7,9})$/);
  if (!match) return null;
  return {
    namespace: 'ndg',
    type: match[1],
    slug: match[2],
    timestamp: match[3],
  };
}

/** Check whether an ID follows the ndg format */
export function isNuminiaId(id: string): boolean {
  return /^ndg-[a-z0-9]+-[a-z0-9-]+-[a-z0-9]{7,9}$/.test(id);
}
