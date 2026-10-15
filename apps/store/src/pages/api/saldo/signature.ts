/**
 * «Saldo»: the lines a wallet signs before an organization gives
 * «Administrador» or «Gestionar roles» (STD-051, ORG-008). POST (JSON only)
 * with the act exactly as POST /api/saldo will receive it, and
 * `?locale=<page's language>&chain=<the wallet's chain, optional>`; the
 * answer is `{ sign: { message, token, expiresAt } }`. The session is read
 * from our own signed cookie, the desk is only read (never written), and
 * only an act that gives what asks for a signature gets one
 * (lib/accounts-source.ts `answerSignature`, lib/fresh-signature.ts).
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE, freshSignatureDeps } from '../../../lib/auth/server';
import { sessionWallet } from '../../../lib/auth/session-wallet';
import { accountsFrom, answerSignature } from '../../../lib/accounts-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, as in ./index.ts: CI and screenshots read the fixture.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerSignature(
    desk(),
    await sessionWallet(cookies.get(SESSION_COOKIE)?.value),
    request,
    freshSignatureDeps(),
  );
