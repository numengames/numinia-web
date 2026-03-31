const CONSENT_KEY = 'numinia-cookie-consent';
const COOKIE_POLICY_VERSION = '1.0';

export interface ConsentRecord {
  decision: 'accepted' | 'necessary-only';
  timestamp: string;
  policyVersion: string;
  categories: {
    necessary: true;
    analytics: boolean;
  };
}

export { CONSENT_KEY, COOKIE_POLICY_VERSION };

export function getConsentRecord(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.policyVersion) return null; // Old format ('accepted' string)
    return parsed as ConsentRecord;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getConsentRecord()?.categories.analytics === true;
}

export function isConsentCurrent(): boolean {
  const record = getConsentRecord();
  return record?.policyVersion === COOKIE_POLICY_VERSION;
}

export function saveConsent(decision: 'accepted' | 'necessary-only'): void {
  const record: ConsentRecord = {
    decision,
    timestamp: new Date().toISOString(),
    policyVersion: COOKIE_POLICY_VERSION,
    categories: {
      necessary: true,
      analytics: decision === 'accepted',
    },
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
}
