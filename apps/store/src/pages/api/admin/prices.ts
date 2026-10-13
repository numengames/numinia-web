/**
 * The price room (MIS-184): the Oracle's door to the till's tariff. Gated
 * on the REAL session — the rank read from our own signed token and
 * checked against the permission ladder (@numinia/domain), never from a
 * header or a query the caller controls. Only Oracles hold
 * `edit-system-config`; anyone else gets 403 and nothing else (fail closed).
 *
 * GET reads the desk: the tariff's versions, the one in force, the sizes
 * still charged to worlds. POST (JSON only) asks the desk to check a draft,
 * or to schedule it as a new dated version published by the session's
 * wallet. The desk is the till's `OracleDesk`, reached only through the
 * service binding TILL_ORACLE (lib/prices-source.ts holds the trust model);
 * under DATA_SOURCE=fixture it is the in-memory fixture desk. No desk →
 * 503 `not-bound`; a desk that fails → 502 `till-failed`.
 */

import type { APIRoute } from 'astro';
import { hasPermission, type Rank } from '@numinia/domain';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';
import { answerRead, answerWrite, deskFrom } from '../../../lib/prices-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

interface Session {
  readonly wallet: string;
  readonly rank: Rank;
}

async function sessionOf(token: string | undefined): Promise<Session | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  return result.valid ? { wallet: result.payload.sub, rank: result.payload.rank } : null;
}

async function oracle(token: string | undefined): Promise<Session | null> {
  const session = await sessionOf(token);
  return session !== null && hasPermission(session.rank, 'edit-system-config') ? session : null;
}

const forbidden = (): Response => Response.json({ error: 'Forbidden' }, { status: 403 });

// DATA_SOURCE is frozen at build, like the Summa's own switch: CI and screenshots read the fixture.
const desk = () =>
  deskFrom({ binding: runtimeBinding('TILL_ORACLE'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies }) => {
  const session = await oracle(cookies.get(SESSION_COOKIE)?.value);
  if (session === null) return forbidden();
  return answerRead(desk(), session.wallet);
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await oracle(cookies.get(SESSION_COOKIE)?.value);
  if (session === null) return forbidden();
  return answerWrite(desk(), request, session.wallet);
};
