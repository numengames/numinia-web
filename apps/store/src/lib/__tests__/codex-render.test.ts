/**
 * Codex renderer tests (MIS-085 B): the verbatim segment becomes the book's
 * closed component inventory, ids aligned one-to-one with chapterAnchors.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { renderInline } from '../codex/inline.js';
import { chapterAnchors, splitManual, type CodexChapter } from '../codex/parse.js';
import { renderChapter } from '../codex/render.js';

const fixture = readFileSync(
  new URL('../../../fixtures/manual/manual-v0_6_0-fixture.md', import.meta.url),
  'utf8',
);
const chapters = splitManual(fixture);
const chapterOne = chapters[1] as CodexChapter;

describe('renderInline', () => {
  it('escapes HTML and re-materializes only the whitelisted marks', () => {
    expect(renderInline('a <script>x</script> b')).toBe('a &lt;script&gt;x&lt;/script&gt; b');
    expect(renderInline('un término <u>subrayado</u>')).toBe('un término <u>subrayado</u>');
    expect(renderInline('nota<sup>12</sup> aquí')).toBe(
      'nota<sup class="nota-ref" data-nota="12">12</sup> aquí',
    );
    expect(renderInline('con **negrita** y _cursiva_ finas')).toBe(
      'con <strong>negrita</strong> y <em>cursiva</em> finas',
    );
  });

  it('does not italicize underscores inside words', () => {
    expect(renderInline('manual_v0_6_0 intacto')).toBe('manual_v0_6_0 intacto');
  });
});

describe('renderChapter', () => {
  const rendered = renderChapter(chapterOne);

  it('gives every heading and paragraph the same id the anchor pass computes', () => {
    const anchors = chapterAnchors(chapterOne);
    for (const anchor of anchors) {
      if (anchor.id === 'la-forma-de-un-capitulo') continue; // portadilla carries it
      expect(rendered.html).toContain(`id="${anchor.id}"`);
    }
  });

  it('renders the reading box from fully italic-wrapped blocks, marks absorbed', () => {
    const intro = renderChapter(chapters[0] as CodexChapter);
    expect(intro.html).toContain('class="lectura"');
    // The box is italic by design (CSS); the per-line underscores are style
    // carriers, not content, and must not leak.
    expect(intro.html).toContain('«Una cita sintética de apertura');
    expect(intro.html).not.toContain('_«');
  });

  it('numbers tables per chapter and keeps them scrollable regions', () => {
    expect(rendered.html).toContain('Tabla 1.1');
    expect(rendered.html).toContain('role="region"');
    expect(rendered.html).toContain('<caption>');
  });

  it('turns image refs into pending-art plate slots', () => {
    expect(rendered.html).toContain('class="lamina pendiente"');
    expect(rendered.html).not.toContain('![](');
  });

  it('collects footnote artifact lines as margin notes', () => {
    const intro = renderChapter(chapters[0] as CodexChapter);
    expect(intro.notes.length).toBeGreaterThan(0);
    expect(intro.notes[0]?.number).toBe('1');
    expect(intro.html).toContain('class="nota-pie"');
  });

  it('renders list blocks as lists', () => {
    expect(rendered.html).toContain('<ul id="');
    expect(rendered.html).toContain('<li>Primer elemento de una lista sintética</li>');
  });

  it('never lets the CAPÍTULO marker or raw ** marks leak into the page', () => {
    expect(rendered.html).not.toContain('CAPÍTULO 1');
    expect(rendered.html).not.toContain('**');
  });
});
