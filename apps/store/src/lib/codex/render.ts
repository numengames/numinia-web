/**
 * Block rendering for the Codex (MIS-085 B): a chapter's verbatim segment
 * becomes the closed component inventory of the book plane (§4 of the
 * brief) — nothing else. Blocks are the same blank-line groups the anchor
 * pass counts, so every paragraph carries its stable `p-N` id and every
 * heading its slug id (bookmarks and citations depend on this alignment).
 */
import { isItalicLine, renderInline } from './inline.js';
import { slugify, type CodexChapter } from './parse.js';

interface MarginNote {
  readonly number: string;
  readonly html: string;
}

export interface RenderedChapter {
  readonly html: string;
  readonly notes: readonly MarginNote[];
}

const HEADING_RE = /^(#{1,6}) (.+?)\s*$/;
const MARKER_RE = /^# \*\*(INTRODUCCIÓN|CAPÍTULO \d+|EL ESPEJO ROTO)\*\*\s*$/;
const IMAGE_RE = /^!\[\]\((.+)\)\s*$/;
const FOOTNOTE_RE = /^(\d{1,2}) (?=\p{L})/u;

const headingTag = (depth: number): string => `h${Math.min(6, Math.max(2, depth))}`;

function stripMarks(text: string): string {
  return text.replaceAll('**', '').replaceAll(/^_|_$/g, '');
}

function renderTable(lines: readonly string[], caption: string): string {
  // A cell holding only an escaped \*\*\* is the transcription's in-table
  // filete (the printed sheet's little separator), never prose.
  const cell = (text: string): string =>
    text.trim() === '\\*\\*\\*'
      ? '<span class="filete-celda" aria-hidden="true"></span>'
      : renderInline(text);
  const rows = lines.map((line) => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell));
  const [head, ...body] = rows.filter((_, index) => index !== 1); // drop |---| row
  const headHtml = (head ?? []).map((cell) => `<th scope="col">${cell}</th>`).join('');
  const bodyHtml = body
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');
  return (
    `<div class="tabla" role="region" aria-label="${caption}" tabindex="0"><table>` +
    `<caption>${caption}</caption><thead><tr>${headHtml}</tr></thead>` +
    `<tbody>${bodyHtml}</tbody></table></div>`
  );
}

function renderLamina(source: string): string {
  const name = renderInline(source.split('/').pop() ?? source);
  return (
    '<figure class="lamina pendiente"><div class="arte-hueco" role="img" ' +
    `aria-label="Lámina pendiente de arte final"><span class="tec">lámina · boceto pendiente ` +
    `de arte final</span></div><figcaption><span>Hueco de ilustración del original.</span>` +
    `<span class="tec">${name}</span></figcaption></figure>`
  );
}

/**
 * Blank-line block groups, in source order. A heading line always forms its
 * own group even without a blank line around it (the manual attaches the
 * epigraph right under the display h1) — same separation rule as the anchor
 * pass, so paragraph numbering stays aligned.
 */
function blockGroups(raw: string): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length > 0) groups.push(current);
    current = [];
  };
  for (const line of raw.split('\n')) {
    if (line.trim() === '') {
      flush();
    } else if (HEADING_RE.test(line)) {
      flush();
      groups.push([line]);
    } else {
      current.push(line);
    }
  }
  flush();
  return groups;
}

/** First open prose of a chapter, for the Umbral's veiled teaser. The full
 * text is a free download (D6), so this reveals nothing that is hidden. */
