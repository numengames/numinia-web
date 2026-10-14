/**
 * «Saldo»: one account's statement — balance, usage per day (or per month
 * for 12 months), the last lines of the ledger and, for an organization,
 * its members. `?cuenta=<account id>&rango=7d|30d|12m`. Any signed-in
 * wallet may ask; the till answers only a member of the account (403
 * otherwise). See ./index.ts for the trust model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionWallet } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerStatement } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerStatement(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionWallet(cookies.get(SESSION_COOKIE)?.value),
    url,
  );
