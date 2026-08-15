/**
 * Updates view-model (MISSION-003 P3) — the platform's version timeline.
 * Legacy history (v0.1.0–v0.15.0) is parsed from the extracted portable
 * record; rebuild versions are appended here as first-class data.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type UpdateEntryType = 'NEW' | 'FIX' | 'IMP';

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
    date: '2026-08-15',
    entries: [
      { type: 'NEW', text: 'The Archive: every public asset in 5 locales with search and filters' },
      { type: 'NEW', text: 'Gallery: the avatars of the city, collection by collection' },
      { type: 'NEW', text: 'Finder: three-pane collection explorer with batch download' },
      { type: 'NEW', text: 'Site chrome: header, footer, and a no-JS language selector' },
      { type: 'IMP', text: 'SEO: sitemap, robots.txt, canonical and hreflang on every page' },
    ],
  },
  {
    version: 'v0.16.0',
    date: '2026-08-14',
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
        type: 'IMP',
        text: 'Quality floor: 100% domain coverage, mutation testing, WCAG gate, bundle budgets',
      },
      { type: 'IMP', text: 'Hermetic builds from committed catalog snapshots (File Over App)' },
    ],
  },
];

const VERSION_HEADING = /^## (v\d+\.\d+\.\d+) — (.+)$/;
const ENTRY_LINE = /^- (NEW|FIX|IMP) — (.+)$/;

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
  const markdown = await readFile(
    join(process.cwd(), '..', '..', 'docs', 'reference', 'legacy-changelog.md'),
    'utf8',
  );
  return [...REBUILD_UPDATES, ...parseLegacyChangelog(markdown)];
}
