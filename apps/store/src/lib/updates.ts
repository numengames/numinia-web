/**
 * Updates view-model (MISSION-003 P3) — the platform's version timeline.
 * Legacy history (v0.1.0–v0.15.0) is parsed from the extracted portable
 * record; rebuild versions are appended here as first-class data.
 */

// Committed record: imported, not read from disk (runtime-portable).
import legacyChangelog from '../../../../docs/reference/legacy-changelog.md?raw';

type UpdateEntryType = 'NEW' | 'FIX' | 'UPD';

interface UpdateEntry {
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
    version: 'v0.29.0',
    date: '2026-08-16 01:00',
    entries: [
      {
        type: 'NEW',
        text: 'The character sheet exports to PDF: the print dialog hands you the file, clean sheet only',
      },
      {
        type: 'NEW',
        text: 'Prestige and Prisma probes on the sheet, like the old citizen view',
      },
    ],
  },
  {
    version: 'v0.28.0',
    date: '2026-08-16 00:30',
    entries: [
      {
        type: 'NEW',
        text: 'Portals of Numinia: the city map with its 14 open worlds around the Agora Plaza, from the domain model',
      },
      {
        type: 'NEW',
        text: 'Portal constants join the domain: 13 district worlds + the hub, five locales, 100% covered',
      },
      {
        type: 'UPD',
        text: 'The L.A.P. mobile rail reads honestly: per-side fades only where content hides, items snap into place',
      },
    ],
  },
  {
    version: 'v0.27.0',
    date: '2026-08-15 20:30',
    entries: [
      {
        type: 'NEW',
        text: 'The management zone opens for Oracles: the whole archive in one table, sortable and searchable',
      },
      {
        type: 'UPD',
        text: 'The player area now fills the screen, edge to edge, like the tool it is',
      },
      {
        type: 'UPD',
        text: 'One iconography everywhere — the citizenship card speaks the same language as the rest',
      },
    ],
  },
  {
    version: 'v0.26.0',
    date: '2026-08-15 20:15',
    entries: [
      {
        type: 'UPD',
        text: 'The player area looks like one: your citizenship card, the scarab in pixels, seals and prisma at a glance',
      },
      {
        type: 'UPD',
        text: 'The door is always in sight — enter Numinia from any page of the city',
      },
    ],
  },
  {
    version: 'v0.25.0',
    date: '2026-08-15 19:45',
    entries: [
      {
        type: 'NEW',
        text: 'Settings: appearance, language, which panel sections you keep, and what your rank grants',
      },
      {
        type: 'NEW',
        text: 'Enter Numinia from the L.A.P.: Google, email, passkey or your own wallet — never a wall',
      },
      {
        type: 'UPD',
        text: 'Your preferences live in this browser; your sheet lives in your file. Nothing on our servers',
      },
    ],
  },
  {
    version: 'v0.24.0',
    date: '2026-08-15 19:15',
    entries: [
      {
        type: 'NEW',
        text: 'The Manual opens in the Codex: the founding role-playing text, chapter by chapter',
      },
      {
        type: 'NEW',
        text: 'Archive statistics: what exists, where it lives, and how much of it is kept twice',
      },
      {
        type: 'UPD',
        text: 'Verified on Chromium and Firefox at phone, tablet and desktop — and readable with JavaScript off',
      },
    ],
  },
  {
    version: 'v0.23.0',
    date: '2026-08-15 18:45',
    entries: [
      {
        type: 'UPD',
        text: 'The L.A.P. sidebar folds to an icon rail — every section wears its Phosphor glyph',
      },
    ],
  },
  {
    version: 'v0.22.0',
    date: '2026-08-15 18:15',
    entries: [
      {
        type: 'NEW',
        text: 'The L.A.P. becomes a platform: sidebar, character sheet, codex — open to every Nomad',
      },
      {
        type: 'NEW',
        text: 'Your character sheet is a file you own: edit it, export it as Markdown, bring it back',
      },
      {
        type: 'NEW',
        text: 'The Codex: every species, guild, faction, district, archetype and humor the city records',
      },
      {
        type: 'NEW',
        text: 'Dice at the table: a stat of N rolls N six-sided dice, results in plain sight',
      },
    ],
  },
  {
    version: 'v0.21.0',
    date: '2026-08-15 17:45',
    entries: [
      {
        type: 'UPD',
        text: 'The scarab signs the page: Khepri closes every footer, as the house rule commands',
      },
      {
        type: 'UPD',
        text: 'The city sheds its duplicate wordmark; grids across the site now reveal as you arrive',
      },
    ],
  },
  {
    version: 'v0.20.0',
    date: '2026-08-15 17:00',
    entries: [
      {
        type: 'NEW',
        text: 'The City becomes one chronicle: four chapters in a single scroll, from the Seed to the Game',
      },
      {
        type: 'NEW',
        text: 'The numinia.com canon moves in: its words, its art, its seals — now dressed in Khepri',
      },
      {
        type: 'NEW',
        text: 'A waxing moon marks your reading — finish the chronicle and it turns full',
      },
      {
        type: 'UPD',
        text: 'Old city subpages now lead to their chapters; the merge plan for numinia.com is written',
      },
    ],
  },
  {
    version: 'v0.19.0',
    date: '2026-08-15 16:30',
    entries: [
      {
        type: 'NEW',
        text: 'The platform wears Khepri: the Numen Games design system, in Diurno and Nocturno',
      },
      {
        type: 'NEW',
        text: 'Mode toggle (sun/moon), language menu, Phosphor iconography, the typing headline',
      },
      {
        type: 'UPD',
        text: 'Every surface redressed: ink for what acts, amber for what labels, Mono for what measures',
      },
      {
        type: 'UPD',
        text: 'The binary separator now speaks — decode it and find the promise of the house',
      },
    ],
  },
  {
    version: 'v0.18.0',
    date: '2026-08-15 14:30',
    entries: [
      {
        type: 'NEW',
        text: 'Progressive identity spike: enter with Google, an email code, a passkey, or your own wallet (MISSION-002 Step 0)',
      },
      {
        type: 'NEW',
        text: 'Sessions are Numinia-issued: the vendor only proves the address; the keys and the trust stay ours',
      },
      {
        type: 'NEW',
        text: 'Guided login: a live 1-2-3 progress bar walks each method, reacting to what you choose',
      },
      {
        type: 'NEW',
        text: '"Digital ownership, not digital rental" — the data-dignity line debuts at the login (MISSION-005 seed)',
      },
    ],
  },
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

type RoadmapStatus = 'planned' | 'research';

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
  return legacyChangelog;
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