export function chapterPreview(chapter: CodexChapter, maxLength = 420): string {
  const parts: string[] = [];
  for (const group of blockGroups(chapter.raw)) {
    const first = group[0] as string;
    if (HEADING_RE.test(first) || IMAGE_RE.exec(first) || first.startsWith('|')) continue;
    parts.push(group.map((line) => stripMarks(line.trim())).join(' '));
    if (parts.join(' ').length >= maxLength) break;
  }
  const text = parts.join(' ').replaceAll('_', '');
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

export function renderChapter(chapter: CodexChapter): RenderedChapter {
  const parts: string[] = [];
  const notes: MarginNote[] = [];
  const seen = new Map<string, number>();
  let paragraph = 0;
  let table = 0;
  let sawDisplayTitle = false;
  const chapterLabel = chapter.number ?? '·';

  for (const group of blockGroups(chapter.raw)) {
    const first = group[0] as string;
    const heading = group.length === 1 ? HEADING_RE.exec(first) : null;

    if (heading && MARKER_RE.test(first)) continue; // structure, not content
    if (heading && heading[1] === '#' && !sawDisplayTitle) {
      // The display h1 renders in the portadilla, which carries its anchor
      // id; register the slug so later duplicates dedup exactly like the
      // anchor pass does.
      sawDisplayTitle = true;
      seen.set(slugify(heading[2] as string), 1);
      continue;
    }
    if (heading) {
      const base = slugify(heading[2] as string);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      const id = count === 1 ? base : `${base}-${count}`;
      const tag = headingTag(heading[1]!.length);
      parts.push(`<${tag} id="${id}">${renderInline(stripMarks(heading[2] as string))}</${tag}>`);
      continue;
    }
    // Every non-heading block advances the paragraph counter, tables
    // included — the ids must align one-to-one with chapterAnchors.
    paragraph += 1;
    const id = `p-${paragraph}`;
    // Filete separator (\*\*\* in the sheet transcription; absent from the
    // manual itself). Keeps its anchor so the block count stays aligned.
    if (group.length === 1 && /^(\\\*){3}$|^\*{3}$/.test(first.trim())) {
      parts.push(`<hr id="${id}" class="filete-doc"/>`);
      continue;
    }
    if (group.every((line) => line.startsWith('|'))) {
      table += 1;
      parts.push(
        `<div id="${id}" class="tabla-ancla">${renderTable(group, chapter.number === null ? `Tabla ${table}` : `Tabla ${chapterLabel}.${table}`)}</div>`,
      );
      continue;
    }
    // Image refs are page-break artifacts: sometimes alone, sometimes glued
    // to the prose that continued after the plate in the original PDF.
    const image = IMAGE_RE.exec(first);
    if (image) {
      const rest = group.slice(1).join(' ').trim();
      const tail = rest === '' ? '' : `<p>${renderInline(rest)}</p>`;
      parts.push(`<div id="${id}">${renderLamina(image[1] as string)}${tail}</div>`);
      continue;
    }
    const footnote = group.length === 1 ? FOOTNOTE_RE.exec(first) : null;
    if (footnote) {
      const number = footnote[1] as string;
      const html = renderInline(first.slice(footnote[0].length));
      notes.push({ number, html });
      parts.push(
        `<aside id="${id}" class="nota-pie" data-nota="${number}">` +
          `<span class="num">${number}</span> · ${html}</aside>`,
      );
      continue;
    }
    if (group.every((line) => line.trim().startsWith('- '))) {
      const items = group.map((line) => `<li>${renderInline(line.trim().slice(2))}</li>`).join('');
      parts.push(`<ul id="${id}">${items}</ul>`);
      continue;
    }
    if (group.every(isItalicLine)) {
      // Consecutive italic groups belong to ONE reading box: the manual
      // breaks its read-aloud passages into paragraphs, the box keeps them
      // together. Each paragraph keeps its own stable anchor.
      const body = renderInline(group.map((line) => line.trim()).join(' '));
      const previous = parts[parts.length - 1];
      if (previous?.endsWith('</p></div>') && previous.includes('class="lectura"')) {
        parts[parts.length - 1] =
          `${previous.slice(0, -'</div>'.length)}<p id="${id}">${body}</p></div>`;
      } else {
        parts.push(`<div class="lectura"><p id="${id}">${body}</p></div>`);
      }
      continue;
    }
    parts.push(`<p id="${id}">${renderInline(group.join(' '))}</p>`);
  }

  return { html: parts.join('\n'), notes };
}
