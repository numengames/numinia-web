/**
 * «Me apunto» for real (cut «Tu agenda»): GET answers the encounters the
 * session's wallet is going to and how many are going to the ids asked
 * (`?ids=a,b`); POST `{ ritualId, on }` says «voy» or «ya no voy». Any
 * signed-in person; 401 without a session. See ../saldo/index.ts for the
 * trust model and lib/rsvp-source.ts for the rules.
 */

import type { APIRoute } from 'astro';
import { RITUALS } from '../../components/communities/register';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionAsker } from '../../lib/auth/session-wallet';
import { answerRsvpChange, answerRsvps, rsvpsFrom } from '../../lib/rsvp-source';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

const KNOWN: ReadonlySet<string> = new Set(RITUALS.map((ritual) => ritual.id));

const desk = (): ReturnType<typeof rsvpsFrom> =>
  rsvpsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies, url }) =>
  answerRsvps(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), url, KNOWN);

export const POST: APIRoute = async ({ cookies, request }) =>
  answerRsvpChange(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), request, KNOWN);
