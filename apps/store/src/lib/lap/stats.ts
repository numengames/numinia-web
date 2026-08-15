/**
 * Public archive statistics (MISSION-009) — honest numbers from the real
 * catalog: counts, formats, storage layers, redundancy. No sizes: the data
 * repo doesn't record them yet, and we don't invent KPIs.
 */

import type { CatalogedAsset } from '../data';

export interface ArchiveStats {
  readonly total: number;
  readonly projects: number;
  readonly byFormat: ReadonlyArray<{ format: string; count: number }>;
  readonly layers: Readonly<Record<'r2' | 'ipfs' | 'arweave' | 'github', number>>;
  readonly redundancy: { readonly redundant: number; readonly single: number };
}

export function computeArchiveStats(entries: readonly CatalogedAsset[]): ArchiveStats {
  const formats = new Map<string, number>();
  const projects = new Set<string>();
  const layers = { r2: 0, ipfs: 0, arweave: 0, github: 0 };
  let redundant = 0;

  for (const { asset } of entries) {
    formats.set(asset.format, (formats.get(asset.format) ?? 0) + 1);
    projects.add(asset.projectId);
    const present = [
      asset.storage.r2Url && 'r2',
      asset.storage.ipfsCid && 'ipfs',
      asset.storage.arweaveTx && 'arweave',
      asset.storage.githubRawUrl && 'github',
    ].filter(Boolean) as Array<keyof typeof layers>;
    for (const layer of present) layers[layer] += 1;
    if (present.length >= 2) redundant += 1;
  }

  return {
    total: entries.length,
    projects: projects.size,
    byFormat: [...formats.entries()]
      .map(([format, count]) => ({ format, count }))
      .sort((a, b) => b.count - a.count || a.format.localeCompare(b.format)),
    layers,
    redundancy: { redundant, single: entries.length - redundant },
  };
}
