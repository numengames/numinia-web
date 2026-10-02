/**
 * The cookie notice's record (LEG-003 §3.1 and §4) — pure helpers shared by
 * the notice loader, the metrics bootstrap and the storage-inventory test.
 *
 * The notice is vanilla-cookieconsent. It writes ONE first-party cookie,
 * `numinia_consent`, whose value is URI-encoded JSON carrying the accepted
 * categories and the policy revision. The Terms are NOT accepted here: they
 * are accepted at sign-in (components/auth/LegalConsentGate.tsx, checked by
 * api/auth/login.ts against LEGAL_CORPUS_VERSION).
 *
 * Measurement counts only when the `analytics` category is in that cookie
 * for the CURRENT revision. Raising POLICY_REVISION asks every visitor again.
 */

/** The cookie that records the choice (LEG-003 §3.1, first row). */
export const CONSENT_COOKIE = 'numinia_consent';

/** LEG-003's major version. Raising it asks every visitor again. */
export const POLICY_REVISION = 2;

/** Half a year, as LEG-003 §3.1 says ("6 months"). */
export const CONSENT_DAYS = 182;

/** The one optional category: counting clicks, in memory, on the device. */
export const ANALYTICS_CATEGORY = 'analytics';

/**
 * Every key this site writes itself, as LEG-003 §3.1 names it. A test scans
 * the source and fails when the code stores a key this list (and the
 * policy) does not name. The sign-in widget's own keys (thirdweb:*,
 * walletToken-*…) are written from node_modules; the policy lists them as a
 * family.
 */
export const STORED_KEYS = [
  'numinia_consent',
  'numinia_session',
  'numinia-lang',
  'numinia-modo',
  'numinia-lap-nav',
  'numinia-lap-hidden',
  'numinia-codex-modo',
  'numinia-codex-tam',
  'numinia-codex-marca',
  'numinia-codex-ritmo',
  'numinia-lap-personaje',
] as const;

export interface ConsentRecord {
  readonly revision: number;
  readonly categories: readonly string[];
}

/** Every raw value of the consent cookie in a cookie header/jar, in order. */
function rawConsents(cookieHeader: string): string[] {
  const values: string[] = [];
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === CONSENT_COOKIE) values.push(part.slice(eq + 1).trim());
  }
  return values;
}

/** One raw value read as the notice's record (any revision), or null. */
function parseRecord(raw: string): { revision: unknown; categories: readonly unknown[] } | null {
  let value: unknown;
  try {
    value = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { revision, categories } = value as { revision?: unknown; categories?: unknown };
  if (!Array.isArray(categories)) return null;
  return { revision, categories };
}

/**
 * The visitor's recorded answer for the CURRENT policy revision, or null
 * when there is none (no cookie, the old date-stamped format, a stale
 * revision, garbage). Never throws: a malformed cookie counts as no answer.
 *
 * A returning visitor may carry TWO `numinia_consent` cookies: the retired
 * banner's host-only date stamp and the notice's record on the site's
 * domain; browsers list the older first. The answer is the first VALID
 * record, wherever it sits.
 */
export function parseConsent(cookieHeader: string | null | undefined): ConsentRecord | null {
  if (!cookieHeader) return null;
  for (const raw of rawConsents(cookieHeader)) {
    const record = parseRecord(raw);
    if (record?.revision !== POLICY_REVISION) continue;
    return {
      revision: POLICY_REVISION,
      categories: record.categories.filter((c): c is string => typeof c === 'string'),
    };
  }
  return null;
}

/**
 * True when the jar holds a `numinia_consent` that is not the notice's
 * record — the retired banner's date stamp (host-only, written before
 * v0.60.0) or garbage. The notice loader expires it before reading the jar,
 * because the library itself reads only the first cookie of that name.
 */
export function hasLegacyConsent(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return rawConsents(cookieHeader).some((raw) => parseRecord(raw) === null);
}

/**
 * What the metrics bootstrap does with a cookie jar: count only when
 * Measurement was accepted; `denied` after a rejection; `unknown` (drop
 * everything) while the visitor has not answered.
 */
export function measurementConsent(
  cookieHeader: string | null | undefined,
): 'granted' | 'denied' | 'unknown' {
  const record = parseConsent(cookieHeader);
  if (!record) return 'unknown';
  return record.categories.includes(ANALYTICS_CATEGORY) ? 'granted' : 'denied';
}

/** True while the visitor has not answered the current notice. */
export function needsNotice(cookieHeader: string | null | undefined): boolean {
  return parseConsent(cookieHeader) === null;
}
