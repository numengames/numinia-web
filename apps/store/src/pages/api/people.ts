/**
 * The people of a community's organization (STD-053 PRS-004): a member of
 * it is shown the groups, anyone else — no session, or a stranger to it —
 * only how many. `?comunidad=<id>`; the organization is the one the
 * community's file links (`team`), never one the browser names. See
 * ./saldo/index.ts for the trust model of the till's desk.
 */

import type { APIRoute } from 'astro';
import { REGISTER } from '../../components/communities/register';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionWallet } from '../../lib/auth/session-wallet';
import { accountsFrom, answerPeople } from '../../lib/accounts-source';
import { teamOf } from '../../lib/communities';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerPeople(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionWallet(cookies.get(SESSION_COOKIE)?.value),
    teamOf(REGISTER, url.searchParams.get('comunidad')),
  );
