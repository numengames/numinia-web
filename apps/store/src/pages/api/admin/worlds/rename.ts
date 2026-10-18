/**
 * Card t_a856c570 (2026-10-18): the house renames an existing world (or
 * server) from the Lab's admin UI; the new name overrides the world's own
 * title and persists past a reload.
 *
 * POST, JSON `{ worldId, name }` (name 1 to 80 characters, trimmed), answers
 * `{ worldId, name }`. An Oracle's session alone is answered (403 for every
 * other session before the body is read); 400 for a body out of shape; no
 * till, or an older one → 503; a till that fails → 502.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../../lib/auth/server';
import { sessionAsker } from '../../../../lib/auth/session-wallet';
import { runtimeBinding } from '../../../../lib/runtime-env';
import { answerRename } from '../../../../lib/worlds-homes';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerRename(desk(), await sessionAsker(cookies.get(SESSION_COOKIE)?.value), request);
