/**
 * «Avisos» (cut J, 2026-10-17), the pure part: each source the city already
 * answers — the encounters you said «voy» to, who is inside the homes of
 * your communities, the requests you decide and the answers to your own —
 * turned into one kind of row: a sentence with its subject in bold, a
 * moment, at most two quiet actions. Nothing here fetches or touches the
 * DOM: the route (lib/notices-source.ts) hands the answers in, the page
 * paints what comes out. Every moment is stable for a given source state,
 * so «seen» (the newest `at` kept by the browser) means the same on every
 * read.
 */

import type { DeskCommunityRequest, DeskCommunityRequestEntry } from './accounts';
import { shortWallet } from './accounts';
import { ritualStartMs, type Community, type Ritual } from './communities';
import { isPast } from './agenda';
import { pick } from './communities';
import type { NoticeWords } from '../i18n/notifications';

export type NoticeKind = 'encounter' | 'world' | 'community';

/** An action on a row: a link (the `.ics`, a world's door) or a decision on a request. */
export type NoticeAction =
  | { readonly id: 'calendar' | 'enter'; readonly href: string }
  | { readonly id: 'accept' | 'later'; readonly request: string; readonly community: string };

export interface Notice {
  readonly id: string;
  readonly kind: NoticeKind;
  /** ISO instant the notice is of (newest first on the page). */
  readonly at: string;
  /** The sentence: `before` + <b>subject</b> + `after`. */
  readonly text: { readonly before: string; readonly subject: string; readonly after: string };
  readonly href?: string;
  readonly actions?: readonly NoticeAction[];
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** An encounter is announced this far ahead, and «Entrar» appears this close. */
export const ENCOUNTER_AHEAD_MS = 14 * DAY_MS;
export const ENCOUNTER_SOON_MS = 2 * HOUR_MS;

/** A template with `{subject}` split around it. */
export function parts(template: string, subject: string): Notice['text'] {
  const [before = '', after = ''] = template.split('{subject}');
  return { before, subject, after };
}

const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );

const dayIndex = (ms: number): number => Math.floor(ms / DAY_MS);

/** «hoy» / «mañana» / «en N días», by calendar day (UTC). */
export function startsWhen(startMs: number, now: Date, words: NoticeWords): string {
  const days = dayIndex(startMs) - dayIndex(now.getTime());
  if (days <= 0) return words.today;
  if (days === 1) return words.tomorrow;
  return fill(words.inDays, { n: days });
}

export interface EncounterContext {
  readonly rituals: readonly Ritual[];
  readonly communities: readonly Community[];
  /** The city's commons (the Agora), where a city encounter opens. */
  readonly commons: { readonly href: string; readonly name: string };
  readonly locale: string;
  readonly now: Date;
  readonly words: NoticeWords;
}

/** Where an encounter opens, if anywhere: the commons for a city one, the community's home, else nothing. */
function worldHref(ritual: Ritual, context: EncounterContext): string | undefined {
  if (ritual.city) return context.commons.href;
  const community = context.communities.find((entry) => entry.id === ritual.community);
  if (community?.sede) return community.sede.href;
  return community?.state === 'founder' ? context.commons.href : undefined;
}

/**
 * Encuentros: an encounter you are going to that starts within 14 days —
 * «**{title}** empieza {en N días | mañana | hoy}. Vas.», with the `.ics`;
 * within 2 h, «Entrar» too when it opens somewhere. Past or unknown ids are
 * left out.
 */
export function encounterNotices(
  ritualIds: readonly string[],
  context: EncounterContext,
): readonly Notice[] {
  const wanted = new Set(ritualIds);
  const nowMs = context.now.getTime();
  return context.rituals.flatMap((ritual): Notice[] => {
    if (!wanted.has(ritual.id) || isPast(ritual, context.now)) return [];
    const startMs = ritualStartMs(ritual);
    const until = startMs - nowMs;
    if (until > ENCOUNTER_AHEAD_MS) return [];
    const soon = until <= ENCOUNTER_SOON_MS;
    const world = soon ? worldHref(ritual, context) : undefined;
    const actions: NoticeAction[] = [
      { id: 'calendar', href: `/rituals/${ritual.id}.ics` },
      ...(world === undefined ? [] : [{ id: 'enter' as const, href: world }]),
    ];
    const when = startsWhen(startMs, context.now, context.words);
    return [
      {
        id: `encounter:${ritual.id}${soon ? ':soon' : ''}`,
        kind: 'encounter',
        at: new Date(startMs - (soon ? ENCOUNTER_SOON_MS : ENCOUNTER_AHEAD_MS)).toISOString(),
        text: parts(fill(context.words.starts, { when }), pick(ritual.title, context.locale)),
        href: `/rituals/${ritual.id}/`,
        actions,
      },
    ];
  });
}

