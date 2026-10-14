/**
 * Communities and their rituals — phase 0 of the communities platform (the
 * Oracle, 2026-10-14): every community that already gathers has a public
 * page in the city, with its rituals, its place and its links; the house
 * opens the pages, the community claims them later.
 *
 * File over app: each community and each ritual is a markdown file under
 * src/content/communities/ — the page only shows what the file says. This
 * module is the pure model: it parses the front matter the pages hand it,
 * orders rituals, lays out the calendar and writes the iCalendar feed. No
 * IO, no dates read from the clock unless they are passed in.
 */

import { WORLD_ZONES } from './worlds';

/** A text in the two content languages; the other locales read English. */
export interface Localized {
  readonly en: string;
  readonly es: string;
}

/** A list of lines in the two content languages (a programme, a note). */
export interface LocalizedList {
  readonly en: readonly string[];
  readonly es: readonly string[];
}

/** The text of a localized pair for a site locale: Spanish or English. */
export function pick(text: Localized, locale: string): string {
  return locale === 'es' ? text.es : text.en;
}

/** The lines of a localized list for a site locale. */
export function pickList(list: LocalizedList, locale: string): readonly string[] {
  return locale === 'es' ? list.es : list.en;
}

/**
 * The places a community can be from. One community may have several (MERGE
 * sits in Madrid and in Buenos Aires); `online` is a place too.
 */
export const PLACES = {
  madrid: { en: 'Madrid, Spain', es: 'Madrid, España' },
  valencia: { en: 'València, Spain', es: 'València, España' },
  alicante: { en: 'La Vega, Alicante', es: 'La Vega, Alicante' },
  'buenos-aires': { en: 'Buenos Aires, Argentina', es: 'Buenos Aires, Argentina' },
  honduras: { en: 'Honduras', es: 'Honduras' },
  mesa: { en: 'Mesa, Arizona · USA', es: 'Mesa, Arizona · EE. UU.' },
  online: { en: 'Online, from anywhere', es: 'En línea, desde todo el mundo' },
  tba: { en: 'Place to be decided', es: 'Lugar por decir' },
} as const satisfies Record<string, Localized>;

export type PlaceId = keyof typeof PLACES;

export const PLACE_IDS = Object.keys(PLACES) as readonly PlaceId[];

/** The short name of a place for a filter chip: the city alone. */
export function placeShort(id: PlaceId, locale: string): string {
  return pick(PLACES[id], locale).split(',')[0]!.split(' ·')[0]!;
}

/** Every place of a community, joined for a line of text. */
export function placesLine(places: readonly PlaceId[], locale: string): string {
  return places.map((id) => pick(PLACES[id], locale)).join(' · ');
}

/**
 * founder — Numen Games, the first to enter; it keeps the city's commons.
 * opened — a page the house opened for a community it has worked with; the
 *          community claims it later.
 */
export type CommunityState = 'founder' | 'opened';

/**
 * public — on the site. house — prepared but not published: the house shows
 * it to the community and publishes when they say yes (no page is built).
 */
export type CommunityVisibility = 'public' | 'house';

export interface CommunityLink {
  readonly label: string;
  readonly href: string;
}

/** A recurring gathering with no date yet (the Coven, the Council). */
export interface WeeklyRitual {
  readonly name: Localized;
  readonly when: Localized;
}

export interface CommunityImage {
  readonly src: string;
  readonly alt: Localized;
}

/**
 * A community's home in 3D: the address its people enter by. The community
 * file is the one place that says which world is whose (the world's card
 * describes the world, its order on the machine says who governs it); the
 * name defaults to the community's own.
 */
export interface Sede {
  readonly href: string;
  readonly name: Localized | undefined;
}

