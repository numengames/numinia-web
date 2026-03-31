/**
 * Parser for the Numinia RPG markdown source file.
 *
 * Reads the original .md file and splits it into CodexChapter / CodexFragment
 * structures, preserving the text exactly as written by the author.
 */

import type { CodexChapter, CodexFragment } from './types';

// ---------------------------------------------------------------------------
// Markdown → simple HTML (preserves original text, just adds structure)
// ---------------------------------------------------------------------------

function mdToHtml(md: string): string {
  return md
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Bullet lists
      if (/^[•\-\u2022]\s/.test(trimmed)) {
        const items = trimmed
          .split(/\n/)
          .map((line) => line.replace(/^[•\-\u2022]\s*/, '').trim())
          .filter(Boolean)
          .map((item) => `<li>${item}</li>`)
          .join('\n');
        return `<ul>${items}</ul>`;
      }

      // Numbered lists
      if (/^\d+[\.\)]\s/.test(trimmed)) {
        const items = trimmed
          .split(/\n/)
          .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter(Boolean)
          .map((item) => `<li>${item}</li>`)
          .join('\n');
        return `<ol>${items}</ol>`;
      }

      // Paragraphs — wrap in <p> but preserve line breaks within
      const html = trimmed
        .replace(/\n/g, '<br/>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic (single *)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

      // Detect «quoted» blocks (literary passages)
      if (trimmed.startsWith('«') || trimmed.startsWith('"')) {
        return `<blockquote><p>${html}</p></blockquote>`;
      }

      return `<p>${html}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Chapter number extraction
// ---------------------------------------------------------------------------

const CHAPTER_HEADER_RE = /^CAPÍTULO\s+(\d+)/;
const INTRO_HEADER_RE = /^INTRODUCCIÓN/;
const FRAGMENT_HEADER_RE = /^Fragmento\s+(\d+)\s*:\s*(.+)/;

// Detect section headers (lines that are short, ALL CAPS or Title Case, no punctuation)
function isSectionTitle(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 120) return false;
  if (t.startsWith('«') || t.startsWith('"') || t.startsWith('•') || t.startsWith('-')) return false;
  if (CHAPTER_HEADER_RE.test(t) || INTRO_HEADER_RE.test(t) || FRAGMENT_HEADER_RE.test(t)) return false;
  // ALL CAPS line (at least 3 words)
  if (t === t.toUpperCase() && t.split(/\s+/).length >= 2) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseCodexMarkdown(raw: string): CodexChapter[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const chapters: CodexChapter[] = [];

  let currentChapter: CodexChapter | null = null;
  let currentFragment: CodexFragment | null = null;
  let buffer: string[] = [];
  let lineIdx = 0;

  function flushBuffer() {
    if (currentFragment && buffer.length > 0) {
      const text = buffer.join('\n').trim();
      if (text) {
        currentFragment.body += (currentFragment.body ? '\n\n' : '') + text;
      }
    }
    buffer = [];
  }

  function finalizeFragment() {
    flushBuffer();
    if (currentFragment && currentChapter) {
      // Convert accumulated markdown to HTML
      currentFragment.body = mdToHtml(currentFragment.body);
      currentChapter.fragments.push(currentFragment);
    }
    currentFragment = null;
  }

  function finalizeChapter() {
    finalizeFragment();
    if (currentChapter) {
      chapters.push(currentChapter);
    }
    currentChapter = null;
  }

  while (lineIdx < lines.length) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    // ── Check for CAPÍTULO header ─────────────────────────────
    const chapterMatch = trimmed.match(CHAPTER_HEADER_RE);
    if (chapterMatch) {
      finalizeChapter();
      const num = parseInt(chapterMatch[1], 10);
      const subtitle = lines[lineIdx + 1]?.trim() || '';
      currentChapter = {
        id: `ch${num}`,
        number: num,
        title: subtitle, // The line after "CAPÍTULO X" is the real title
        subtitle: '',
        fragments: [],
      };
      lineIdx += 2; // skip header + title line

      // Check if next line is a subtitle (short, not a quote)
      const nextLine = lines[lineIdx]?.trim() || '';
      if (nextLine && !nextLine.startsWith('«') && nextLine.length < 100 && isSectionTitle(nextLine)) {
        currentChapter.subtitle = nextLine;
        lineIdx++;
      }

      // Start a default fragment for the chapter intro text
      currentFragment = {
        id: `ch${num}-intro`,
        title: currentChapter.title,
        body: '',
      };
      continue;
    }

    // ── Check for INTRODUCCIÓN header ─────────────────────────
    if (INTRO_HEADER_RE.test(trimmed)) {
      finalizeChapter();
      const subtitle = lines[lineIdx + 1]?.trim() || '';
      currentChapter = {
        id: 'intro',
        number: null,
        title: 'INTRODUCCIÓN',
        subtitle: subtitle,
        fragments: [],
      };
      lineIdx += 2; // skip header + subtitle

      currentFragment = {
        id: 'intro-main',
        title: subtitle || 'Introducción',
        body: '',
      };
      continue;
    }

    // ── Check for Fragmento header ────────────────────────────
    const fragMatch = trimmed.match(FRAGMENT_HEADER_RE);
    if (fragMatch && currentChapter) {
      finalizeFragment();
      const fragNum = fragMatch[1];
      const fragTitle = fragMatch[2].trim();
      currentFragment = {
        id: `${currentChapter.id}-f${fragNum}`,
        title: fragTitle,
        body: '',
      };
      lineIdx++;
      continue;
    }

    // ── Check for section titles within a fragment ─────────────
    // Convert them to h3 markers in the markdown
    if (currentFragment && isSectionTitle(trimmed) && trimmed.length > 5) {
      flushBuffer();
      buffer.push(`\n**${trimmed}**\n`);
      lineIdx++;
      continue;
    }

    // ── Regular content line ──────────────────────────────────
    if (currentFragment) {
      buffer.push(line);
    }

    lineIdx++;
  }

  // Finalize last chapter
  finalizeChapter();

  // Split large intro fragments at "Numinia: jugar para habitar un símbolo"
  for (const ch of chapters) {
    if (ch.id === 'intro' && ch.fragments.length === 1) {
      const frag = ch.fragments[0];
      const splitMarker = 'Numinia: jugar para habitar un símbolo';
      const splitIdx = frag.body.indexOf(splitMarker);
      if (splitIdx > 0) {
        // Find the <p> tag containing the marker
        const beforeMarker = frag.body.substring(0, splitIdx);
        const lastPClose = beforeMarker.lastIndexOf('</p>');
        if (lastPClose > 0) {
          const part1 = frag.body.substring(0, lastPClose + 4);
          const part2 = frag.body.substring(lastPClose + 4);
          ch.fragments = [
            { id: 'intro-main', title: ch.subtitle || 'Los Ecos de una Ciudad Virtual', body: part1 },
            { id: 'intro-habitar', title: 'Numinia: jugar para habitar un símbolo', body: part2 },
          ];
        }
      }
    }
  }

  // Split chapter intros from their first fragment if the intro is too large
  // (Chapters that have intro text before their first Fragmento)
  for (const ch of chapters) {
    if (ch.fragments.length > 1) {
      const intro = ch.fragments[0];
      // If the first fragment has the same title as the chapter and there are others,
      // it's the chapter intro - give it a better title
      if (intro.title === ch.title && intro.body.length > 200) {
        intro.title = ch.subtitle || ch.title;
      }
    }
  }

  return chapters;
}

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

export function getTotalFragments(chapters: CodexChapter[]): number {
  return chapters.reduce((sum, ch) => sum + ch.fragments.length, 0);
}
