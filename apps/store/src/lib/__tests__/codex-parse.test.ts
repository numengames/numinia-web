/**
 * Codex pipeline tests (MIS-085 Phase A): the v0.6.0 manual is ONE canonical
 * file (Oracle amendment, File Over App); chapters exist only at build time.
 * The sacred invariant: splitting must reconstruct the source byte-exactly.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { chapterAnchors, splitManual, type CodexChapter } from '../codex/parse.js';
import { buildManifest, CodexManifestSchema, MANUAL_VERSION } from '../codex/manifest.js';

const fixture = readFileSync(
  new URL('../../../fixtures/manual/manual-v0_6_0-fixture.md', import.meta.url),
  'utf8',
);

describe('splitManual', () => {
  const chapters = splitManual(fixture);

  it('reconstructs the source byte-exactly from the chapter segments', () => {
    expect(chapters.map((chapter) => chapter.raw).join('')).toBe(fixture);
  });

  it('finds introducción, the seven chapters, and the module — in order', () => {
    expect(chapters.map((chapter) => chapter.number)).toEqual([null, 1, 2, 3, 4, 5, 6, 7, null]);
    expect(chapters[0]?.slug).toBe('introduccion');
    expect(chapters.at(-1)?.slug).toBe('el-espejo-roto');
  });

  it('takes each chapter title from the display heading, not the CAPÍTULO marker', () => {
    expect(chapters[0]?.title).toBe('UN FIXTURE ENTRE PLANOS');
    expect(chapters[1]?.title).toBe('LA FORMA DE UN CAPÍTULO');
    expect(chapters[1]?.slug).toBe('la-forma-de-un-capitulo');
  });

  it('does not mistake the module-internal h1 headings for chapter boundaries', () => {
    const module = chapters.at(-1) as CodexChapter;
    expect(module.raw).toContain('# **Una sección interna del módulo**');
    expect(chapters).toHaveLength(9);
  });

  it('marks introducción and chapter 1 public, everything after the Umbral gated', () => {
    expect(chapters.map((chapter) => chapter.access)).toEqual([
      'public',
      'public',
      'gated',
      'gated',
      'gated',
      'gated',
      'gated',
      'gated',
      'gated',
    ]);
  });

  it('keeps any preamble before the first boundary inside the first segment', () => {
    const withPreamble = `stray line\n${fixture}`;
    const split = splitManual(withPreamble);
    expect(split.map((chapter) => chapter.raw).join('')).toBe(withPreamble);
    expect(split[0]?.raw.startsWith('stray line')).toBe(true);
  });

  it('throws on a text with no chapter boundaries at all', () => {
    expect(() => splitManual('just prose, no structure')).toThrow(/boundary/i);
  });
});

describe('splitManual — the English edition', () => {
  // The fixture with the English markers and two English titles: the same
  // structure the archive's lore/game/manual/en/ joins into.
  const english = fixture
    .replace('# **INTRODUCCIÓN**', '# **INTRODUCTION**')
    .replaceAll(/# \*\*CAPÍTULO (\d)\*\*/g, '# **CHAPTER $1**')
    .replace('# **LA FORMA DE UN CAPÍTULO**', '# **WELCOME TO NUMINIA**')
    .replace('# **EL ESPEJO ROTO**', '# **THE BROKEN MIRROR**');
  const chapters = splitManual(english);

  it('reconstructs the source byte-exactly from the chapter segments', () => {
    expect(chapters.map((chapter) => chapter.raw).join('')).toBe(english);
  });

  it('finds INTRODUCTION, the seven CHAPTERs and THE BROKEN MIRROR, with English slugs', () => {
    expect(chapters.map((chapter) => chapter.number)).toEqual([null, 1, 2, 3, 4, 5, 6, 7, null]);
    expect(chapters[0]?.slug).toBe('introduction');
    expect(chapters[1]?.slug).toBe('welcome-to-numinia');
    expect(chapters.at(-1)?.slug).toBe('the-broken-mirror');
    expect(chapters.at(-1)?.title).toBe('THE BROKEN MIRROR');
    expect(() => buildManifest(chapters)).not.toThrow();
  });

  it('accepts the Spanish module inside the English manual (translation pending)', () => {
    const mixed = english.replace('# **THE BROKEN MIRROR**', '# **EL ESPEJO ROTO**');
    const split = splitManual(mixed);
    expect(split.map((chapter) => chapter.raw).join('')).toBe(mixed);
    expect(split.at(-1)?.slug).toBe('el-espejo-roto');
  });
});

describe('chapterAnchors', () => {
  const chapters = splitManual(fixture);

  it('gives every heading a stable slug id and every paragraph a sequential anchor', () => {
    const anchors = chapterAnchors(chapters[1] as CodexChapter);
    const headings = anchors.filter((anchor) => anchor.kind === 'heading');
    expect(headings.map((anchor) => anchor.id)).toEqual([
      'la-forma-de-un-capitulo',
      'fragmento-1-la-primera-prueba',
      'una-subseccion',
      'fragmento-2-datos-tabulados',
    ]);
    const paragraphs = anchors.filter((anchor) => anchor.kind === 'paragraph');
    expect(paragraphs[0]?.id).toBe('p-1');
    expect(paragraphs.map((anchor) => anchor.id)).toEqual(
      paragraphs.map((_, index) => `p-${index + 1}`),
    );
  });

  it('deduplicates repeated heading slugs deterministically', () => {
    const chapter: CodexChapter = {
      slug: 'x',
      title: 'X',
      number: 1,
      access: 'gated',
      raw: '# **CAPÍTULO 1**\n\n# **X**\n\n## **Eco**\n\nUno.\n\n## **Eco**\n\nDos.\n',
    };
    const ids = chapterAnchors(chapter)
      .filter((anchor) => anchor.kind === 'heading')
      .map((anchor) => anchor.id);
    expect(ids).toEqual(['x', 'eco', 'eco-2']);
  });
});

describe('buildManifest', () => {
  it('produces a Zod-valid manifest from the fixture', () => {
    const manifest = buildManifest(splitManual(fixture));
    expect(() => CodexManifestSchema.parse(manifest)).not.toThrow();
    expect(manifest.version).toBe(MANUAL_VERSION);
    expect(manifest.chapters).toHaveLength(9);
    expect(new Set(manifest.chapters.map((chapter) => chapter.slug)).size).toBe(9);
  });

  it('rejects a manual missing one of the seven numbered chapters', () => {
    const truncated = fixture.slice(0, fixture.indexOf('# **CAPÍTULO 7**'));
    expect(() => buildManifest(splitManual(truncated))).toThrow(/chapter/i);
  });
});