export interface Community {
  readonly id: string;
  readonly name: string;
  readonly kind: Localized;
  readonly places: readonly PlaceId[];
  readonly summary: Localized;
  readonly links: readonly CommunityLink[];
  readonly state: CommunityState;
  readonly visibility: CommunityVisibility;
  /** Who runs the community's door when it is not the community itself. */
  readonly operator: string | undefined;
  /** A house illustration; never a third party's photo. */
  readonly image: CommunityImage | undefined;
  readonly weekly: readonly WeeklyRitual[];
  /** Its 3D home, once it has one. */
  readonly sede: Sede | undefined;
  /** True while the house is building the community its home. */
  readonly homeInProgress: boolean;
  /** Texts a founder page shows instead of the empty states. */
  readonly home: Localized | undefined;
  readonly archive: Localized | undefined;
  readonly people: Localized | undefined;
}

export type RitualMode = 'in-person' | 'online' | 'mixed';

/** The status lives in the file: the house marks a ritual held when it writes its chronicle. */
export type RitualStatus = 'upcoming' | 'held';

export interface RitualSource {
  readonly name: string;
  /** The day the programme was read there, YYYY-MM-DD. */
  readonly date: string;
}

export interface Ritual {
  readonly id: string;
  readonly community: string;
  /** A proper name (TRG26) is one string in the file; the city's own rituals carry both languages. */
  readonly title: Localized;
  /** YYYY-MM-DD for a whole-day ritual, an instant ending in Z for a timed one. */
  readonly start: string;
  /** Inclusive last day for a whole-day ritual; the end instant for a timed one. */
  readonly end: string;
  readonly allDay: boolean;
  readonly mode: RitualMode | undefined;
  readonly status: RitualStatus;
  /** A ritual of the whole city, kept by its community. */
  readonly city: boolean;
  readonly where: Localized;
  readonly programme: LocalizedList | undefined;
  readonly note: Localized | undefined;
  readonly source: RitualSource | undefined;
  readonly image: CommunityImage | undefined;
}

// ---------------------------------------------------------------------------
// Parsing: hand guards, strict, with the file named in every error (fail
// closed at build time; a bad file never becomes a half page).

type Raw = Record<string, unknown>;

function record(value: unknown, where: string): Raw {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: expected a mapping`);
  }
  return value as Raw;
}

function str(raw: Raw, key: string, where: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${where}: "${key}" must be a non-empty string`);
  }
  return value;
}

function optStr(raw: Raw, key: string, where: string): string | undefined {
  return raw[key] === undefined ? undefined : str(raw, key, where);
}

function bool(raw: Raw, key: string, fallback: boolean, where: string): boolean {
  const value = raw[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`${where}: "${key}" must be true or false`);
  return value;
}

function localized(value: unknown, where: string): Localized {
  const raw = record(value, where);
  return { en: str(raw, 'en', where), es: str(raw, 'es', where) };
}

/** A string serves both languages (a proper name); a mapping gives each its own. */
function nameOrLocalized(raw: Raw, key: string, where: string): Localized {
  const value = raw[key];
  if (typeof value === 'string') {
    const name = str(raw, key, where);
    return { en: name, es: name };
  }
  return localized(value, `${where}.${key}`);
}

function optLocalized(raw: Raw, key: string, where: string): Localized | undefined {
  return raw[key] === undefined ? undefined : localized(raw[key], `${where}.${key}`);
}

function lines(value: unknown, where: string): readonly string[] {
  if (!Array.isArray(value) || value.some((line) => typeof line !== 'string' || line === '')) {
    throw new Error(`${where}: expected a list of lines`);
  }
  return value as readonly string[];
}

function optLocalizedList(raw: Raw, key: string, where: string): LocalizedList | undefined {
  if (raw[key] === undefined) return undefined;
  const list = record(raw[key], `${where}.${key}`);
  return {
    en: lines(list['en'], `${where}.${key}.en`),
    es: lines(list['es'], `${where}.${key}.es`),
  };
}

