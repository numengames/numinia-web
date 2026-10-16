/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16): the worlds of one
 * organization, for its «Sedes». GET ?org=<accountId> answers `{ worlds:
 * [{ worldId, accountId }] }` to a member or owner of that organization and
 * to the house; the till decides from the session's wallet (our own signed
 * cookie, never the request) — 403 for anyone else or no session, 404 for an
 * organization the till does not have, 400 without a well-formed `org`.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { runtimeBinding } from '../../../lib/runtime-env';
import { answerOrgWorlds } from '../../../lib/worlds-homes';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies, url }) =>
  answerOrgWorlds(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), url);
