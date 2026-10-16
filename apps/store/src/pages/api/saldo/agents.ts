/**
 * «IAs de organización»: the AIs an organization sends into its worlds, as the
 * community panel's «Agentes» piece reads and changes them. GET `?cuenta=`
 * lists them (a member, or the house); POST creates one, PATCH switches it,
 * puts it to sleep or gives and takes its roles, DELETE `?cuenta=&agente=`
 * removes it. The till decides who may and writes the organization's log.
 * See lib/agents-source.ts for the exact bodies and ./index.ts for the trust
 * model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { accountsFrom } from '../../../lib/accounts-source';
import { answerAgentWrite, answerAgents } from '../../../lib/agents-source';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ cookies, url }) =>
  answerAgents(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), url);

const write: APIRoute = async ({ cookies, request }) =>
  answerAgentWrite(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), request);

export const POST = write;
export const PATCH = write;
export const DELETE = write;
