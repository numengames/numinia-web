/**
 * Graceful secret rotation (MISSION-027) — the global revocation lever.
 * Rotating AUTH_SESSION_SECRET invalidates every session at once; with a
 * PREVIOUS secret accepted during the overlap, rotation stops being an
 * outage: new sessions sign with the current secret, old ones stay valid
 * until their own TTL, and dropping the previous secret ends the grace.
 * Only a SIGNATURE miss consults the previous secret — expiry, structure
 * and payload verdicts never get a second opinion.
 */

import { verifySessionToken, type VerifyResult } from './session.js';

export async function verifySessionTokenWithRotation(
  token: string,
  currentSecret: string,
  previousSecret: string | undefined,
  now: () => number,
): Promise<VerifyResult> {
  const primary = await verifySessionToken(token, currentSecret, now);
  if (primary.valid || primary.reason !== 'signature' || previousSecret === undefined) {
    return primary;
  }
  return verifySessionToken(token, previousSecret, now);
}
