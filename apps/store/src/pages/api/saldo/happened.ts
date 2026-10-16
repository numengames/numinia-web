/**
 * «Qué ha pasado»: a page of an organization's log as a readable list, 30
 * lines, newest first. `?cuenta=<account id>`, and `&antes=<seq>` for the page
 * after a line. A member of the organization or the house; the till refuses
 * anyone else (403). See ./index.ts for the trust model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerHappened } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerHappened(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    url,
  );
