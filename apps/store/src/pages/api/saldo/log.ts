/**
 * «Saldo»: an organization's last changes, for whoever may view its log.
 * `?cuenta=<account id>`. Any signed-in wallet may ask; the till answers
 * only a member of the organization (403 otherwise). See ./index.ts for
 * the trust model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionWallet } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerLog } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerLog(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionWallet(cookies.get(SESSION_COOKIE)?.value),
    url,
  );
