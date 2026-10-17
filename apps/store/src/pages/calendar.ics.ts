/**
 * The city's calendar as an iCalendar feed: every upcoming ritual of every
 * published community — the register's files and, since cut M, the
 * encounters published from the site (read from the till on demand, so a
 * reader who subscribed once gets them too). Texts in English (the file's
 * own language); the day is the same everywhere.
 */

import type { APIRoute } from 'astro';
import { COMMUNITIES, RITUALS } from '../components/communities/register';
import { accountsFrom } from '../lib/accounts-source';
import { icsFeed, upcoming } from '../lib/communities';
import { env } from '../lib/env';
import { allRituals, tillRituals } from '../lib/rituals-till';
import { runtimeBinding } from '../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async () => {
  const desk = accountsFrom({
    binding: runtimeBinding('TILL_ACCOUNTS'),
    dataSource: process.env.DATA_SOURCE,
  });
  const now = Date.now();
  const rows = await tillRituals(desk, null, true);
  return new Response(
    icsFeed(upcoming(allRituals(RITUALS, rows, COMMUNITIES, now)), COMMUNITIES, {
      name: 'Numinia',
      site: env.publicSiteUrl.replace(/\/$/, ''),
      locale: 'en',
      stamp: now,
    }),
    {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'cache-control': 'public, max-age=60',
      },
    },
  );
};
