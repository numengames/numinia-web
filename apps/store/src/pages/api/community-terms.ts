/**
 * «Normas de la comunidad» in public (condiciones/w3): GET `?comunidad=<id>`
 * answers the version in force and the history of a public community's terms,
 * as JSON, with no session and no author. See lib/public-terms.ts for the
 * shape — the page of the community, world-copying (w4) and the AIs read it.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES } from '../../components/communities/register';
import { accountsFrom } from '../../lib/accounts-source';
import { answerPublicTerms } from '../../lib/public-terms';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

const PUBLIC = new Set(COMMUNITIES.map((community) => community.id));

export const GET: APIRoute = ({ url }) =>
  answerPublicTerms(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    url,
    (id) => PUBLIC.has(id),
  );
