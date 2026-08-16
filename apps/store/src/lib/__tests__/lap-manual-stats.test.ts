/**
 * Codex manual parser + archive stats. Since ADR-020 the real corpus lives
 * in the private lore repo; hermetic runs parse the committed synthetic
 * fixture, which mirrors the real manual's structural skeleton (intro +
 * numbered chapters + Historia fragment + tables) with zero lore. When
 * `.lore/manual.md` is fetched locally, the same assertions hold against
 * the real corpus (anti-tautology, audit rule 1).
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadManual, parseManual } from '../lap/manual';
import { computeArchiveStats } from '../lap/stats';

// ../env parses process.env at module scope: stub before importing archive.
beforeAll(() => {
  vi.stubEnv('GITHUB_REPO_OWNER', 'o');
  vi.stubEnv('GITHUB_REPO_NAME', 'r');
  vi.stubEnv('DATA_SOURCE', 'fixture');
});

describe('manual parser', () => {
  it('structures the manual source: intro + numbered chapters + fragments', async () => {
    const chapters = await loadManual();
    expect(chapters.length).toBeGreaterThanOrEqual(5);
    expect(chapters[0]!.id).toBe('introduccion');
    expect(chapters[0]!.number).toBeNull();
    const second = chapters.find((chapter) => chapter.number === 2);
    expect(second?.fragments.some((fragment) => fragment.title.includes('Historia'))).toBe(true);
    for (const chapter of chapters) {
      expect(chapter.title.length).toBeGreaterThan(0);
      expect(chapter.fragments.length).toBeGreaterThan(0);
      for (const fragment of chapter.fragments) {
        expect(fragment.blocks.length).toBeGreaterThan(0);
      }
    }
  });

  it('preserves the author text exactly inside blocks', () => {
    const chapters = parseManual(
      ['CAPÍTULO 9', 'Título del capítulo', 'Fragmento 1: La prueba', 'Un párrafo íntegro.'].join(
        '\n',
      ),
    );
    const block = chapters[0]!.fragments[0]!.blocks[0]!;
    expect(block.kind === 'paragraph' && block.text).toBe('Un párrafo íntegro.');
    expect(chapters[0]!.fragments[0]!.title).toBe('La prueba');
  });

  it('never repeats the chapter title as a fragment name', async () => {
    for (const chapter of await loadManual()) {
      expect(chapter.fragments.map((fragment) => fragment.title)).not.toContain(chapter.title);
      for (const fragment of chapter.fragments) {
        expect(fragment.id).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });

  it('keeps tab-separated tables as tables, not flattened prose', () => {
    const chapters = parseManual(
      ['CAPÍTULO 5', 'Tablas', 'Fragmento 1: Datos', 'ASPECTO\tVELO', 'Esencia\tOcultamiento'].join(
        '\n',
      ),
    );
    const fragment = chapters[0]!.fragments.find((entry) => entry.title === 'Datos')!;
    const block = fragment.blocks[0]!;
    expect(block.kind).toBe('table');
    expect(block.kind === 'table' && block.rows).toEqual([
      ['ASPECTO', 'VELO'],
      ['Esencia', 'Ocultamiento'],
    ]);
  });

  it('classifies quotes and caps subtitles without touching them', () => {
    const chapters = parseManual(
      [
        'CAPÍTULO 1',
        'T',
        '«Cita de apertura.»',
        'LOS PROLEGÓMENOS DEL JUEGO',
        'Prosa normal.',
      ].join('\n'),
    );
    const kinds = chapters[0]!.fragments[0]!.blocks.map((block) => block.kind);
    expect(kinds).toEqual(['quote', 'subtitle', 'paragraph']);
  });
});

describe('archive stats', () => {
  it('computes real numbers from the committed catalog', async () => {
    const { loadArchive } = await import('../archive');
    const stats = computeArchiveStats(await loadArchive());
    expect(stats.total).toBeGreaterThanOrEqual(30);
    expect(stats.projects).toBeGreaterThanOrEqual(5);
    expect(stats.byFormat.reduce((sum, row) => sum + row.count, 0)).toBe(stats.total);
    expect(stats.redundancy.redundant + stats.redundancy.single).toBe(stats.total);
    expect(stats.layers['r2']).toBeGreaterThan(0);
  });
});
