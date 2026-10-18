/**
 * The generated CSP hash list (security hardening, 2026-10-18):
 * scripts/generate-csp-hashes.mjs writes this file from every `is:inline`
 * script body in the app. A sanity check here catches a corrupted or
 * accidentally-emptied run before it ships (an empty list would silently
 * fall back to blocking every inline script, breaking the sistema-modo
 * bootstrap and the cookie/telemetry scripts on every page).
 */
import { describe, expect, it } from 'vitest';
import { INLINE_SCRIPT_HASHES } from '../csp-hashes.generated';

describe('INLINE_SCRIPT_HASHES', () => {
  it('is a non-empty list of CSP sha256 source expressions', () => {
    expect(INLINE_SCRIPT_HASHES.length).toBeGreaterThan(0);
    for (const entry of INLINE_SCRIPT_HASHES) {
      expect(entry).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(INLINE_SCRIPT_HASHES).size).toBe(INLINE_SCRIPT_HASHES.length);
  });
});
