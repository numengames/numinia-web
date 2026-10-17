/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17): the signed-in person
 * publishes an encounter of a community they run. POST `{ communityId,
 * title, start, end?, mode, where, note?, worldId? }` answers `{ ok: true,
 * ritual }`. 401 with no session; see lib/rituals-till.ts.
 */

import type { APIRoute } from 'astro';
import { REGISTER } from '../../../components/communities/register';
import { accountsFrom } from '../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { answerCreateRitual } from '../../../lib/rituals-till';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, like Saldo's: CI and screenshots read the fixture desk.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerCreateRitual(
    desk(),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    REGISTER,
    request,
  );
