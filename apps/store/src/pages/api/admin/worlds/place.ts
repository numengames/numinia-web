/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16): the house places worlds in
 * an organization. Pablo: only the house (the Oracles) assigns a world, and
 * the organization that pays for a world is the one that administers it.
 *
 * POST, JSON `{ worldIds: [1 to 50 fleet world ids], accountId }`, answers
 * `{ placed }`. An Oracle's session alone is answered (403 for every other
 * session before the body is read; the flag is the cookie's, never the
 * body's); 404 for an organization the till does not have; 400 for a body out
 * of shape; no till or an older one → 503; a till that fails → 502.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../../lib/auth/server';
import { sessionAsker } from '../../../../lib/auth/session-wallet';
import { runtimeBinding } from '../../../../lib/runtime-env';
import { answerPlace } from '../../../../lib/worlds-homes';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerPlace(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), request);
