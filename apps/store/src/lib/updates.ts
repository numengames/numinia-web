/**
 * Updates view-model (MISSION-003 P3) — the platform's version timeline.
 * Legacy history (v0.1.0–v0.15.0) is parsed from the extracted portable
 * record; rebuild versions are appended here as first-class data.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type UpdateEntryType = 'NEW' | 'FIX' | 'UPD';

export interface UpdateEntry {
  readonly type: UpdateEntryType;
  readonly text: string;
}

export interface UpdateVersion {
  readonly version: string;
  readonly date: string;
  readonly entries: readonly UpdateEntry[];
}

/** Rebuild-era versions — newest first, prepended to the legacy timeline. */
export const REBUILD_UPDATES: readonly UpdateVersion[] = [
  {
    version: 'v0.17.0',
    date: '2026-08-15 11:45',
    entries: [
      {
        type: 'NEW',
        text: 'Three pillars: La Ciudad (the Numinia narrative), Assets hub, and L.A.P.',
      },
      { type: 'NEW', text: 'The Archive: every public asset in 5 locales with search and filters' },
      { type: 'NEW', text: 'Gallery: the avatars of the city, collection by collection' },
      { type: 'NEW', text: 'Finder: three-pane collection explorer with batch download' },
      { type: 'NEW', text: '3D Inspector: local GLB/VRM preview + metadata, fully in-browser' },
      { type: 'NEW', text: 'Resources: the 22 original docs pages rebuilt (en/ja)' },
      { type: 'NEW', text: 'Updates timeline + legal draft pages; version linked in the footer' },
      { type: 'NEW', text: 'Site chrome: header, footer, and a no-JS language selector' },
      { type: 'UPD', text: 'SEO: sitemap, robots.txt, canonical, hreflang, meta/OG on every page' },
      { type: 'UPD', text: 'Link-integrity gate: 8,404 internal links checked on every build' },
    ],
  },
  {
    version: 'v0.16.0',
    date: '2026-08-14 21:00',
    entries: [
      {
        type: 'NEW',
        text: 'Full platform rebuild: Astro + Turborepo monorepo (code razed, design preserved)',
      },
      {
        type: 'NEW',
        text: 'Domain model regenerated from the seminal corpus (guilds, ranks, seals, assets)',
      },
      {
        type: 'UPD',
        text: 'Quality floor: 100% domain coverage, mutation testing, WCAG gate, bundle budgets',
      },
      { type: 'UPD', text: 'Hermetic builds from committed catalog snapshots (File Over App)' },
    ],
  },
];

/**
 * Newest version of a timeline; the sentinel keeps an empty table from
 * crashing module load so data regressions fail in tests, not at import.
 */
export function newestVersion(updates: readonly UpdateVersion[]): string {
  const first = updates[0];
  return first ? first.version : 'v0.0.0';
}

/** The version the site footer advertises — always the newest timeline entry. */
export const CURRENT_VERSION: string = newestVersion(REBUILD_UPDATES);

export type RoadmapStatus = 'planned' | 'research';

export interface RoadmapItem {
  readonly item: string;
  readonly status: RoadmapStatus;
}

// Tolerates prettier's column padding in the markdown table.
const ROADMAP_ROW = /^\| (.+?) *\| *(planned|research) *\|$/;

/** Parse the "Incoming roadmap" table rows from the extracted record. */
export function parseRoadmap(markdown: string): readonly RoadmapItem[] {
  const items: RoadmapItem[] = [];
  for (const line of markdown.split('\n')) {
    const row = ROADMAP_ROW.exec(line);
    if (row) {
      items.push({ item: row[1] as string, status: row[2] as RoadmapStatus });
    }
  }
  return items;
}

async function readRecord(): Promise<string> {
  return readFile(
    join(process.cwd(), '..', '..', 'docs', 'reference', 'legacy-changelog.md'),
    'utf8',
  );
}

/** The legacy "Incoming" roadmap, as displayed by the original LAP/updates page. */
export async function loadRoadmap(): Promise<readonly RoadmapItem[]> {
  return parseRoadmap(await readRecord());
}

const VERSION_HEADING = /^## (v\d+\.\d+\.\d+) — (.+)$/;
const ENTRY_LINE = /^- (NEW|FIX|UPD) — (.+)$/;

/** Parse the extracted legacy changelog markdown into structured versions. */
export function parseLegacyChangelog(markdown: string): readonly UpdateVersion[] {
  const versions: { version: string; date: string; entries: UpdateEntry[] }[] = [];
  for (const line of markdown.split('\n')) {
    const heading = VERSION_HEADING.exec(line);
    if (heading) {
      versions.push({ version: heading[1] as string, date: heading[2] as string, entries: [] });
      continue;
    }
    const entry = ENTRY_LINE.exec(line);
    if (entry && versions.length > 0) {
      versions[versions.length - 1]!.entries.push({
        type: entry[1] as UpdateEntryType,
        text: entry[2] as string,
      });
    }
  }
  return versions;
}

/** Full timeline, newest first: rebuild versions then the legacy record. */
export async function loadUpdates(): Promise<readonly UpdateVersion[]> {
  return [...REBUILD_UPDATES, ...parseLegacyChangelog(await readRecord())];
}
