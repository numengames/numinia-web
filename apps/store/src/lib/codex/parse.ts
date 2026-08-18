/**
 * Codex pipeline (MIS-085 Phase A): build-time chapter split of the v0.6.0
 * manual. The manual is ONE canonical file in numinia-lore (File Over App,
 * Oracle amendment 2026-08-17); chapters exist only here, as segments of the
 * source string. The sacred invariant: joining every segment reconstructs
 * the source byte-exactly — the parser adds structure around the text, never
 * touches a character of it.
 */

type CodexAccess = 'public' | 'gated';

export interface CodexChapter {
  readonly slug: string;
  readonly title: string;
  /** 1–7 for numbered chapters; null for introducción and the module. */
  readonly number: number | null;
  readonly access: CodexAccess;
  /** Verbatim segment of the source, boundary marker included. */
  readonly raw: string;
}

export interface CodexAnchor {
  readonly id: string;
  readonly kind: 'heading' | 'paragraph';
  /** Heading depth (1–6); 0 for paragraph blocks. */
  readonly depth: number;
  readonly line: number;
}

const INTRO_RE = /^# \*\*INTRODUCCIÓN\*\*\s*$/;
const CHAPTER_RE = /^# \*\*CAPÍTULO (\d+)\*\*\s*$/;
const MODULE_RE = /^# \*\*EL ESPEJO ROTO\*\*\s*$/;
const HEADING_RE = /^(#{1,6}) (.+?)\s*$/;
const DISPLAY_H1_RE = /^# \*\*(.+)\*\*\s*$/;

/** Markup-stripped slug: what block IDs and routes are made of (D8). */
export function slugify(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[_`]/g, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

interface Boundary {
  readonly lineIndex: number;
  readonly number: number | null;
  readonly kind: 'intro' | 'chapter' | 'module';
}

function findBoundaries(lines: readonly string[]): Boundary[] {
  const boundaries: Boundary[] = [];
  lines.forEach((line, lineIndex) => {
    if (INTRO_RE.test(line)) boundaries.push({ lineIndex, number: null, kind: 'intro' });
    const chapter = CHAPTER_RE.exec(line);
    if (chapter) boundaries.push({ lineIndex, number: Number(chapter[1]), kind: 'chapter' });
    if (MODULE_RE.test(line)) boundaries.push({ lineIndex, number: null, kind: 'module' });
  });
  return boundaries;
}

export function splitManual(raw: string): readonly CodexChapter[] {
  const lines = raw.split('\n');
  const boundaries = findBoundaries(lines);
  if (boundaries.length === 0) {
    throw new Error('splitManual: no chapter boundary markers found in the source.');
  }

  // Character offset where each line starts, so segments are exact slices.
  const offsets: number[] = new Array<number>(lines.length);
  let offset = 0;
  lines.forEach((line, index) => {
    offsets[index] = offset;
    offset += line.length + 1; // the '\n' removed by split
  });

  return boundaries.map((boundary, index) => {
    // Any preamble before the first marker stays in the first segment: every
    // character of the source must live in exactly one chapter.
    const start = index === 0 ? 0 : (offsets[boundary.lineIndex] as number);
    const next = boundaries[index + 1];
    const end = next ? (offsets[next.lineIndex] as number) : raw.length;
    const segment = raw.slice(start, end);

    const title =
      boundary.kind === 'module'
        ? 'EL ESPEJO ROTO'
        : (displayTitle(lines, boundary.lineIndex, next?.lineIndex ?? lines.length) ??
          lines[boundary.lineIndex]!.replace(/^# |\*\*/g, ''));
    const slug =
      boundary.kind === 'intro'
        ? 'introduccion'
        : boundary.kind === 'module'
          ? 'el-espejo-roto'
          : slugify(title);

    return {
      slug,
      title,
      number: boundary.number,
      access: boundary.kind === 'intro' || boundary.number === 1 ? 'public' : 'gated',
      raw: segment,
    } satisfies CodexChapter;
  });
}

/** The h1 AFTER the marker is the chapter's display title. */
function displayTitle(
  lines: readonly string[],
  markerIndex: number,
  endIndex: number,
): string | undefined {
  for (let index = markerIndex + 1; index < endIndex; index += 1) {
    const match = DISPLAY_H1_RE.exec(lines[index] ?? '');
    if (match) return match[1]!.trim();
    if ((lines[index] ?? '').trim() !== '') return undefined;
  }
  return undefined;
}

function isBoundaryMarker(line: string): boolean {
  return INTRO_RE.test(line) || CHAPTER_RE.test(line) || MODULE_RE.test(line);
}

/**
 * Stable block anchors for one chapter: heading slugs (deduplicated with a
 * deterministic counter) plus sequential paragraph anchors. Bookmarks,
 * citations and any future audio/DJ-agent sync depend on these staying
 * stable, so cleanup passes must never change block COUNT or order.
 */
export function chapterAnchors(chapter: CodexChapter): readonly CodexAnchor[] {
  const anchors: CodexAnchor[] = [];
  const seen = new Map<string, number>();
  let paragraphCount = 0;
  let inBlock = false;

  chapter.raw.split('\n').forEach((line, lineIndex) => {
    if (line.trim() === '') {
      inBlock = false;
      return;
    }
    const heading = HEADING_RE.exec(line);
    if (heading && !isBoundaryMarker(line)) {
      const base = slugify(heading[2]!);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      anchors.push({
        id: count === 1 ? base : `${base}-${count}`,
        kind: 'heading',
        depth: heading[1]!.length,
        line: lineIndex,
      });
      inBlock = false;
      return;
    }
    if (heading) {
      // Boundary markers are structure, not content: no anchor.
      inBlock = false;
      return;
    }
    if (!inBlock) {
      paragraphCount += 1;
      anchors.push({ id: `p-${paragraphCount}`, kind: 'paragraph', depth: 0, line: lineIndex });
      inBlock = true;
    }
  });
  return anchors;
}
