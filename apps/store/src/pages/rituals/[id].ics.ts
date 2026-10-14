/**
 * One ritual as an iCalendar file: the "Add to your calendar" link on its
 * page. Same writer as the feeds, one event.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES, RITUALS } from '../../components/communities/register';
import { icsFeed, pick } from '../../lib/communities';
import { env } from '../../lib/env';

export function getStaticPaths() {
  return RITUALS.map((ritual) => ({ params: { id: ritual.id }, props: { ritual } }));
}

export const GET: APIRoute = ({ props }) => {
  const { ritual } = props as { ritual: (typeof RITUALS)[number] };
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
