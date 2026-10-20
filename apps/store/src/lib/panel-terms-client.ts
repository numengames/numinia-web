/**
 * «Normas de vuestros espacios», the browser's side: reading a community's
 * terms and publishing a new version through /api/saldo/terms. Pure but for
 * the `fetch` it is handed (a test hands a double); no zod, so an island may
 * import it. A failed read is `null`; a publication that was refused comes
 * back with the till's problems in words (`path: message`, Spanish) so the
 * screen can put each next to its field, and one that failed says only that.
 */

import { readTermsPage, type TermsPage } from './panel-terms';

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const URL_OF = '/api/saldo/terms';

/** The community's terms, or null when the till did not say. */
export async function loadTerms(fetcher: Fetcher, org: string): Promise<TermsPage | null> {
  try {
    const response = await fetcher(`${URL_OF}?cuenta=${encodeURIComponent(org)}`, {
      headers: { accept: 'application/json' },
    });
    const json: unknown = await response.json().catch(() => null);
    return response.ok ? readTermsPage(json) : null;
  } catch {
    return null;
  }
}

/** A publication: the page with the new version, the till's refusal with its problems, or a failure. */
export type Publication =
  | { readonly at: 'published'; readonly page: TermsPage }
  | { readonly at: 'refused'; readonly problems: readonly string[] }
  | { readonly at: 'failed' };

/** Publishes `{ version, puntos }` as `org`'s next version of the terms. */
export async function publishTerms(
  fetcher: Fetcher,
  org: string,
  draft: { readonly version: string; readonly puntos: unknown },
): Promise<Publication> {
  try {
    const response = await fetcher(URL_OF, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ accountId: org, version: draft.version, puntos: draft.puntos }),
    });
    const json: unknown = await response.json().catch(() => null);
    if (response.ok) {
      const page = readTermsPage(json);
      return page === null ? { at: 'failed' } : { at: 'published', page };
    }
    const problems =
      response.status === 403 && typeof json === 'object' && json !== null
        ? (json as { problems?: unknown }).problems
        : undefined;
    return Array.isArray(problems) && problems.every((line) => typeof line === 'string')
      ? { at: 'refused', problems }
      : { at: 'failed' };
  } catch {
    return { at: 'failed' };
  }
}
