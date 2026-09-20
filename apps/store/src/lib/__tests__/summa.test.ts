/**
 * Summa entity cards (experiment, 2026-09-20): the archive's objects/ holds
 * one card per registered thing — entity → forms → copies. This site reads
 * the generated catalogue (and each card's body) at build and, for the
 * legacy assets that have a card, shows it BESIDE the legacy record. The
 * legacy model is not changed; the card is an overlay.
 */

import { describe, expect, it } from 'vitest';
import {
  cardBody,
  depotDownloadUrl,
  findCard,
  loadSumma,
  parseCardBody,
  type SummaCatalogue,
} from '../summa';

const AVOCADO = 'ndg-019d4075-9ece-7d3e-aafa-41f81370eb63';

describe('loadSumma', () => {
  it('loads the committed fixture catalogue and finds the Avocado by its legacy id', async () => {
    const summa = await loadSumma();
    expect(summa.entities.length).toBeGreaterThanOrEqual(1);
    const card = findCard(summa, AVOCADO);
    expect(card).toBeDefined();
    expect(card!.slug).toBe('avocado');
    expect(card!.entity).toBe('object');
    expect(['draft', 'active', 'withdrawn', 'frozen']).toContain(card!.status);
    expect(card!.forms[0]!.license).toBe('CC0-1.0');
    expect(card!.forms[0]!.rights_holder).toBe('Polygonal Mind');
  });

  it('answers undefined for an id with no card — the legacy record stands alone', async () => {
    const summa = await loadSumma();
    expect(findCard(summa, 'no-such-id')).toBeUndefined();
  });

  it('memoises: two calls, one catalogue', async () => {
    const a = await loadSumma();
    const b = await loadSumma();
    expect(a).toBe(b);
  });
});

describe('depotDownloadUrl', () => {
  it('prefers the copy that lives in the depot (numengames/numinia-assets), pinned to its commit', async () => {
    const card = findCard(await loadSumma(), AVOCADO)!;
    const url = depotDownloadUrl(card);
    expect(url).toContain('raw.githubusercontent.com/numengames/numinia-assets/');
    expect(url).toContain(card.forms[0]!.copies[0]!.commit);
  });

  it('falls back to the first copy when no copy names the depot, and null when there are none', () => {
    const summa: SummaCatalogue = {
      entities: [
        {
          slug: 'x',
          path: 'objects/x.md',
          id: 'x',
          title: 'X',
          entity: 'object',
          status: 'draft',
          version: '0.1.0',
          license: 'CC0-1.0',
          related: [],
          forms: [
            {
              role: 'model',
              format: 'glb',
              license: 'CC0-1.0',
              rights_holder: 'Nobody',
              copies: [{ url: 'https://elsewhere.example/x.glb', sha256: 'a'.repeat(64), bytes: 1 }],
            },
          ],
        },
        {
          slug: 'y',
          path: 'objects/y.md',
          id: 'y',
          title: 'Y',
          entity: 'object',
          status: 'draft',
          version: '0.1.0',
          license: 'CC0-1.0',
          related: [],
          forms: [],
        },
      ],
    };
    expect(depotDownloadUrl(summa.entities[0]!)).toBe('https://elsewhere.example/x.glb');
    expect(depotDownloadUrl(summa.entities[1]!)).toBeNull();
  });
});

describe('parseCardBody', () => {
  it('splits a card body into its sections by H2, dropping the header, the H1 and the blockquote lede', () => {
    const md = [
      '---',
      'id: "x"',
      'title: "X"',
      '---',
      '',
      '# X',
      '',
      '> **Summary:** one line.',
      '> **Audience:** all',
      '',
      '---',
      '',
      '## Why draft',
      '',
      'Because.',
      '',
      '## Description',
      '',
      'A thing, in **bold** and _italics_.',
      'Second line.',
      '',
      '## History',
      '',
      'Then this.',
      '',
    ].join('\n');
    const sections = parseCardBody(md);
    expect(sections.map((s) => s.title)).toEqual(['Why draft', 'Description', 'History']);
    expect(sections[1]!.html).toContain('<strong>bold</strong>');
    expect(sections[1]!.html).toContain('<em>italics</em>');
    expect(sections[1]!.html).not.toContain('Summary');
    expect(sections[2]!.html).toBe('<p>Then this.</p>');
  });

  it('escapes HTML in the prose: the card is text, never markup', () => {
    const md = '## A\n\n<script>x</script> & more\n';
    expect(parseCardBody(md)[0]!.html).toBe('<p>&lt;script&gt;x&lt;/script&gt; &amp; more</p>');
  });

  it('a body with no H2 yields no sections', () => {
    expect(parseCardBody('---\nid: x\n---\n\n# Only a title\n')).toEqual([]);
  });
});

describe('cardBody', () => {
  it('returns the committed fixture body for a card slug, and null for a slug with no body', async () => {
    const body = await cardBody('avocado');
    expect(body).not.toBeNull();
    expect(body!.some((s) => s.title === 'Description')).toBe(true);
    expect(await cardBody('no-such-card')).toBeNull();
  });
});
