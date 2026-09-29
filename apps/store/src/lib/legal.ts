/**
 * Legal corpus facts — pure helpers shared by the legal pages and the login
 * endpoint.
 *
 * The four published texts are VERBATIM copies of the numinia-archive
 * masters (`legal/LEG-001…LEG-004`): the archive is the source of truth,
 * this repo only displays them. Never edit the copies under
 * src/content/legal/ — re-copy them and bump the versions below (a unit
 * test pins each one to its copy's frontmatter).
 */

export type LegalDoc = 'notice' | 'privacy' | 'cookies' | 'terms';

/** Footer order: Legal notice · Privacy · Cookies · Terms. */
export const LEGAL_DOCS: readonly LegalDoc[] = ['notice', 'privacy', 'cookies', 'terms'];

/**
 * Route slug of each document. The legal notice keeps its historical
 * `/legal/legal-notice/` address; `/legal/notice/` (the slug the other
 * three sites use) redirects to it.
 */
export const LEGAL_DOC_SLUG: Readonly<Record<LegalDoc, string>> = {
  notice: 'legal-notice',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
};

/** The document behind a route slug, or undefined for an unknown one. */
export function legalDocForSlug(slug: string | undefined): LegalDoc | undefined {
  return LEGAL_DOCS.find((doc) => LEGAL_DOC_SLUG[doc] === slug);
}

/** Authored language of each master: English, the archive's master language. */
export const LEGAL_DOC_LANGUAGE: Readonly<Record<LegalDoc, 'en'>> = {
  notice: 'en',
  privacy: 'en',
  cookies: 'en',
  terms: 'en',
};

/** Master versions, pinned. Kept in sync with the copies by a unit test. */
export const LEGAL_DOC_VERSION: Readonly<Record<LegalDoc, string>> = {
  notice: '0.2.0',
  privacy: '2.1.0',
  cookies: '2.1.0',
  terms: '1.0.1',
};

/**
 * What a citizen accepts at sign-in: the Terms and the Privacy Policy,
 * identified by both master versions. Refreshing either copy changes this
 * string, and every acceptance recorded against the old one stops counting
 * — the citizen is asked again at the next sign-in.
 */
export const LEGAL_CORPUS_VERSION = `terms@${LEGAL_DOC_VERSION.terms}+privacy@${LEGAL_DOC_VERSION.privacy}`;

/** Fail closed: only the exact current corpus counts as an acceptance. */
export function isCurrentLegalAcceptance(value: unknown): boolean {
  return typeof value === 'string' && value === LEGAL_CORPUS_VERSION;
}

/**
 * Strings that must never reach a visitor on a legal page: review
 * machinery from the masters' frontmatter, draft markers, the retired scope
 * note and facts the masters no longer publish.
 */
export const LEGAL_FORBIDDEN_STRINGS: readonly string[] = [
  'FLAG-',
  'frontmatter',
  'Audience: Oracle',
  'DRAFT',
  '[PENDING',
  'scope is under review',
  'cuota de socio',
  'startupvalencia',
  'gm@numengames.com',
];

/** The only email address a legal text may print. */
export const LEGAL_EMAIL = 'legal@numengames.com';

/** The Markdown body of a copied master: everything after its frontmatter. */
export function legalBody(raw: string): string {
  const match = /^---\n[\s\S]*?\n---\n/.exec(raw);
  return match ? raw.slice(match[0].length) : raw;
}

/** Every problem the hygiene rules find in a text a visitor will read. */
export function legalHygieneProblems(text: string): string[] {
  const problems = LEGAL_FORBIDDEN_STRINGS.filter((s) => text.includes(s)).map(
    (s) => `forbidden string "${s}"`,
  );
  const emails = new Set(text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []);
  for (const email of emails) {
    if (email !== LEGAL_EMAIL) problems.push(`foreign email ${email}`);
  }
  return problems;
}
