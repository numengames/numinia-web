/**
 * Normalizes and resolves asset URLs from GitHub JSON (models, thumbnails, GLB/VRM).
 * - Converts github.com/blob/... links to raw.githubusercontent.com file URLs
 * - Resolves repo-relative paths used in some datasets
 * - Applies Arweave filename→gateway mapping only for legacy open-source-3D-assets URLs,
 *   so newer datasets (e.g. cc0-models-Polygonal-Mind) are not overwritten by wrong txids
 */

import { getArweaveTxId } from '@/lib/arweaveMapping';
import { getArweaveUrl } from '@/lib/arweave';

const DEFAULT_POLYGON_RAW_BASE =
  process.env.NEXT_PUBLIC_POLYGON_MODELS_RAW_BASE ||
  'https://raw.githubusercontent.com/ToxSam/cc0-models-Polygonal-Mind/main';

const OPEN_SOURCE_RAW_BASE =
  process.env.NEXT_PUBLIC_OPEN_SOURCE_3D_ASSETS_RAW_BASE ||
  'https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main';

/**
 * Convert https://github.com/{owner}/{repo}/blob/{branch}/path/to/file → raw.githubusercontent.com equivalent
 */
export function normalizeGitHubBlobUrlToRaw(url: string): string {
  if (!url || !url.includes('github.com')) return url;

  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return url;

    const parts = u.pathname.split('/').filter(Boolean);
    const blobIdx = parts.indexOf('blob');
    if (blobIdx >= 2 && parts.length >= blobIdx + 3) {
      const owner = parts[0];
      const repo = parts[1];
      const branch = parts[blobIdx + 1];
      const filePath = parts.slice(blobIdx + 2).join('/');
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    }
  } catch {
    return url;
  }
  return url;
}

function resolveRelativePathUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;

  const path = t.replace(/^\/+/, '').replace(/\\/g, '/');
  if (path.startsWith('projects/')) {
    return `${DEFAULT_POLYGON_RAW_BASE}/${path}`;
  }
  if (path.startsWith('data/') || path.startsWith('assets/')) {
    return `${OPEN_SOURCE_RAW_BASE}/${path}`;
  }
  return t;
}

/**
 * Legacy Arweave mapping is keyed by filename only; only apply it for URLs that belong to
 * the open-source-3D-assets dataset or non-HTTP legacy entries, never for other GitHub repos or CDNs.
 */
export function shouldUseArweaveMappingForUrl(url: string | undefined | null): boolean {
  if (!url || !String(url).trim()) return false;
  const lower = String(url).toLowerCase().trim();

  if (lower.includes('arweave.net')) return false;
  if (lower.includes('cc0-models-polygonal-mind')) return false;
  if (lower.includes('assets.numinia.store')) return false;
  if (lower.startsWith('ipfs://') || lower.includes('dweb.link')) return false;

  if (lower.includes('raw.githubusercontent.com')) {
    return lower.includes('/toxsam/open-source-3d-assets/');
  }

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return false;
  }

  return true;
}

export function resolveAvatarAssetUrl(
  url: string | null | undefined,
  type: 'model' | 'thumbnail'
): string | null {
  if (url == null || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('voxel://')) return trimmed;

  let resolved = resolveRelativePathUrl(trimmed);
  resolved = normalizeGitHubBlobUrlToRaw(resolved);

  if (!shouldUseArweaveMappingForUrl(resolved)) {
    return resolved;
  }

  const bareFilename = resolved.split('/').pop() || resolved;
  const txId = getArweaveTxId(bareFilename, type);
  if (txId) {
    return getArweaveUrl(txId);
  }
  return resolved;
}

export function resolveAvatarFieldsFromRaw(avatar: {
  thumbnail_url?: string | null;
  model_file_url?: string | null;
}): { thumbnailUrl: string | null; modelFileUrl: string | null } {
  return {
    thumbnailUrl: resolveAvatarAssetUrl(avatar.thumbnail_url ?? null, 'thumbnail'),
    modelFileUrl: resolveAvatarAssetUrl(avatar.model_file_url ?? null, 'model'),
  };
}

/** Resolve string URLs in metadata.alternateModels (VRM/FBX/voxel variants) */
export function resolveAlternateModelsMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return metadata || {};
  const alt = metadata.alternateModels;
  if (!alt || typeof alt !== 'object' || Array.isArray(alt)) return metadata;

  const out: Record<string, string> = { ...(alt as Record<string, string>) };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === 'string' && v.trim() && !v.startsWith('voxel://')) {
      out[key] = resolveAvatarAssetUrl(v, 'model') || v;
    }
  }
  return { ...metadata, alternateModels: out };
}
