/**
 * The heartbeat (MIS-266, STD-053 PRS-001): a page in view with a session
 * POSTs `{ "active": boolean }` once a minute. Members only; the answer is
 * `{ "state" }` as the others read it. See lib/presence-source.ts.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionAsker } from '../../lib/auth/session-wallet';
import { accountsFrom } from '../../lib/accounts-source';
import { plazaFrom, answerBeat } from '../../lib/presence-source';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) =>
  answerBeat(
    plazaFrom({ binding: runtimeBinding('PLAZA'), dataSource: process.env.DATA_SOURCE }),
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    request,
  );
