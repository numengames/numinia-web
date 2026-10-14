/**
 * «Saldo»: your account and your organizations' (the till's AccountDesk).
 * Any signed-in wallet may ask — the session is read from our own signed
 * cookie, never from a header or a query the caller controls — and the till
 * decides what that wallet may see or do (membership). No session → 401.
 *
 * GET answers the accounts this wallet sees, personal first. POST (JSON
 * only) runs one action: `topup`, `confirm`, `create-team`, `rename`,
 * `set-member`, `remove-member`. The desk is reached only through the
 * service binding TILL_ACCOUNTS (lib/accounts-source.ts holds the trust
 * model); under DATA_SOURCE=fixture it is the in-memory fixture desk. No
 * desk → 503 `not-bound`; a desk that fails → 502 `till-failed`.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionWallet } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerAction, answerOverview } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, like the Summa's own switch: CI and screenshots read the fixture.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies }) =>
  answerOverview(desk(), await sessionWallet(cookies.get(SESSION_COOKIE)?.value));

export const POST: APIRoute = async ({ cookies, request }) =>
  answerAction(desk(), await sessionWallet(cookies.get(SESSION_COOKIE)?.value), request);
