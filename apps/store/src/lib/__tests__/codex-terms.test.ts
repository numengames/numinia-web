/**
 * Glossary term linking (MIS-085 B §4.8): the first occurrence of each
 * term in a chapter's body links to its glossary entry. Print convention:
 * first occurrence only — a reference, not confetti. The text is sacred:
 * linking wraps, never rewrites.
 */

import { describe, expect, it } from 'vitest';
import { glossaryVariants, linkGlossaryTerms } from '../codex/terms';

const ENTRIES = [
  { term: 'Umbral', definition: '', source: '' },
  { term: 'Legión del Umbral', definition: '', source: '' },
  { term: 'Espejo Roto, El', definition: '', source: '' },
  { term: 'Director de Juego (DJ)', definition: '', source: '' },
  { term: 'Velo', definition: '', source: '' },
] as const;

const targets = glossaryVariants(ENTRIES);
const BASE = '/es/lap/codex/glosario/';

describe('glossaryVariants', () => {
  it('derives surface forms: plain, parenthetical pairs and inverted articles', () => {
    const patterns = targets.map((target) => target.pattern);
    expect(patterns).toContain('Legión del Umbral');
    expect(patterns).toContain('El Espejo Roto');
    expect(patterns).toContain('Director de Juego');
    expect(patterns).toContain('DJ');
    // Longest first, so compound terms win over their fragments.
    expect(patterns.indexOf('Legión del Umbral')).toBeLessThan(patterns.indexOf('Umbral'));
  });
});

describe('linkGlossaryTerms', () => {
  it('links only the first occurrence of a term', () => {
    const html = '<p id="p-1">El Velo cubre. El Velo protege.</p>';
    const linked = linkGlossaryTerms(html, targets, BASE);
    expect(linked).toBe(
      `<p id="p-1">El <a class="termino" href="${BASE}#velo">Velo</a> cubre. El Velo protege.</p>`,
    );
  });

  it('prefers the longest variant and never nests links', () => {
    const html = '<p>La Legión del Umbral vigila el Umbral.</p>';
    const linked = linkGlossaryTerms(html, targets, BASE);
    expect(linked).toContain(`<a class="termino" href="${BASE}#legion-del-umbral">`);
    expect(linked).toContain(`vigila el <a class="termino" href="${BASE}#umbral">Umbral</a>`);
    expect(linked).not.toMatch(/<a[^>]*><a/);
  });

  it('matches inverted-article terms as they read in prose', () => {
    const linked = linkGlossaryTerms('<p>Jugaremos El Espejo Roto.</p>', targets, BASE);
    expect(linked).toContain(`href="${BASE}#espejo-roto-el"`);
  });

  it('never touches markup, attributes, headings or existing anchors', () => {
    const html =
      '<h3 id="el-velo">Velo</h3><p class="Velo-x">texto</p>' +
      '<p><a href="/x">Velo enlazado</a> y luego el Velo libre.</p>';
    const linked = linkGlossaryTerms(html, targets, BASE);
    expect(linked).toContain('<h3 id="el-velo">Velo</h3>');
    expect(linked).toContain('class="Velo-x"');
    expect(linked).toContain('<a href="/x">Velo enlazado</a>');
    expect(linked).toContain(`el <a class="termino" href="${BASE}#velo">Velo</a> libre`);
  });

  it('respects word boundaries with Spanish letters', () => {
    const linked = linkGlossaryTerms('<p>Velocidad y Veloz no son el Velo.</p>', targets, BASE);
    expect(linked).not.toContain('Velo</a>cidad');
    expect(linked).toContain(`el <a class="termino" href="${BASE}#velo">Velo</a>.`);
  });
});
