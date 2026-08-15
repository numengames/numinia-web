/**
 * Inspector view-model (MISSION-003 P5) — pure helpers for the local-file
 * 3D inspector. Files never leave the browser; the island only needs these
 * to classify inputs and shape the metadata readout.
 */

export type InspectorKind = 'glb' | 'vrm';

/** Classify a filename by extension; null means "not inspectable here". */
export function detectKind(filename: string): InspectorKind | null {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  const extension = match?.[1]?.toLowerCase();
  if (extension === 'glb' || extension === 'gltf') return 'glb';
  if (extension === 'vrm') return 'vrm';
  return null;
}

/** Human-readable size: 1536 → "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 'B';
  for (const next of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  return `${value.toFixed(1)} ${unit}`;
}

export interface ModelStats {
  readonly meshes: number;
  readonly vertices: number;
  readonly triangles: number;
  readonly materials: number;
  readonly textures: number;
  readonly animations: number;
  readonly vrmName: string | null;
  readonly vrmAuthors: string | null;
}

export interface StatsRow {
  readonly label: string;
  readonly value: string;
}

/** Flatten stats into display rows, omitting VRM fields when absent. */
export function statsRows(
  stats: ModelStats,
  labels: Readonly<Record<keyof ModelStats, string>>,
): readonly StatsRow[] {
  const rows: StatsRow[] = [
    { label: labels.meshes, value: String(stats.meshes) },
    { label: labels.vertices, value: stats.vertices.toLocaleString('en-US') },
    { label: labels.triangles, value: stats.triangles.toLocaleString('en-US') },
    { label: labels.materials, value: String(stats.materials) },
    { label: labels.textures, value: String(stats.textures) },
    { label: labels.animations, value: String(stats.animations) },
  ];
  if (stats.vrmName !== null) rows.push({ label: labels.vrmName, value: stats.vrmName });
  if (stats.vrmAuthors !== null) rows.push({ label: labels.vrmAuthors, value: stats.vrmAuthors });
  return rows;
}
