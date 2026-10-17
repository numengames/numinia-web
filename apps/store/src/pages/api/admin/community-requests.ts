/**
 * «Hazla tuya» for real (cut G, 2026-10-17): the open requests of a
 * community, GET `?comunidad=<id>`, to the house or an administrator of its
 * organization; with no `comunidad`, every open one of the register, to the
 * house alone. Answers `{ ok: true, requests: [...] }`, each with what the
 * asker published. 403 for anyone else; see lib/community-requests.ts.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { answerCommunityRequests } from '../../../lib/community-requests';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) =>
  answerCommunityRequests(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    url,
  );
