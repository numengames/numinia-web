/**
 * Who asks the till's desk, for the routes that serve ANY signed-in person
 * (no rank needed, «Saldo»): read from our own signed cookie, or null
 * without a valid session — the route answers 401.
 *
 * The asker is the session's wallet, lowercased as the till wants it, and
 * whether the session is the house's (STD-051 ORG-007): during the alpha
 * the house is the Oracles, so the Oracle rank — and no other — that the
 * session was signed with at sign-in (`resolveRank`, which only the
 * ADMIN_WALLET_ADDRESSES allowlist can make an Oracle). It is decided here,
 * once per request, from the verified token; nothing the browser sends
 * (a body, a query, a header) can make it true.
 */

import type { Rank } from '@numinia/domain';
import type { Asker } from '../accounts';
import { isCurrentLegalAcceptance } from '../legal';
import { authConfigured, verifySession } from './server';

/** The rank that is the house's staff while the alpha lasts. */
const HOUSE_RANK: Rank = 'oracle';

export async function sessionAsker(token: string | undefined): Promise<Asker | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  if (!result.valid) return null;
  return {
    wallet: result.payload.sub.toLowerCase(),
    house: result.payload.rank === HOUSE_RANK,
  };
}

/**
 * The session's wallet alone, lowercase, or null without a valid session —
 * for the routes that never act as the house (a community page's people
 * list: a member sees the groups, anyone else only how many, even an Oracle).
 */
export async function sessionWallet(token: string | undefined): Promise<string | null> {
  return (await sessionAsker(token))?.wallet ?? null;
}

/**
 * The legal corpus this session accepted at sign-in (`terms@…+privacy@…`), but only when it is the CURRENT one and the session is
 * valid — otherwise null (condiciones/w5: a world pass says what the person accepted, never more). The login endpoint refuses a
 * session without a current acceptance, so a session older than a text change is the only way to a stale value: it gets nothing.
 */
export async function sessionAcceptedTerms(token: string | undefined): Promise<string | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  if (!result.valid) return null;
  const terms = result.payload.terms;
  return isCurrentLegalAcceptance(terms) ? (terms as string) : null;
}
