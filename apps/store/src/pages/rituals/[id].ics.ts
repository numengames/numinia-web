/**
 * One ritual as an iCalendar file: the "Add to your calendar" link on its
 * page. Same writer as the feeds, one event. On demand since cut M: a file
 * of the register by its slug, an encounter of the till by its `rit_` id.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES, RITUALS } from '../../components/communities/register';
import { accountsFrom } from '../../lib/accounts-source';
import { icsFeed, pick, type Ritual } from '../../lib/communities';
import { env } from '../../lib/env';
import { isTillRitualId, ritualFromTill, tillRitual } from '../../lib/rituals-till';
import { runtimeBinding } from '../../lib/runtime-env';

export const prerender = false;

async function ritualById(id: string): Promise<Ritual | undefined> {
  if (!isTillRitualId(id)) return RITUALS.find((ritual) => ritual.id === id);
  const desk = accountsFrom({
    binding: runtimeBinding('TILL_ACCOUNTS'),
    dataSource: process.env.DATA_SOURCE,
  });
  const row = await tillRitual(desk, id);
  const community = row === null ? undefined : COMMUNITIES.find((c) => c.id === row.communityId);
  if (row === null || community === undefined || row.cancelledAt !== null) return undefined;
  return ritualFromTill(row, community.name, Date.now());
}

export const GET: APIRoute = async ({ params }) => {
  const ritual = await ritualById(params.id ?? '');
  if (ritual === undefined) return new Response(null, { status: 404 });
  return new Response(
    icsFeed([ritual], COMMUNITIES, {
      name: `${pick(ritual.title, 'en')} · Numinia`,
      site: env.publicSiteUrl.replace(/\/$/, ''),
      locale: 'en',
      stamp: Date.now(),
    }),
    { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } },
  );
};
