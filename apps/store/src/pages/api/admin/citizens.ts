/**
 * «Quién ha entrado» (cut «El censo», 2026-10-16): everyone who has signed
 * in to numinia.com, for the house to add to an organization. An Oracle's
 * session (the house, STD-051 ORG-007) alone is answered: the house is read
 * from our own signed cookie (lib/auth/session-wallet.ts `sessionAsker`),
 * never from a query, a body or a header — any other session, or none, gets
 * 403 (STD-053: «Only fellow members see who it is»).
 *
 * GET ?q=<a piece of wallet or name>&cursor=<the next page's> answers `{ ok,
 * people: [{ wallet, firstSeenAt, lastSeenAt, name, face, organizations }],
 * total, next }`, newest last time first, 200 at a time; a face is the baked
 * thumbnail's path, never the avatar's id. No till, or a till older than
 * the census → 503 `not-bound`; a till that fails → 502. Private, never
 * stored. The trust model is lib/accounts-source.ts's.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerCitizens } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, like Saldo's: CI and screenshots read the fixture desk.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies, url }) =>
  answerCitizens(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), url);
