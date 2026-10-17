/**
 * «Crear → Un encuentro» for real (cut M): the encounters published from the
 * site, for the static pages to fetch into their live slot. GET
 * `?upcoming=1&comunidad=a,b` answers `{ ok: true, rituals }`, each row with
 * its community's name. Public, cached a minute; see lib/rituals-till.ts.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES } from '../../components/communities/register';
import { accountsFrom } from '../../lib/accounts-source';
import { answerRituals } from '../../lib/rituals-till';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

const desk = () =>
  accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE });

export const GET: APIRoute = async ({ url }) => answerRituals(desk(), COMMUNITIES, url);
