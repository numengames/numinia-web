/**
 * The rotation lever (MISSION-027): old sessions survive the overlap, new
 * ones sign fresh, and only a signature miss earns a second opinion.
 */

import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  verifySessionTokenWithRotation,
  type SessionPayload,
} from '../src/index.js';

const CURRENT = 'c'.repeat(40);
const PREVIOUS = 'p'.repeat(40);
const NOW = (): number => 1_000;

function payload(exp: number): SessionPayload {
  return { sub: '0x' + 'a'.repeat(40), rank: 'citizen', iat: 0, exp };
}

describe('verifySessionTokenWithRotation', () => {
  it('accepts a current-secret session without touching the previous', async () => {
    const token = await createSessionToken(payload(2_000), CURRENT);
    const result = await verifySessionTokenWithRotation(token, CURRENT, PREVIOUS, NOW);
    expect(result.valid).toBe(true);
  });

  it('accepts a previous-secret session during the overlap', async () => {
    const token = await createSessionToken(payload(2_000), PREVIOUS);
    const result = await verifySessionTokenWithRotation(token, CURRENT, PREVIOUS, NOW);
    expect(result.valid).toBe(true);
  });

  it('rejects a previous-secret session once the grace ends', async () => {
    const token = await createSessionToken(payload(2_000), PREVIOUS);
    const result = await verifySessionTokenWithRotation(token, CURRENT, undefined, NOW);
    expect(result).toEqual({ valid: false, reason: 'signature' });
  });

  it('an expired current-secret session stays expired — no second opinion', async () => {
    const token = await createSessionToken(payload(500), CURRENT);
    const result = await verifySessionTokenWithRotation(token, CURRENT, PREVIOUS, NOW);
    expect(result).toEqual({ valid: false, reason: 'expired' });
  });

  it('an expired previous-secret session is expired, not merely unsigned', async () => {
    const token = await createSessionToken(payload(500), PREVIOUS);
    const result = await verifySessionTokenWithRotation(token, CURRENT, PREVIOUS, NOW);
    expect(result).toEqual({ valid: false, reason: 'expired' });
  });

  it('garbage structure never consults the previous secret', async () => {
    const result = await verifySessionTokenWithRotation('v1.a', CURRENT, PREVIOUS, NOW);
    expect(result).toEqual({ valid: false, reason: 'structure' });
  });

  it('a token signed with a THIRD secret fails against both', async () => {
    const token = await createSessionToken(payload(2_000), 'x'.repeat(40));
    const result = await verifySessionTokenWithRotation(token, CURRENT, PREVIOUS, NOW);
    expect(result).toEqual({ valid: false, reason: 'signature' });
  });
});