function oneOf<T extends string>(
  raw: Raw,
  key: string,
  allowed: readonly T[],
  fallback: T | undefined,
  where: string,
): T {
  const value = raw[key];
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`${where}: "${key}" must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function optImage(raw: Raw, where: string): CommunityImage | undefined {
  if (raw['image'] === undefined) return undefined;
  const image = record(raw['image'], `${where}.image`);
  const src = str(image, 'src', `${where}.image`);
  if (!src.startsWith('/images/'))
    throw new Error(`${where}.image: only house illustrations under /images/`);
  return { src, alt: localized(image['alt'], `${where}.image.alt`) };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/;

function validDate(value: string, where: string): string {
  // V8 rolls a 30th of February over to March: the round trip catches it.
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (DATE_ONLY.test(value) && !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(value))
    return value;
  throw new Error(`${where}: expected a real day as YYYY-MM-DD`);
}

/** The id is the file name (`trgcon.md` → `trgcon`): lowercase, hyphens, digits. */
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function idFromPath(path: string): string {
  const id = path.split('/').pop()?.replace(/\.md$/, '') ?? '';
  if (!ID.test(id)) throw new Error(`${path}: a file name is lowercase words joined by hyphens`);
  return id;
}

function optSede(raw: Raw, where: string): Sede | undefined {
  if (raw['sede'] === undefined) return undefined;
  const sede = record(raw['sede'], `${where}.sede`);
  const href = str(sede, 'href', `${where}.sede`);
  if (!/^https:\/\/[^/\s]+/.test(href))
    throw new Error(`${where}.sede: the home is an https address`);
  return {
    href,
    name: sede['name'] === undefined ? undefined : nameOrLocalized(sede, 'name', `${where}.sede`),
  };
}

/** Parses one community file's front matter; throws naming the file. */
export function parseCommunity(id: string, frontmatter: unknown): Community {
  const where = `communities/${id}.md`;
  const raw = record(frontmatter, where);
  const placesRaw = raw['places'];
  if (!Array.isArray(placesRaw) || placesRaw.length === 0)
    throw new Error(`${where}: "places" must list at least one place`);
  const places = placesRaw.map((place) => {
    if (typeof place !== 'string' || !(PLACE_IDS as readonly string[]).includes(place)) {
      throw new Error(
        `${where}: unknown place "${String(place)}" (one of ${PLACE_IDS.join(', ')})`,
      );
    }
    return place as PlaceId;
  });
  const linksRaw = raw['links'] ?? [];
  if (!Array.isArray(linksRaw)) throw new Error(`${where}: "links" must be a list`);
  const links = linksRaw.map((link, index) => {
    const item = record(link, `${where}.links[${index}]`);
    const href = str(item, 'href', `${where}.links[${index}]`);
    if (!/^https:\/\//.test(href))
      throw new Error(`${where}.links[${index}]: links are https addresses`);
    return { label: str(item, 'label', `${where}.links[${index}]`), href };
  });
  const weeklyRaw = raw['weekly'] ?? [];
  if (!Array.isArray(weeklyRaw)) throw new Error(`${where}: "weekly" must be a list`);
  const weekly = weeklyRaw.map((entry, index) => {
    const item = record(entry, `${where}.weekly[${index}]`);
    return {
      name: localized(item['name'], `${where}.weekly[${index}].name`),
      when: localized(item['when'], `${where}.weekly[${index}].when`),
    };
  });
  return {
    id,
    name: str(raw, 'name', where),
    kind: localized(raw['kind'], `${where}.kind`),
    places,
    summary: localized(raw['summary'], `${where}.summary`),
    links,
    state: oneOf(raw, 'state', ['founder', 'opened'], 'opened', where),
    visibility: oneOf(raw, 'visibility', ['public', 'house'], 'public', where),
    operator: optStr(raw, 'operator', where),
    image: optImage(raw, where),
    weekly,
    sede: optSede(raw, where),
    homeInProgress: bool(raw, 'homeInProgress', false, where),
    home: optLocalized(raw, 'home', where),
    archive: optLocalized(raw, 'archive', where),
    people: optLocalized(raw, 'people', where),
  };
}

/** Parses one ritual file's front matter; throws naming the file. */
export function parseRitual(id: string, frontmatter: unknown): Ritual {
  const where = `rituals/${id}.md`;
  const raw = record(frontmatter, where);
  const start = str(raw, 'start', where);
  const end = optStr(raw, 'end', where) ?? start;
  const allDay = DATE_ONLY.test(start);
  if (allDay) {
    validDate(start, `${where}.start`);
    validDate(end, `${where}.end`);
    if (end < start) throw new Error(`${where}: the end day comes before the start day`);
  } else {
    if (!INSTANT.test(start) || !INSTANT.test(end)) {
      throw new Error(`${where}: a timed ritual gives start and end as instants in UTC (…Z)`);
    }
    if (Date.parse(end) < Date.parse(start))
      throw new Error(`${where}: the end comes before the start`);
  }
  const sourceRaw = raw['source'];
  let source: RitualSource | undefined;
  if (sourceRaw !== undefined) {
    const item = record(sourceRaw, `${where}.source`);
    source = {
      name: str(item, 'name', `${where}.source`),
      date: validDate(str(item, 'date', `${where}.source`), `${where}.source.date`),
    };
  }
  const modeRaw = raw['mode'];
  return {
    id,
    community: str(raw, 'community', where),
    title: nameOrLocalized(raw, 'title', where),
    start,
    end,
    allDay,
    mode:
      modeRaw === undefined
        ? undefined
        : oneOf<RitualMode>(raw, 'mode', ['in-person', 'online', 'mixed'], undefined, where),
    status: oneOf(raw, 'status', ['upcoming', 'held'], 'upcoming', where),
    city: bool(raw, 'city', false, where),
    where: localized(raw['where'], `${where}.where`),
    programme: optLocalizedList(raw, 'programme', where),
    note: optLocalized(raw, 'note', where),
    source,
    image: optImage(raw, where),
  };
}

// ---------------------------------------------------------------------------
// Order and lookup.

const DAY_MS = 86_400_000;

/** The first instant of a ritual, in UTC milliseconds. */
export function ritualStartMs(ritual: Ritual): number {
  return ritual.allDay ? Date.parse(`${ritual.start}T00:00:00Z`) : Date.parse(ritual.start);
}

/** The instant a ritual is over: the day after its last day, or its end. */
export function ritualEndMs(ritual: Ritual): number {
  return ritual.allDay ? Date.parse(`${ritual.end}T00:00:00Z`) + DAY_MS : Date.parse(ritual.end);
}

export function byStart(a: Ritual, b: Ritual): number {
  return ritualStartMs(a) - ritualStartMs(b) || a.id.localeCompare(b.id);
}

/** Upcoming rituals, the nearest first. */
export function upcoming(rituals: readonly Ritual[]): readonly Ritual[] {
  return rituals.filter((ritual) => ritual.status === 'upcoming').sort(byStart);
}

/** Held rituals, the latest first. */
export function held(rituals: readonly Ritual[]): readonly Ritual[] {
  return rituals.filter((ritual) => ritual.status === 'held').sort((a, b) => byStart(b, a));
}

export function ritualsOf(community: string, rituals: readonly Ritual[]): readonly Ritual[] {
  return rituals.filter((ritual) => ritual.community === community);
}

export function nextRitualOf(community: string, rituals: readonly Ritual[]): Ritual | undefined {
  return upcoming(ritualsOf(community, rituals))[0];
}

/** Only the communities that are on the site. */
export function published(communities: readonly Community[]): readonly Community[] {
  return communities.filter((community) => community.visibility === 'public');
}

/**
 * The communities with a ritual in sight, the nearest ritual first — the
 * home shows the first three.
 */
export function withLife(
  communities: readonly Community[],
  rituals: readonly Ritual[],
): readonly Community[] {
  return published(communities)
    .map((community) => ({ community, next: nextRitualOf(community.id, rituals) }))
    .filter((entry): entry is { community: Community; next: Ritual } => entry.next !== undefined)
    .sort((a, b) => byStart(a.next, b.next))
    .map((entry) => entry.community);
}

/** The index order: the founder, then the rest by name. */
export function byName(a: Community, b: Community): number {
  if (a.state !== b.state) return a.state === 'founder' ? -1 : 1;
  return a.name.localeCompare(b.name, 'es');
}

/** Two capitals for a community without an illustration. */
export function monogram(name: string): string {
  const small = /^(de|del|la|el|los|las|of|the|y|and|·)$/i;
  return name
    .split(/\s+/)
    .filter((word) => word !== '' && !small.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** What the index's search box matches against, lowercased. */
export function searchText(
  community: Community,
  rituals: readonly Ritual[],
  locale: string,
): string {
  const own = ritualsOf(community.id, rituals).map(
    (ritual) => `${pick(ritual.title, locale)} ${pick(ritual.where, locale)}`,
  );
  return [
    community.name,
    pick(community.kind, locale),
    pick(community.summary, locale),
    placesLine(community.places, locale),
    ...own,
  ]
    .join(' ')
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Dates as text. Whole-day rituals are formatted in UTC so the day never
// shifts with the server's zone; a timed one is shown in UTC with its label
// and the page's script shows it in the reader's hour.

const CONTENT_LOCALE = (locale: string): string => (locale === 'es' ? 'es-ES' : 'en-GB');

function noDots(text: string): string {
  return text.replace(/\./g, '');
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dayOf(ritual: Ritual, edge: 'start' | 'end'): Date {
  return new Date(ritual.allDay ? `${ritual[edge]}T00:00:00Z` : ritual[edge]);
}

/** "Thu, 22 Oct – Sat, 24 Oct" / "jue, 22 oct – sáb, 24 oct"; a timed one adds the hour and UTC. */
export function whenShort(ritual: Ritual, locale: string): string {
  const tag = CONTENT_LOCALE(locale);
  const day = new Intl.DateTimeFormat(tag, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const first = capital(noDots(day.format(dayOf(ritual, 'start'))));
  if (!ritual.allDay) {
    const time = new Intl.DateTimeFormat(tag, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    return `${first} · ${time.format(dayOf(ritual, 'start'))} UTC`;
  }
  if (ritual.start === ritual.end) return first;
  return `${first} – ${noDots(day.format(dayOf(ritual, 'end')))}`;
}

/** The full line of a ritual page: "From 22 to 24 October 2026" / "Del 22 al 24 de octubre de 2026". */
export function whenLong(ritual: Ritual, locale: string): string {
  const tag = CONTENT_LOCALE(locale);
  const start = dayOf(ritual, 'start');
  const end = dayOf(ritual, 'end');
  const monthYear = new Intl.DateTimeFormat(tag, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const full = new Intl.DateTimeFormat(tag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (!ritual.allDay) {
    const time = new Intl.DateTimeFormat(tag, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    const span = `${time.format(start)}–${time.format(end)} UTC`;
    return `${capital(full.format(start))}, ${span}`;
  }
  if (ritual.start === ritual.end) return capital(full.format(start));
  const dayMonth = new Intl.DateTimeFormat(tag, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  if (
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear()
  ) {
    return locale === 'es'
      ? `Del ${start.getUTCDate()} al ${end.getUTCDate()} de ${monthYear.format(start)}`
      : `From ${start.getUTCDate()} to ${end.getUTCDate()} ${monthYear.format(start)}`;
  }
  return locale === 'es'
    ? `Del ${noDots(dayMonth.format(start))} al ${noDots(dayMonth.format(end))} de ${end.getUTCFullYear()}`
    : `From ${noDots(dayMonth.format(start))} to ${noDots(dayMonth.format(end))} ${end.getUTCFullYear()}`;
}

/** How many whole days a ritual spans (1 for a single day). */
export function spanDays(ritual: Ritual): number {
  return Math.round((ritualEndMs(ritual) - ritualStartMs(ritual)) / DAY_MS);
}

/** The year a ritual starts, for the held list. */
export function yearOf(ritual: Ritual): number {
  return dayOf(ritual, 'start').getUTCFullYear();
}

/** The day of the month and the short month a ritual starts, for a dated list. */
export function dayAndMonth(
  ritual: Ritual,
  locale: string,
): { readonly day: number; readonly month: string } {
  const start = dayOf(ritual, 'start');
  const month = new Intl.DateTimeFormat(CONTENT_LOCALE(locale), {
    month: 'short',
    timeZone: 'UTC',
  }).format(start);
  return { day: start.getUTCDate(), month: noDots(month) };
}

// ---------------------------------------------------------------------------
// The app shell's pages (v0.83.0): the home's featured card, the worlds a
// visitor can enter, and the follow list kept in the visitor's browser.

/** A 3D world to enter: its address and its name in the page's language. */
export interface World {
  readonly href: string;
  readonly name: string;
}

/**
 * The world a community's ritual is entered from — only a real one. The
 * city's own rituals happen in the commons; a community with a home opens
 * there; the founder has none of its own and keeps the commons, so it opens
 * there too. Anyone else has no world yet, and the page says the home is
 * still to open.
 */
export function worldOf(
  community: Community,
  commons: World,
  locale: string,
  ritual?: Ritual,
): World | undefined {
  if (ritual?.city === true) return commons;
  if (community.sede) {
    const name = community.sede.name ? pick(community.sede.name, locale) : community.name;
    return { href: community.sede.href, name };
  }
  if (community.state === 'founder') return commons;
  return undefined;
}

/**
 * The address a home answers who is inside on: worlds of the house's fleet
 * hang from its zones and their engine keeps a public `/status`. A home
 * elsewhere (a world on another platform) has none, and the site never
 * guesses a count for it.
 */
export function sedeDomain(href: string): string | null {
  const host = /^https:\/\/([a-z0-9.-]+)(?:[/:?#]|$)/i.exec(href)?.[1]?.toLowerCase();
  if (host === undefined) return null;
  return WORLD_ZONES.some((zone) => host.endsWith(`.${zone}`)) ? host : null;
}

/** A home whose people can be counted: its community and its address. */
export interface CountedSede {
  readonly id: string;
  readonly domain: string;
}

/** The published communities whose home answers who is inside, in the register's order. */
export function countedSedes(communities: readonly Community[]): readonly CountedSede[] {
  return published(communities).flatMap((community) => {
    const domain = community.sede ? sedeDomain(community.sede.href) : null;
    return domain === null ? [] : [{ id: community.id, domain }];
  });
}

// ---------------------------------------------------------------------------
// Editing, day one: the register is files in git, so an edit is a change to
// a file, proposed and reviewed like any other. The Oracle's «Edit» opens
// the file in GitHub's editor, which turns the save into a pull request
// (the editorial workflow of git-based CMSs, without a key in the site).

/** Where the register's files live. */
export const REGISTER_REPO = 'https://github.com/numengames/numinia-web';
const REGISTER_DIR = 'apps/store/src/content/communities';

/** GitHub's editor on a community's file, or on one of its rituals. */
export function editHref(kind: 'community' | 'ritual', id: string): string {
  const folder = kind === 'ritual' ? `${REGISTER_DIR}/rituals` : REGISTER_DIR;
  return `${REGISTER_REPO}/edit/main/${folder}/${id}.md`;
}

/**
 * GitHub's editor on a new ritual file for a community, filled with the
 * fields a ritual needs: the name of the file is the ritual's address.
 */
export function newRitualHref(community: string, today: string): string {
  const value = [
    '---',
    `community: ${community}`,
    'title: { en: Title, es: Título }',
    // Quoted: an unquoted day reads as a date object, and the register wants text.
    `start: "${today}"`,
    `end: "${today}"`,
    'mode: in-person',
    'where:',
    '  en: Where it happens',
    '  es: Dónde se celebra',
    '---',
    '',
  ].join('\n');
  const query = new URLSearchParams({ filename: `${community}-ritual.md`, value });
  return `${REGISTER_REPO}/new/main/${REGISTER_DIR}/rituals?${query.toString()}`;
}

/** One slide of the home's featured card: a community and, when in sight, its ritual. */
export interface FeaturedSlide {
  readonly community: Community;
  readonly ritual: Ritual | undefined;
}

/**
 * The home's featured card: the house's pick first — the community with the
 * nearest ritual, as the front door has chosen since phase 0, or the first
 * community when none has a ritual in sight — then the next upcoming
 * rituals, never the same one twice, up to `count` slides.
 */
export function featuredSlides(
  communities: readonly Community[],
  rituals: readonly Ritual[],
  count = 3,
): readonly FeaturedSlide[] {
  const shown = published(communities);
  const pick = withLife(shown, rituals)[0] ?? shown[0];
  if (pick === undefined || count < 1) return [];
  const first: FeaturedSlide = { community: pick, ritual: nextRitualOf(pick.id, rituals) };
  const slides: FeaturedSlide[] = [first];
  for (const ritual of upcoming(rituals)) {
    if (slides.length >= count) break;
    if (ritual.id === first.ritual?.id) continue;
    const community = shown.find((entry) => entry.id === ritual.community);
    if (community) slides.push({ community, ritual });
  }
  return slides;
}

/**
 * The browser key where the visitor's followed communities live: a JSON
 * array of community ids, written by the «Follow» button on a community's
 * page and read by /belong/. Nothing leaves the browser.
 */
export const FOLLOWS_KEY = 'numinia-follows';

/** A ritual as a followed community's card on /belong/ shows it. */
export interface FollowNext {
  readonly title: string;
  readonly when: string;
  readonly href: string;
  readonly start: string;
}

/**
 * What /belong/ needs to draw a followed community in the visitor's browser:
 * embedded at build as JSON, one entry per published community, each with
 * its next ritual when one is in sight.
 */
export interface FollowEntry {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly line: string;
  readonly next: FollowNext | null;
}

/** The entries /belong/ embeds, in the register's order. */
export function followEntries(
  communities: readonly Community[],
  rituals: readonly Ritual[],
  locale: string,
  prefix: string,
): readonly FollowEntry[] {
  return published(communities).map((community) => {
    const next = nextRitualOf(community.id, rituals);
    return {
      id: community.id,
      name: community.name,
      href: `${prefix}/communities/${community.id}/`,
      line: `${pick(community.kind, locale)} · ${placesLine(community.places, locale)}`,
      next: next
        ? {
            title: pick(next.title, locale),
            when: whenShort(next, locale),
            href: `${prefix}/rituals/${next.id}/`,
            start: next.start,
          }
        : null,
    };
  });
}

// ---------------------------------------------------------------------------
// The calendar: months in a grid, Monday first, each day with its rituals.

export interface CalendarCell {
  readonly day: number;
  readonly inMonth: boolean;
  readonly rituals: readonly Ritual[];
}

export interface CalendarMonth {
  readonly year: number;
  /** 1–12. */
  readonly month: number;
  readonly label: string;
  readonly count: number;
  readonly weeks: readonly (readonly CalendarCell[])[];
}

function covers(ritual: Ritual, dayMs: number): boolean {
  return ritualStartMs(ritual) < dayMs + DAY_MS && ritualEndMs(ritual) > dayMs;
}

/** One month of the grid; `month` is 1–12. */
export function calendarMonth(
  year: number,
  month: number,
  rituals: readonly Ritual[],
  locale: string,
): CalendarMonth {
  const first = Date.UTC(year, month - 1, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const cells: CalendarCell[] = [];
  for (let i = lead; i > 0; i -= 1) {
    cells.push({ day: new Date(first - i * DAY_MS).getUTCDate(), inMonth: false, rituals: [] });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayMs = Date.UTC(year, month - 1, day);
    cells.push({ day, inMonth: true, rituals: rituals.filter((ritual) => covers(ritual, dayMs)) });
  }
  for (let day = 1; cells.length % 7 !== 0; day += 1)
    cells.push({ day, inMonth: false, rituals: [] });
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const label = capital(
    new Intl.DateTimeFormat(CONTENT_LOCALE(locale), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(first)),
  );
  const count = rituals.filter((ritual) => {
    const start = dayOf(ritual, 'start');
    return start.getUTCFullYear() === year && start.getUTCMonth() === month - 1;
  }).length;
  return { year, month, label, count, weeks };
}

/** `count` months from a given one (`month` 1–12), each with its rituals. */
export function calendarMonths(
  from: { readonly year: number; readonly month: number },
  count: number,
  rituals: readonly Ritual[],
  locale: string,
): readonly CalendarMonth[] {
  const months: CalendarMonth[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = from.month - 1 + i;
    months.push(
      calendarMonth(from.year + Math.floor(index / 12), (index % 12) + 1, rituals, locale),
    );
  }
  return months;
}

/** The month that holds the first upcoming ritual, or the given fallback. */
export function firstMonth(
  rituals: readonly Ritual[],
  fallback: { readonly year: number; readonly month: number },
): { readonly year: number; readonly month: number } {
  const first = upcoming(rituals)[0];
  if (!first) return fallback;
  const start = dayOf(first, 'start');
  return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 };
}

// ---------------------------------------------------------------------------
// iCalendar (RFC 5545): the feed a reader subscribes to. Whole-day rituals
// travel as dates (the same day everywhere); timed ones as UTC instants.

function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 octets fold onto a continuation line (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let piece = '';
  let size = 0;
  for (const char of line) {
    const width = new TextEncoder().encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + width > limit) {
      parts.push(piece);
      piece = '';
      size = 0;
    }
    piece += char;
    size += width;
  }
  parts.push(piece);
  return parts.join('\r\n ');
}

function icsDate(day: string): string {
  return day.replace(/-/g, '');
}

function icsInstant(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export interface FeedOptions {
  /** The calendar's name as the reader's app shows it. */
  readonly name: string;
  /** The site origin, without a trailing slash, for each event's URL. */
  readonly site: string;
  /** The locale the texts are written in. */
  readonly locale: string;
  /** When the feed was written, as an instant (DTSTAMP). */
  readonly stamp: number;
}

/** The feed, one VEVENT per ritual, CRLF-terminated. */
export function icsFeed(
  rituals: readonly Ritual[],
  communities: readonly Community[],
  options: FeedOptions,
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Numen Games//Numinia//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(options.name)}`,
  ];
  for (const ritual of [...rituals].sort(byStart)) {
    const community = communities.find((entry) => entry.id === ritual.community);
    const who = community ? community.name : ritual.community;
    const description = [
      pick(ritual.where, options.locale),
      ...(ritual.programme ? pickList(ritual.programme, options.locale) : []),
      ...(ritual.note ? [pick(ritual.note, options.locale)] : []),
    ].join('\n');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ritual.id}@numinia.com`);
    lines.push(`DTSTAMP:${icsInstant(options.stamp)}`);
    if (ritual.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(ritual.start)}`);
      lines.push(`DTEND;VALUE=DATE:${icsInstant(ritualEndMs(ritual)).slice(0, 8)}`);
    } else {
      lines.push(`DTSTART:${icsInstant(ritualStartMs(ritual))}`);
      lines.push(`DTEND:${icsInstant(ritualEndMs(ritual))}`);
    }
    lines.push(`SUMMARY:${icsText(`${pick(ritual.title, options.locale)} · ${who}`)}`);
    lines.push(`LOCATION:${icsText(pick(ritual.where, options.locale))}`);
    lines.push(`DESCRIPTION:${icsText(description)}`);
    lines.push(`URL:${options.site}/rituals/${ritual.id}/`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
