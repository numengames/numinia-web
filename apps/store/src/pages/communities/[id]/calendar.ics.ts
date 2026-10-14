/**
 * One community's calendar as an iCalendar feed: its rituals, upcoming and
 * held, so a member's calendar keeps the chronicle's dates too.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES, RITUALS } from '../../../components/communities/register';
import { icsFeed, ritualsOf } from '../../../lib/communities';
import { env } from '../../../lib/env';

export function getStaticPaths() {
  return COMMUNITIES.map((community) => ({ params: { id: community.id }, props: { community } }));
}

export const GET: APIRoute = ({ props }) => {
  const { community } = props as { community: (typeof COMMUNITIES)[number] };
  return new Response(
    icsFeed(ritualsOf(community.id, RITUALS), COMMUNITIES, {
      name: `${community.name} · Numinia`,
      site: env.publicSiteUrl.replace(/\/$/, ''),
      locale: 'en',
      stamp: Date.now(),
    }),
    { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } },
  );
};
