/**
 * Glossary parsing (MIS-085 §4.8) in both editions: the Spanish original
 * (## Término / _Fuente: …_) and the English edition (## Term / _Source: …_),
 * each skipping its closing note on unsourced terms.
 */

import { describe, expect, it } from 'vitest';
import { parseGlossary } from '../codex/glossary';
import { glossaryVariants } from '../codex/terms';

const SPANISH = `# Glosario

## Umbral
La fuerza que da cuerpo al mundo.
_Fuente: Capítulo 2, «Las fronteras del Umbral»._

## Términos sin fuente en el manual

Ninguno.
`;

const ENGLISH = `# Glossary

## Threshold
The force that gives the world a body.
_Source: Chapter 2, «The frontiers of the Threshold»._

## Broken Mirror, The
The module.
_Source: The Broken Mirror._

## Terms without a source in the manual

None.
`;

describe('parseGlossary', () => {
  it('reads the Spanish original, source label included', () => {
    expect(parseGlossary(SPANISH)).toEqual([
      {
        term: 'Umbral',
        definition: 'La fuerza que da cuerpo al mundo.',
        source: 'Fuente: Capítulo 2, «Las fronteras del Umbral».',
      },
    ]);
  });

  it('reads the English edition and skips its unsourced-terms note', () => {
    const entries = parseGlossary(ENGLISH);
    expect(entries.map((entry) => entry.term)).toEqual(['Threshold', 'Broken Mirror, The']);
    expect(entries[0]!.source).toBe('Source: Chapter 2, «The frontiers of the Threshold».');
  });

  it('reads an inverted English article as the prose says it', () => {
    const patterns = glossaryVariants(parseGlossary(ENGLISH)).map((target) => target.pattern);
    expect(patterns).toContain('The Broken Mirror');
  });
});
