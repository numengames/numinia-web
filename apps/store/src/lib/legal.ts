/**
 * Legal corpus facts (MIS-086) — pure helpers shared by the legal pages, the
 * consent banner and the login endpoint.
 *
 * The published texts are VERBATIM copies of the numinia-nwos masters
 * (`operations/legal/`): the archive is the source of truth, this repo only
 * displays it (FLAG-1 of the privacy master). Never edit the copies under
 * src/content/legal/ — re-copy them and bump the version below.
 */

export type LegalDoc = 'privacy' | 'cookies' | 'terms' | 'legal-notice';

export const LEGAL_DOCS: readonly LegalDoc[] = ['privacy', 'cookies', 'terms', 'legal-notice'];

/** Docs served from the real corpus. The rest are still Oracle drafts. */
export type PublishedLegalDoc = 'terms' | 'privacy';

export const PUBLISHED_LEGAL_DOCS: readonly PublishedLegalDoc[] = ['terms', 'privacy'];

export type DraftLegalDoc = Exclude<LegalDoc, PublishedLegalDoc>;

export function isPublishedLegalDoc(doc: LegalDoc): doc is PublishedLegalDoc {
  return (PUBLISHED_LEGAL_DOCS as readonly LegalDoc[]).includes(doc);
}

/**
 * Authored language of each master. The corpus is monolingual again since
 * 2026-08-27: privacy joined the T&C in English when the Oracle resolved
 * FLAG-5 (MIS-116) and declared English the master language — C-005 §5
 * requires enforceable artifacts in English. The mapping stays because the
 * page still discloses the authored language to readers of other locales.
 */
export const LEGAL_DOC_LANGUAGE: Readonly<Record<PublishedLegalDoc, 'en' | 'es'>> = {
  terms: 'en',
  privacy: 'en',
};

/** Master versions, pinned. Kept in sync with the copies by a unit test. */
export const LEGAL_DOC_VERSION: Readonly<Record<PublishedLegalDoc, string>> = {
  terms: '1.0.0',
  privacy: '2.0.0',
};

/**
 * What a citizen accepts at login: the corpus as a whole, identified by both
 * master versions. Refreshing either copy changes this string, and every
 * acceptance recorded against the old one stops counting.
 */
export const LEGAL_CORPUS_VERSION = `terms@${LEGAL_DOC_VERSION.terms}+privacy@${LEGAL_DOC_VERSION.privacy}`;

/** Fail closed: only the exact current corpus counts as an acceptance. */
export function isCurrentLegalAcceptance(value: unknown): boolean {
  return typeof value === 'string' && value === LEGAL_CORPUS_VERSION;
}
