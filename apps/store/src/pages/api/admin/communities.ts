/**
 * «Una comunidad ES una organización» (cut 6, 2026-10-16): the register's
 * communities, for the house to list in its dialogs («Asignar a una
 * organización», «Añadir a una organización»). An Oracle's session alone is
 * answered — the house is read from our own signed cookie
 * (lib/auth/session-wallet.ts `sessionAsker`), never from a query, a body or
 * a header; any other session, or none, gets 403.
 *
 * GET answers `{ communities: [{ id, name, team, account }] }`. Private,
 * never stored. The answers are lib/community-teams.ts's.
 */

import type { APIRoute } from 'astro';
import { REGISTER } from '../../../components/communities/register';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { answerCommunities } from '../../../lib/community-teams';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) =>
  answerCommunities(REGISTER, await sessionAsker(cookies.get(SESSION_COOKIE)?.value));
