/**
 * Asset URL resolution — Arweave → R2 → IPFS → GitHub priority chain.
 * URL classification parses hostnames; substring matching is forbidden here
 * (legacy audit B6: `includes('ipfs')` produced false positives and bypasses).
 */

import type { AssetStorage, StorageLayer } from '../types/asset.js';

const ARWEAVE_GATEWAY = 'https://arweave.net';
const IPFS_GATEWAY = 'https://dweb.link/ipfs';

const HOST_SUFFIXES: readonly { layer: StorageLayer; hosts: readonly string[] }[] = [
  { layer: 'arweave', hosts: ['arweave.net'] },
  { layer: 'r2', hosts: ['r2.dev', 'r2.cloudflarestorage.com'] },
  { layer: 'ipfs', hosts: ['dweb.link', 'ipfs.io'] },
  { layer: 'github', hosts: ['raw.githubusercontent.com'] },
];

function hostMatches(hostname: string, candidate: string): boolean {
  return hostname === candidate || hostname.endsWith(`.${candidate}`);
}

/** Classify a URL by its parsed hostname; null for unknown or unparsable. */
export function classifyStorageUrl(url: string): StorageLayer | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const { layer, hosts } of HOST_SUFFIXES) {
    if (hosts.some((host) => hostMatches(hostname, host))) {
      return layer;
    }
  }
  return null;
}

export function toArweaveUrl(txId: string): string {
  return `${ARWEAVE_GATEWAY}/${txId}`;
}

export function toIpfsGatewayUrl(cid: string): string {
  return `${IPFS_GATEWAY}/${cid}`;
}

/** Resolve the best URL for an asset: permanence first, then CDN, then fallbacks. */
export function resolveAssetUrl(storage: AssetStorage): string | null {
  if (storage.arweaveTx) return toArweaveUrl(storage.arweaveTx);
  if (storage.r2Url) return storage.r2Url;
  if (storage.ipfsCid) return toIpfsGatewayUrl(storage.ipfsCid);
  if (storage.githubRawUrl) return storage.githubRawUrl;
  return null;
}
