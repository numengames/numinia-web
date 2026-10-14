/**
 * The city's calendar as an iCalendar feed: every upcoming ritual of every
 * published community. A reader subscribes once and the rituals follow.
 * Static: written at build, like the pages. Texts in English (the file's
 * own language); the day is the same everywhere.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES, RITUALS } from '../components/communities/register';
import { icsFeed, upcoming } from '../lib/communities';
import { env } from '../lib/env';

export const GET: APIRoute = () =>
  new Response(
    icsFeed(upcoming(RITUALS), COMMUNITIES, {
      name: 'Numinia',
      site: env.publicSiteUrl.replace(/\/$/, ''),
      locale: 'en',
      stamp: Date.now(),
    }),
    { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } },
  );
