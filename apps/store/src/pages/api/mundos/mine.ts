/**
 * «Tus mundos» (cut I): how many worlds your communities have, and which —
 * what the rail's counter reads once a session is in. GET answers
 * `{ ok: true, count, communities: [{ accountId, name, worldIds }] }` for the
 * session's wallet (our own signed cookie, never the request); 401 without a
 * session, 503 without a till, 502 when it could not be read. See
 * lib/my-worlds.ts for the rules.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { answerMyWorlds } from '../../../lib/my-worlds';
import { desk } from './_fleet';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) =>
  answerMyWorlds(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value));
