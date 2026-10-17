/**
 * «Crear → Un encuentro» for real (cut M): the person who runs the community
 * (or the house) cancels an encounter of the till. POST `{ ritualId }`
 * answers `{ ok: true, ritual }` with `cancelledAt` set; once. 401 with no
 * session; see lib/rituals-till.ts.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { answerCancelRitual } from '../../../lib/rituals-till';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerCancelRitual(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), request);
