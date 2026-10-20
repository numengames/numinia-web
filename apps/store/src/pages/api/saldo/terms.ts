/**
 * «Normas de vuestros espacios»: the terms a community writes for its worlds.
 * GET `?cuenta=<account id>` reads the version in force and the history (a
 * member, or the house); POST `{ accountId, version, puntos }` publishes a
 * new version (only whoever holds `administrator`: the till decides, so a
 * request that is not an administrator's is refused here too). See
 * ./index.ts for the trust model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerPublishTerms, answerTerms } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerTerms(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    url,
  );

export const POST: APIRoute = async ({ cookies, request }) =>
  answerPublishTerms(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    request,
  );
