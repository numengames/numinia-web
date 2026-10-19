/**
 * «MCP remoto», story W4: POST /api/conectar-ia — the «Permitir» of the
 * «Conecta tu IA» consent page. JSON only, from this site's own pages only
 * (`Origin` must be ours: 403 otherwise, even when absent), with the
 * session from our signed cookie. The request and answer contract, and
 * where the AI's token goes, are in lib/conectar-ia-page.ts.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../lib/accounts-source';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionAsker } from '../../lib/auth/session-wallet';
import { answerConsent } from '../../lib/conectar-ia-page';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

// DATA_SOURCE is frozen at build, like Saldo's: CI and screenshots read the fixture desk.
const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request, url }) =>
  answerConsent(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), request, {
    origin: url.origin,
    requestOrigin: request.headers.get('origin'),
  });
