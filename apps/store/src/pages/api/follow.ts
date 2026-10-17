/**
 * «Seguir» for real (cut «Seguir»): GET answers the communities the
 * session's wallet follows and how many follow the ids asked (`?ids=a,b`);
 * POST `{ communityId, on }` says «sigo» or «ya no sigo». Any signed-in
 * person; 401 without a session. See ../saldo/index.ts for the trust model
 * and lib/follows.ts for the rules.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES } from '../../components/communities/register';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionAsker } from '../../lib/auth/session-wallet';
import { answerFollowChange, answerFollows, followsFrom } from '../../lib/follows';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

const KNOWN: ReadonlySet<string> = new Set(COMMUNITIES.map((community) => community.id));

const desk = (): ReturnType<typeof followsFrom> =>
  followsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies, url }) =>
  answerFollows(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), url, KNOWN);

export const POST: APIRoute = async ({ cookies, request }) =>
  answerFollowChange(
    desk(),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    request,
    KNOWN,
  );
