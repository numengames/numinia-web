/**
 * «Hazla tuya» for real (cut G, 2026-10-17): the signed-in person asks for a
 * community of the register. POST `{ community, kind: 'claim' | 'join',
 * note? }` answers `{ ok: true, request }`; asking twice finds the first
 * open one. GET `?comunidad=<id>` (or none) answers the person's own
 * requests, newest first. 401 with no session; see lib/community-requests.ts.
 */

import type { APIRoute } from 'astro';
import { REGISTER } from '../../components/communities/register';
import { accountsFrom } from '../../lib/accounts-source';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionAsker } from '../../lib/auth/session-wallet';
import { answerMyRequests, answerRequestCommunity } from '../../lib/community-requests';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, like Saldo's: CI and screenshots read the fixture desk.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerRequestCommunity(
    desk(),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    REGISTER,
    request,
  );

export const GET: APIRoute = async ({ cookies, url }) =>
  answerMyRequests(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), url);
