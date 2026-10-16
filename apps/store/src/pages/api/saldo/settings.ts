/**
 * «Ajustes de la comunidad»: an organization's panel settings. GET
 * `?cuenta=<account id>` reads which pieces are off and the preset of the
 * words (a member, or the house); POST `{ accountId, off?, vocabulary? }`
 * changes them (whoever may manage the organization; the till decides and
 * writes the log). See ./index.ts for the trust model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerChangeSettings, answerSettings } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerSettings(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    url,
  );

export const POST: APIRoute = async ({ cookies, request }) =>
  answerChangeSettings(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    request,
  );
