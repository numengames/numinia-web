/**
 * The legal corpus: four verbatim copies of the numinia-archive masters.
 * The pinned versions must never drift from the copies on disk (a refreshed
 * master with the same LEGAL_CORPUS_VERSION would silently keep every old
 * acceptance valid), and no copy may show a visitor the review machinery.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isCurrentLegalAcceptance,
  LEGAL_CORPUS_VERSION,
  LEGAL_DOC_LANGUAGE,
  LEGAL_DOC_SLUG,
  LEGAL_DOC_VERSION,
  LEGAL_DOCS,
  LEGAL_EMAIL,
  legalBody,
  legalDocForSlug,
  legalHygieneProblems,
  type LegalDoc,
} from '../legal';

function raw(doc: LegalDoc): string {
  const path = fileURLToPath(
    new URL(`../../content/legal/${LEGAL_DOC_SLUG[doc]}.md`, import.meta.url),
  );
  return readFileSync(path, 'utf8');
}

function frontmatter(doc: LegalDoc): Record<string, string> {
  const block = /^---\n([\s\S]*?)\n---/.exec(raw(doc));
  expect(block, `${doc} has no frontmatter`).toBeTruthy();
  const fields: Record<string, string> = {};
  for (const line of (block as RegExpExecArray)[1]!.split('\n')) {
    const match = /^([a-z_]+):\s*"?([^"]*)"?$/.exec(line);
    if (match) fields[match[1] as string] = match[2] as string;
  }
  return fields;
}

describe('legal corpus', () => {
  it('publishes the four texts in the footer order', () => {
    expect(LEGAL_DOCS).toEqual(['notice', 'privacy', 'cookies', 'terms']);
  });

  it.each(LEGAL_DOCS)('%s is a reserved-rights copy of a legal master', (doc) => {
    const fields = frontmatter(doc);
    expect(fields['type']).toBe('legal');
    expect(fields['id']).toMatch(/^LEG-00[1-4]$/);
    // Reserved rights: the copy must never inherit an open licence.
    expect(fields['license']).toBe('LicenseRef-Numen-AllRightsReserved');
    // Split tags: a literal SPDX line here would relicense this test file.
    const tag = 'SPDX-';
    expect(raw(doc)).toContain(`${tag}License-Identifier: LicenseRef-Numen-AllRightsReserved`);
    expect(raw(doc)).toContain(`${tag}FileCopyrightText: 2026 Numen Games S.L.`);
  });

  it.each(LEGAL_DOCS)('%s version matches the pinned one', (doc) => {
    expect(frontmatter(doc)['version']).toBe(LEGAL_DOC_VERSION[doc]);
  });

  it.each(LEGAL_DOCS)('%s body shows a visitor nothing it must not', (doc) => {
    const body = legalBody(raw(doc));
    expect(legalHygieneProblems(body)).toEqual([]);
    expect(body).toContain(LEGAL_EMAIL);
  });

  it('names both signed master versions in the acceptance string', () => {
    expect(LEGAL_CORPUS_VERSION).toBe('terms@1.0.1+privacy@2.1.0');
  });

  it('only accepts the exact current corpus', () => {
    expect(isCurrentLegalAcceptance(LEGAL_CORPUS_VERSION)).toBe(true);
    // Acceptances of the previous texts stop counting: asked again at sign-in.
    expect(isCurrentLegalAcceptance('terms@1.0.0+privacy@2.0.0')).toBe(false);
    expect(isCurrentLegalAcceptance('')).toBe(false);
    expect(isCurrentLegalAcceptance(true)).toBe(false);
    expect(isCurrentLegalAcceptance(undefined)).toBe(false);
  });

  it('routes each doc by slug and keeps /legal/legal-notice/', () => {
    for (const doc of LEGAL_DOCS) expect(legalDocForSlug(LEGAL_DOC_SLUG[doc])).toBe(doc);
    expect(LEGAL_DOC_SLUG.notice).toBe('legal-notice');
    expect(legalDocForSlug('notice')).toBeUndefined();
    expect(legalDocForSlug(undefined)).toBeUndefined();
  });

  it('declares every master as English', () => {
    expect(new Set(Object.values(LEGAL_DOC_LANGUAGE))).toEqual(new Set(['en']));
  });
});

describe('legal hygiene helpers', () => {
  it('strips the frontmatter and nothing else', () => {
    expect(legalBody('---\nreview_flags: FLAG-1\n---\n# Title\n')).toBe('# Title\n');
    expect(legalBody('# No frontmatter\n')).toBe('# No frontmatter\n');
  });

  it('names every forbidden string and foreign email', () => {
    expect(legalHygieneProblems('clean text, write to legal@numengames.com')).toEqual([]);
    expect(legalHygieneProblems('no address at all')).toEqual([]);
    expect(legalHygieneProblems('DRAFT [PENDING] FLAG-2 gm@numengames.com')).toEqual([
      'forbidden string "FLAG-"',
      'forbidden string "DRAFT"',
      'forbidden string "[PENDING"',
      'forbidden string "gm@numengames.com"',
      'foreign email gm@numengames.com',
    ]);
    expect(legalHygieneProblems('someone@example.org')).toEqual([
      'foreign email someone@example.org',
    ]);
  });
});
