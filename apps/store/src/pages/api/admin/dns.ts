/**
 * The Worlds room's DNS (ADR-069): a world's address written by the fleet
 * itself, so a world on any machine but the first needs no record made by
 * hand in Cloudflare. Gated on the REAL session — the rank read from our own
 * signed token and checked against the permission ladder — like the room's
 * GET: only Oracles hold `manage-worlds`; anyone else gets 403.
 *
 * GET ?domain=&machine= says who answers for an address (nobody: the
 * wildcard; the fleet's own record; one made by hand) and where the machine
 * is. POST {action, domain, machine} points the address at the machine
 * (`point`, an A record, DNS only) or deletes the fleet's record of it
 * (`release`). Both go to the till's DNS desk through the service binding
 * TILL_DNS (lib/dns-source.ts holds the trust model); this Worker holds no
 * key. No desk → 503 `not-bound`, and the room falls back to public DNS and
 * the record by hand, as before.
 */

import type { APIRoute } from 'astro';
import { hasPermission, type Rank } from '@numinia/domain';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';
import { answerDnsLook, answerDnsWrite, dnsDeskFrom } from '../../../lib/dns-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

interface Session {
  readonly wallet: string;
  readonly rank: Rank;
}

async function oracle(token: string | undefined): Promise<Session | null> {
  if (!authConfigured() || !token) return null;
  const result = await verifySession(token);
  if (!result.valid) return null;
  const session = { wallet: result.payload.sub, rank: result.payload.rank };
  return hasPermission(session.rank, 'manage-worlds') ? session : null;
}

const forbidden = (): Response => Response.json({ error: 'Forbidden' }, { status: 403 });

// DATA_SOURCE is frozen at build, like the Summa's own switch: CI and screenshots read the fixture.
const desk = () =>
  dnsDeskFrom({ binding: runtimeBinding('TILL_DNS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies, url }) => {
  const session = await oracle(cookies.get(SESSION_COOKIE)?.value);
  if (session === null) return forbidden();
  return answerDnsLook(desk(), url);
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await oracle(cookies.get(SESSION_COOKIE)?.value);
  if (session === null) return forbidden();
  return answerDnsWrite(desk(), request, session.wallet);
};
