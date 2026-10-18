/**
 * The city's calendar as a live iCalendar feed (cut O, 2026-10-18): the
 * upcoming encounters of the register's files AND the ones published from
 * the city into the till (cut M), which the static /calendar.ics cannot
 * carry — it is written at build. On demand, cached a minute like
 * /api/rituals; a till that is not there leaves the files alone, so the
 * feed is never emptier than the static one. Texts in English (the file's
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
  const now = Date.now();
  const rows = await tillRituals(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    null,
    true,
  );
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