/** The moment a crowd is noticed: `now` on a 10-minute grid, so a re-read says the same. */
export function crowdMoment(now: Date): string {
  const grid = 10 * MINUTE_MS;
  return new Date(Math.floor(now.getTime() / grid) * grid).toISOString();
}

/**
 * Sedes: a home of one of your communities with somebody inside right now —
 * «Hay **N personas** en {world}.» with «Entrar». Nobody inside, no home,
 * or a community not yours: nothing.
 */
export function worldNotices(
  inside: Readonly<Record<string, number | null | undefined>>,
  myCommunityIds: readonly string[],
  communities: readonly Community[],
  locale: string,
  now: Date,
  words: NoticeWords,
): readonly Notice[] {
  const mine = new Set(myCommunityIds);
  const at = crowdMoment(now);
  return communities.flatMap((community): Notice[] => {
    const n = inside[community.id];
    if (!mine.has(community.id) || community.sede === undefined) return [];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return [];
    const world = community.sede.name ? pick(community.sede.name, locale) : community.name;
    const subject = n === 1 ? words.onePerson : fill(words.people, { n });
    return [
      {
        id: `world:${community.id}`,
        kind: 'world',
        at,
        text: parts(fill(words.inside, { world }), subject),
        href: `/communities/${community.id}/`,
        actions: [{ id: 'enter', href: community.sede.href }],
      },
    ];
  });
}

/**
 * Comunidades, what you decide: an open request to a community you are
 * house or admin of — «**{name or wallet}** quiere {entrar en | reclamar}
 * {community}.» with «Aceptar» / «Ahora no». A decided one is not a
 * decision any more.
 */
export function requestNotices(
  requests: readonly DeskCommunityRequestEntry[],
  names: Readonly<Record<string, string>>,
  words: NoticeWords,
): readonly Notice[] {
  return requests.flatMap((request): Notice[] => {
    if (request.state !== 'open') return [];
    const community = names[request.communityId] ?? request.communityId;
    const what = request.kind === 'claim' ? words.toClaim : words.toJoin;
    return [
      {
        id: `request:${request.id}`,
        kind: 'community',
        at: request.createdAt,
        text: parts(
          fill(words.wants, { what, community }),
          request.name ?? shortWallet(request.wallet),
        ),
        href: `/communities/${request.communityId}/`,
        actions: [
          { id: 'accept', request: request.id, community: request.communityId },
          { id: 'later', request: request.id, community: request.communityId },
        ],
      },
    ];
  });
}

/**
 * Comunidades, what was decided about you: «**{community}** te ha
 * aceptado. Ya eres {Titular | miembro}.» or «… no ha aceptado tu petición
 * por ahora.» An open one of yours is not news yet.
 */
export function decisionNotices(
  requests: readonly DeskCommunityRequest[],
  names: Readonly<Record<string, string>>,
  words: NoticeWords,
): readonly Notice[] {
  return requests.flatMap((request): Notice[] => {
    if (request.state === 'open' || request.decidedAt === null) return [];
    const community = names[request.communityId] ?? request.communityId;
    const role = request.kind === 'claim' ? words.titular : words.member;
    const template = request.state === 'accepted' ? fill(words.accepted, { role }) : words.declined;
    return [
      {
        id: `decision:${request.id}`,
        kind: 'community',
        at: request.decidedAt,
        text: parts(template, community),
        href: `/communities/${request.communityId}/`,
      },
    ];
  });
}

/** Newest first; ties by id, so a re-read keeps the order. */
export function sortNotices(notices: readonly Notice[]): readonly Notice[] {
  return [...notices].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id),
  );
}

/** How many are newer than the moment the browser last saw (`since` ISO, or nothing seen). */
export function unseenCount(notices: readonly Notice[], since: string | null): number {
  const seen = since === null ? Number.NaN : Date.parse(since);
  if (Number.isNaN(seen)) return notices.length;
  return notices.filter((notice) => Date.parse(notice.at) > seen).length;
}

