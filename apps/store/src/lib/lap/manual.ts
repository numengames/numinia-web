/**
 * The RPG manual, parsed for the Codex reader (MISSION-009). The seminal
 * text has no markdown headings — its structure is typographic: `CAPÍTULO N`
 * lines, `Fragmento N: Título` lines, ALL-CAPS section titles, and prose.
 * The parser preserves every character of the author's text; it only adds
 * structure around it (audit rule: the corpus is immutable).
 */

// The corpus is no longer committed here (Oracle order 2026-08-16: lore left
// the code repository for the private lore repo). Two build-time sources,
// both bundle-embedded (portable to any runtime — Workers have no node:fs):
//   .lore/manual.md      — the REAL corpus, fetched by `npm run lore:fetch`
//                          (gitignored; never re-enters this repo's tree).
//   fixtures/manual/…    — a synthetic skeleton with zero lore, for hermetic
//                          builds; exercises every parser shape.
// DATA_SOURCE=fixture forces the fixture even when the real corpus is present.
const loreFiles = import.meta.glob('../../../.lore/manual.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureFiles = import.meta.glob('../../../fixtures/manual/manual-fixture.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const realManual = Object.values(loreFiles)[0];
const fixtureManual = Object.values(fixtureFiles)[0];
// Direct property read on purpose (see src/lib/env.ts): bundlers replace
// `process.env.DATA_SOURCE`, which keeps this Worker-safe; importing the
// fail-closed env module here would crash unit tests at import time.
const resolvedManual =
  (process.env.DATA_SOURCE === 'fixture' ? undefined : realManual) ?? fixtureManual;
if (resolvedManual === undefined) {
  // Fail closed and loud: the fixture is committed, so this only fires if
  // the repo itself is broken — never silently render an empty Codex.
  throw new Error('Manual source missing: neither .lore/manual.md nor the fixture resolved.');
}
const manualRaw: string = resolvedManual;

interface ManualTableBlock {
  readonly kind: 'table';
  readonly rows: ReadonlyArray<readonly string[]>;
}
type ManualBlock =
  { readonly kind: 'paragraph' | 'quote' | 'subtitle'; readonly text: string } | ManualTableBlock;

interface ManualFragment {
  readonly id: string;
  readonly title: string;
  /** '' for the lead fragment: its prose belongs to the chapter opening. */
  readonly blocks: readonly ManualBlock[];
}

export interface ManualChapter {
  readonly id: string;
  readonly number: number | null;
  readonly title: string;
  readonly fragments: readonly ManualFragment[];
}

const CHAPTER_RE = /^CAPÍTULO\s+(\d+)\s*$/;
const FRAGMENT_RE = /^Fragmento\s+(\d+)\s*:\s*(.+)$/;
const INTRO_RE = /^INTRODUCCIÓN\s*$/;

/** Short ALL-CAPS lines are section subtitles inside the prose. */
function isCapsTitle(line: string): boolean {
  if (line.length < 3 || line.length > 120) return false;
  if (/^[«"•–-]/.test(line)) return false;
  return line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line) && line.split(/\s+/).length >= 2;
}

function classify(line: string): 'quote' | 'subtitle' | 'paragraph' {
  if (line.startsWith('«')) return 'quote';
  if (isCapsTitle(line)) return 'subtitle';
  return 'paragraph';
}

export function parseManual(raw: string): readonly ManualChapter[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const chapters: Array<{
    id: string;
    number: number | null;
    title: string;
    fragments: Array<{ id: string; title: string; blocks: ManualBlock[] }>;
  }> = [];

  const current = (): (typeof chapters)[number] | undefined => chapters[chapters.length - 1];

  const slug = (title: string, index: number): string =>
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || `fragmento-${index}`;

  const openFragment = (title: string): void => {
    const chapter = current();
    if (!chapter) return;
    const index = chapter.fragments.length;
    chapter.fragments.push({
      // The lead fragment carries no title of its own: repeating the chapter
      // title as a fragment name reads like a rendering bug.
      id: index === 0 ? 'apertura' : slug(title, index),
      title: index === 0 ? '' : title,
      blocks: [],
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trim();
    if (line === '') continue;

    if (INTRO_RE.test(line)) {
      const title = (lines[index + 1] ?? '').trim();
      chapters.push({ id: 'introduccion', number: null, title, fragments: [] });
      openFragment(title);
      index += 1;
      continue;
    }
    const chapterMatch = CHAPTER_RE.exec(line);
    if (chapterMatch) {
      const number = Number(chapterMatch[1]);
      const title = (lines[index + 1] ?? '').trim();
      chapters.push({ id: `capitulo-${number}`, number, title, fragments: [] });
      openFragment(title);
      index += 1;
      continue;
    }
    const fragmentMatch = FRAGMENT_RE.exec(line);
    if (fragmentMatch && current()) {
      openFragment(fragmentMatch[2]!.trim());
      continue;
    }
    const chapter = current();
    if (!chapter) continue; // preamble before any structure: nothing in practice
    const fragment = chapter.fragments[chapter.fragments.length - 1];
    if (!fragment) continue;
    // Tab-separated lines are TABLES in the corpus: flattening them would
    // destroy which cell belongs to which column.
    if (line.includes('\t')) {
      const cells = line.split('\t').map((cell) => cell.trim());
      const last = fragment.blocks[fragment.blocks.length - 1];
      if (last && last.kind === 'table') {
        (last.rows as string[][]).push(cells);
      } else {
        fragment.blocks.push({ kind: 'table', rows: [cells] });
      }
      continue;
    }
    fragment.blocks.push({ kind: classify(line), text: line });
  }

  // Empty lead fragments (a chapter whose first prose starts at Fragmento 1).
  for (const chapter of chapters) {
    chapter.fragments = chapter.fragments.filter(
      (fragment, index) => fragment.blocks.length > 0 || index > 0,
    );
  }
  return chapters;
}

let cache: readonly ManualChapter[] | null = null;

/** The manual, parsed once per build from the immutable seminal corpus. */
export async function loadManual(): Promise<readonly ManualChapter[]> {
  cache ??= parseManual(manualRaw);
  return cache;
}
