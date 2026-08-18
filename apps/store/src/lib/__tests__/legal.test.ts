/**
 * The pinned corpus version must never drift from the copies on disk: a
 * refreshed master with the same LEGAL_CORPUS_VERSION would silently keep
 * every old acceptance valid.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isCurrentLegalAcceptance,
  isPublishedLegalDoc,
  LEGAL_CORPUS_VERSION,
  LEGAL_DOC_LANGUAGE,
  LEGAL_DOC_VERSION,
  PUBLISHED_LEGAL_DOCS,
  type PublishedLegalDoc,
} from '../legal';

function frontmatter(doc: PublishedLegalDoc): Record<string, string> {
  const path = fileURLToPath(new URL(`../../content/legal/${doc}.md`, import.meta.url));
  const raw = readFileSync(path, 'utf8');
  const block = /^---\n([\s\S]*?)\n---/.exec(raw);
  expect(block, `${doc}.md has no frontmatter`).toBeTruthy();
  const fields: Record<string, string> = {};
  for (const line of (block as RegExpExecArray)[1]!.split('\n')) {
    const match = /^([a-z_]+):\s*"?([^"]*)"?$/.exec(line);
    if (match) fields[match[1] as string] = match[2] as string;
  }
  return fields;
}

describe('legal corpus', () => {
  it.each(PUBLISHED_LEGAL_DOCS)('%s is a verbatim copy of an active master', (doc) => {
    const fields = frontmatter(doc);
    expect(fields['type']).toBe('legal');
    expect(fields['status']).toBe('active');
    // Reserved rights: the copy must never inherit an open licence.
    expect(fields['license']).toBe('LicenseRef-Numen-AllRightsReserved');
  });

  it.each(PUBLISHED_LEGAL_DOCS)('%s version matches the pinned one', (doc) => {
    expect(frontmatter(doc)['version']).toBe(LEGAL_DOC_VERSION[doc]);
  });

  it('names both master versions in the acceptance string', () => {
    expect(LEGAL_CORPUS_VERSION).toBe('terms@1.0.0+privacy@1.1.0');
  });

  it('only accepts the exact current corpus', () => {
    expect(isCurrentLegalAcceptance(LEGAL_CORPUS_VERSION)).toBe(true);
    expect(isCurrentLegalAcceptance('terms@0.9.0+privacy@1.1.0')).toBe(false);
    expect(isCurrentLegalAcceptance('')).toBe(false);
    expect(isCurrentLegalAcceptance(true)).toBe(false);
    expect(isCurrentLegalAcceptance(undefined)).toBe(false);
  });

  it('separates published docs from the remaining drafts', () => {
    expect(isPublishedLegalDoc('terms')).toBe(true);
    expect(isPublishedLegalDoc('privacy')).toBe(true);
    expect(isPublishedLegalDoc('cookies')).toBe(false);
    expect(isPublishedLegalDoc('legal-notice')).toBe(false);
  });

  it('declares the language each master is authored in', () => {
    expect(LEGAL_DOC_LANGUAGE).toEqual({ terms: 'en', privacy: 'es' });
  });
});
