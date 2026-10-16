/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16): where every placed world
 * stands, for the house to read. An Oracle's session alone is answered — the
 * house is read from our own signed cookie (lib/auth/session-wallet.ts
 * `sessionAsker`), never from a query, a body or a header; any other session,
 * or none, gets 403.
 *
 * GET answers `{ homes: [{ worldId, accountId, accountName, placedAt }] }`.
 * No till, or a till older than this cut → 503 `not-bound`; a till that
 * fails → 502. Private, never stored. The trust model is
 * lib/accounts-source.ts's; the answers are lib/worlds-homes.ts's.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../../lib/auth/server';
import { sessionAsker } from '../../../../lib/auth/session-wallet';
import { runtimeBinding } from '../../../../lib/runtime-env';
import { answerHomes } from '../../../../lib/worlds-homes';

export const prerender = false;

// DATA_SOURCE is frozen at build, like Saldo's: CI and screenshots read the fixture desk.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies }) =>
  answerHomes(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value));
