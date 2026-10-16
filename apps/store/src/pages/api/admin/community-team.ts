/**
 * «Una comunidad ES una organización» (cut 6, 2026-10-16): the house has the
 * till open a community's account the first time it uses it. POST, JSON
 * `{ community }` (an id of the register), answers `{ ok: true, account: {
 * id, name } }`; asking twice finds the same account. An Oracle's session
 * alone is answered (403 for every other session before the body is read);
 * 404 for a community the register lacks; 400 for a body out of shape; no
 * till or an older one → 503; a till that fails → 502.
 */

import type { APIRoute } from 'astro';
import { REGISTER } from '../../../components/communities/register';
import { accountsFrom } from '../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { answerCommunityTeam } from '../../../lib/community-teams';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, like Saldo's: CI and screenshots read the fixture desk.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerCommunityTeam(
    desk(),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    REGISTER,
    request,
  );
