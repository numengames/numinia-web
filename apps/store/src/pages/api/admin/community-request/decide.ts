/**
 * «Hazla tuya» for real (cut G, 2026-10-17): the house or an administrator
 * of the community's organization accepts or declines an open request. POST
 * `{ request, accept, community }` answers `{ ok: true, request }` with the
 * request decided; a claim accepted makes the asker the Titular (the house
 * opens the organization first when it is not open), a join accepted makes
 * them a member. 403 for anyone else; see lib/community-requests.ts.
 */

import type { APIRoute } from 'astro';
import { REGISTER } from '../../../../components/communities/register';
import { accountsFrom } from '../../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../../lib/auth/server';
import { sessionAsker } from '../../../../lib/auth/session-wallet';
import { answerDecide } from '../../../../lib/community-requests';
import { runtimeBinding } from '../../../../lib/runtime-env';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) =>
  answerDecide(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    REGISTER,
    request,
  );
