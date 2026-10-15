/**
 * «Saldo»: an organization's roles and who holds them, as the asking wallet may handle them.
 * `?cuenta=<account id>`. Any signed-in wallet may ask; the till answers
 * only a member of the organization (403 otherwise). See ./index.ts for
 * the trust model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerRoles } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerRoles(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    url,
  );
