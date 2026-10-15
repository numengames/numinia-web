/**
 * Who is asking the till's desk (QA 2026-10-15, «la casa entra»): the
 * session's wallet and whether it is the house's staff — an Oracle, and only
 * an Oracle. It is read once per request from our own signed cookie. These
 * tests run the real session code with real tokens: nothing of it is faked,
 * so a rank that slipped into «the house» would turn them red.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RANKS, type Rank } from '@numinia/domain';
import { createSessionToken } from '@numinia/auth';

const SECRET = 'y'.repeat(40);
const ORACLE = '0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26';
const CITIZEN = '0x00000000000000000000000000000000000000FF';
const NOW = Math.floor(Date.now() / 1000);

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('THIRDWEB_SECRET_KEY', 'x'.repeat(40));
  vi.stubEnv('AUTH_SESSION_SECRET', SECRET);
  vi.stubEnv('ADMIN_WALLET_ADDRESSES', ORACLE);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

function tokenOf(
  sub: string,
  rank: Rank,
  over: { iat?: number; exp?: number } = {},
  secret = SECRET,
) {
  return createSessionToken(
    { sub, rank, iat: NOW - 60, exp: NOW + 3_600, terms: 'terms@1.0.0+privacy@1.0.0', ...over },
    secret,
  );
}

async function asker(token: string | undefined) {
  const { sessionAsker } = await import('../auth/session-wallet');
  return sessionAsker(token);
}

describe('the house is the Oracle rank, read from the verified session', () => {
  it('is the house for an Oracle session and for no other rank, whatever the wallet', async () => {
    for (const rank of RANKS) {
      for (const wallet of [ORACLE, CITIZEN]) {
        const who = await asker(await tokenOf(wallet, rank));
        expect(who).toEqual({ wallet: wallet.toLowerCase(), house: rank === 'oracle' });
      }
    }
  });

  it('counts the rank the session was signed with, not the allowlist again: a Nomad session of a listed wallet is no house', async () => {
    expect(await asker(await tokenOf(ORACLE, 'nomad'))).toEqual({
      wallet: ORACLE.toLowerCase(),
      house: false,
    });
    expect(await asker(await tokenOf(ORACLE, 'archon'))).toEqual({
      wallet: ORACLE.toLowerCase(),
      house: false,
    });
  });

  it('lowercases the wallet, as the till wants it', async () => {
    const who = await asker(await tokenOf(ORACLE, 'oracle'));
    expect(who?.wallet).toBe('0x42e62e421bedf2469826879ec1a0574d7d3cca26');
  });
});

describe('no session, no asker — and no house', () => {
  it('answers null for a missing, malformed, forged or expired cookie', async () => {
    expect(await asker(undefined)).toBeNull();
    expect(await asker('')).toBeNull();
    expect(await asker('not-a-token')).toBeNull();
    expect(await asker('v1.e30.e30')).toBeNull();
    // Signed with another secret: an Oracle on paper, nobody for this site.
    expect(await asker(await tokenOf(ORACLE, 'oracle', {}, 'z'.repeat(40)))).toBeNull();
    // Expired a second ago.
    expect(
      await asker(await tokenOf(ORACLE, 'oracle', { iat: NOW - 7_200, exp: NOW - 1 })),
    ).toBeNull();
    // A rank this site does not know, even rightly signed, is refused by the payload’s schema.
    expect(await asker(await tokenOf(ORACLE, 'god' as Rank))).toBeNull();
  });

  it('answers null for every cookie when auth is not configured', async () => {
    const token = await tokenOf(ORACLE, 'oracle');
    vi.resetModules();
    vi.stubEnv('AUTH_SESSION_SECRET', '');
    expect(await asker(token)).toBeNull();
  });
});

describe('the people list asks for the wallet alone', () => {
  it('answers the lowercase wallet of any rank — never a house flag — and null without a session', async () => {
    const { sessionWallet } = await import('../auth/session-wallet');
    expect(await sessionWallet(await tokenOf(ORACLE, 'oracle'))).toBe(ORACLE.toLowerCase());
    expect(await sessionWallet(await tokenOf(CITIZEN, 'nomad'))).toBe(CITIZEN.toLowerCase());
    expect(await sessionWallet(undefined)).toBeNull();
    expect(await sessionWallet('not-a-token')).toBeNull();
  });
});