/** The newest `at` of the list, or null when it is empty — what the browser keeps as «seen». */
export function newestAt(notices: readonly Notice[]): string | null {
  return notices.reduce<string | null>(
    (newest, notice) =>
      newest === null || Date.parse(notice.at) > Date.parse(newest) ? notice.at : newest,
    null,
  );
}

const INTL_LOCALE: Readonly<Record<string, string>> = { 'pt-br': 'pt-BR' };
const intlLocale = (locale: string): string => INTL_LOCALE[locale] ?? locale;

/**
 * When, as a person says it: «ahora», «hace 3 min», «hoy», «ayer», the
 * weekday within a week («lun»), the date beyond. Days are UTC calendar
 * days. A moment ahead of `now` reads as today.
 */
export function relativeTime(at: string, now: Date, locale: string): string {
  const tag = intlLocale(locale);
  const ms = Date.parse(at);
  const ago = now.getTime() - ms;
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: 'auto', style: 'narrow' });
  if (ago < MINUTE_MS) return relative.format(0, 'second');
  if (ago < HOUR_MS) return relative.format(-Math.floor(ago / MINUTE_MS), 'minute');
  const days = dayIndex(now.getTime()) - dayIndex(ms);
  if (days <= 1) return relative.format(-days, 'day');
  if (days < 7) {
    return new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'UTC' }).format(ms);
  }
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    ms,
  );
}

/** The id of the chip a notice answers to. */
export function matchesFilter(notice: Notice, filter: string): boolean {
  return filter === 'all' || notice.kind === filter;
}

/**
 * The fixture's list (DATA_SOURCE=fixture): one of every kind, through the
 * same sources, hung from `now` so the words read as they would.
 */
export function fixtureNotices(
  locale: string,
  now: Date,
  words: NoticeWords,
  communities: readonly Community[],
): readonly Notice[] {
  const agora = communities.find((community) => community.sede !== undefined) ?? communities[0];
  const home: Community | undefined =
    agora === undefined
      ? undefined
      : {
          ...agora,
          sede: agora.sede ?? { href: 'https://agora.numinia.xyz/', name: undefined },
        };
  const ritual: Ritual = {
    id: 'numinia-anniversary-2026',
    community: home?.id ?? 'numen-games',
    title: {
      en: 'The Anniversary of Numinia',
      es: 'El Aniversario de Numinia',
      ja: 'ヌミニアの記念日',
      ko: '누미니아 기념일',
      'pt-br': 'O Aniversário de Numinia',
    },
    start: new Date(now.getTime() + 3 * DAY_MS).toISOString(),
    end: new Date(now.getTime() + 3 * DAY_MS + HOUR_MS).toISOString(),
    allDay: false,
    mode: 'online',
    status: 'upcoming',
    city: true,
    where: { en: 'The Agora', es: 'El Ágora' },
    programme: undefined,
    note: undefined,
    source: undefined,
    image: undefined,
  };
  const wallet = '0x00000000000000000000000000000000000000a1';
  const open: DeskCommunityRequestEntry = {
    id: `req_${'a1'.repeat(16)}`,
    communityId: home?.id ?? 'numen-games',
    wallet,
    kind: 'join',
    note: null,
    state: 'open',
    createdAt: new Date(now.getTime() - 3 * DAY_MS).toISOString(),
    decidedAt: null,
    decidedBy: null,
    name: 'Lucía Vidal',
    avatar: null,
  };
  const decided: DeskCommunityRequest = {
    id: `req_${'b2'.repeat(16)}`,
    communityId: communities[1]?.id ?? home?.id ?? 'merge',
    wallet,
    kind: 'claim',
    note: null,
    state: 'accepted',
    createdAt: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
    decidedAt: new Date(now.getTime() - DAY_MS).toISOString(),
    decidedBy: null,
  };
  const names = Object.fromEntries(communities.map((community) => [community.id, community.name]));
  const context: EncounterContext = {
    rituals: [ritual],
    communities: home === undefined ? [] : [home],
    commons: { href: 'https://agora.numinia.xyz/', name: 'Agora' },
    locale,
    now,
    words,
  };
  return sortNotices([
    ...encounterNotices([ritual.id], context),
    ...(home === undefined
      ? []
      : worldNotices({ [home.id]: 5 }, [home.id], [home], locale, now, words)),
    ...requestNotices([open], names, words),
    ...decisionNotices([decided], names, words),
  ]);
}
