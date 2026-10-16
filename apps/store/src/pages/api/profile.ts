/**
 * «Tu nombre en la ciudad» (cut «Tu nombre y tu cara», 2026-10-16): the name
 * and Bazar avatar the session's wallet publishes for the people of its
 * organizations (STD-053: «Nobody is shown before choosing», «Only fellow
 * members see who it is»). Any signed-in wallet may ask, for itself only:
 * the wallet is read from our own signed cookie, never from a body, a query
 * or a header — no session → 401.
 *
 * GET answers `{ ok: true, profile: { name, avatar, face } | null }`. POST
 * (JSON only, like POST /api/saldo) takes `{ name, avatar }` — the avatar one
 * of the Bazar's with a baked thumbnail, or null — to publish or replace
 * them, or `{ remove: true }` to stop showing them: the till deletes the
 * row, and no history is kept. The till's refusals are 400 in its words; no
 * till, or a till that does not have this yet → 503 `not-bound`; a till that
 * fails → 502 `till-failed`. The trust model is lib/accounts-source.ts's.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionWallet } from '../../lib/auth/session-wallet';
import { accountsFrom, answerProfile, answerSetProfile } from '../../lib/accounts-source';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, like Saldo's: CI and screenshots read the fixture desk.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies }) =>
  answerProfile(desk(), await sessionWallet(cookies.get(SESSION_COOKIE)?.value));

export const POST: APIRoute = async ({ cookies, request }) =>
  answerSetProfile(desk(), await sessionWallet(cookies.get(SESSION_COOKIE)?.value), request);
