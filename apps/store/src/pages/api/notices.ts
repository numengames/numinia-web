/**
 * «Avisos» (cut J, 2026-10-17): GET /api/notices answers, to the signed-in
 * person alone, what concerns them — the encounters they are going to that
 * start soon, who is inside the homes of their communities, the requests
 * they decide, the answers to their own — newest first, each with when in
 * words, and `unseen`: how many are newer than `?since=<ISO>` (the moment
 * the browser last saw; the bell's dot, never a number). `?locale=` picks
 * the words (es by default). 401 signed out; private, never stored. A
 * source that fails is skipped (lib/notices-source.ts). Under
 * DATA_SOURCE=fixture the list is the fixture's, one of every kind.
 */

import type { APIRoute } from 'astro';
import { AGORA_PLAZA, isSupportedLocale, type SupportedLocale } from '@numinia/domain';
import { REGISTER, RITUALS } from '../../components/communities/register';
import { NOTIFICATIONS_UI } from '../../i18n/notifications';
import { accountsFrom } from '../../lib/accounts-source';
import { SESSION_COOKIE } from '../../lib/auth/server';
import { sessionAsker } from '../../lib/auth/session-wallet';
import { communityOfAccount } from '../../lib/community-accounts';
import { fixtureNotices } from '../../lib/notices';
import { gatherNotices, presentNotices, type NoticePorts } from '../../lib/notices-source';
import { rsvpsFrom } from '../../lib/rsvp-source';
import { runtimeBinding } from '../../lib/runtime-env';
import { logEvent } from '../../lib/telemetry';

export const prerender = false;

const HEADERS = { 'content-type': 'application/json', 'cache-control': 'private, no-store' };

const localeOf = (url: URL): SupportedLocale => {
  const raw = url.searchParams.get('locale') ?? 'es';
  return isSupportedLocale(raw) ? raw : 'es';
};

/** Not bound (no till): the source answers nothing, and the gather skips it. */
const unbound = async (): Promise<never> => {
  throw new Error('not bound');
};

export const GET: APIRoute = async ({ cookies, url }) => {
  const asker = await sessionAsker(cookies.get(SESSION_COOKIE)?.value);
  if (asker === null) {
    return new Response(JSON.stringify({ error: 'sign-in' }), { status: 401, headers: HEADERS });
  }
  const locale = localeOf(url);
  const words = NOTIFICATIONS_UI[locale].words;
  const since = url.searchParams.get('since');
  const now = new Date();
  if (process.env.DATA_SOURCE === 'fixture') {
    const body = presentNotices(fixtureNotices(locale, now, words, REGISTER), since, now, locale);
    return new Response(JSON.stringify(body), { headers: HEADERS });
  }
  const binding = runtimeBinding('TILL_ACCOUNTS');
  const desk = accountsFrom({ binding, dataSource: process.env.DATA_SOURCE });
  const rsvps = rsvpsFrom({ binding, dataSource: process.env.DATA_SOURCE });
  const ports: NoticePorts = {
    myRsvps: rsvps === null ? unbound : (wallet) => rsvps.myRsvps(wallet),
    overview: desk === null ? unbound : (wallet) => desk.overview(wallet),
    communityRequests:
      desk === null ? unbound : (wallet, house, id) => desk.communityRequests(wallet, house, id),
    myCommunityRequests: desk === null ? unbound : (wallet) => desk.myCommunityRequests(wallet),
    inside: () => fetch(new URL('/api/live', url.origin)).then((response) => response.json()),
  };
  const register = {
    communities: REGISTER,
    rituals: RITUALS,
    accountToCommunity: await communityOfAccount(REGISTER),
    commons: { href: AGORA_PLAZA.worldUrl, name: AGORA_PLAZA.name[locale] },
  };
  const notices = await gatherNotices(ports, asker, register, locale, words, now, logEvent);
  return new Response(JSON.stringify(presentNotices(notices, since, now, locale)), {
    headers: HEADERS,
  });
};
