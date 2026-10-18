/**
 * Card t_371c917d (2026-10-18): the house renames a community that has no
 * titular yet, or fills in its summary, from its own page. POST, JSON
 * `{ community, name?, summary? }`. An Oracle's session alone is answered
 * (403 for every other session before the body is read); 400 for a body
 * out of shape; no till, or an older one → 503; a till that fails → 502.
 */

import type { APIRoute } from 'astro';
import { accountsFrom } from '../../../../lib/accounts-source';
import { SESSION_COOKIE } from '../../../../lib/auth/server';
import { sessionAsker } from '../../../../lib/auth/session-wallet';
import { answerEditCommunityFields } from '../../../../lib/community-fields';
import { runtimeBinding } from '../../../../lib/runtime-env';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const POST: APIRoute = async ({ cookies, request }) =>
  answerEditCommunityFields(
    desk(),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    request,
  );
