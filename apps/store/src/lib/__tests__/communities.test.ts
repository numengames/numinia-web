import { createHash } from 'node:crypto';
/**
 * Communities and rituals: the pure model behind the home, /communities/,
 * each community's page, each ritual's page, the calendar and the .ics feed.
 * The register tests read the real files under src/content/communities/ so a
 * broken front matter fails here, in seconds, before the build does.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  byName,
  byStart,
  calendarMonth,
  calendarMonths,
  countedSedes,
  countForm,
  dayAndMonth,
  editHref,
  newRitualHref,
  REGISTER_REPO,
  sedeDomain,
  teamOf,
  communityAccountId,
  featuredSlides,
  firstMonth,
  foldLine,
  FOLLOWS_KEY,
  followEntries,
  held,
  icsFeed,
  idFromPath,
  monogram,
  monthsToCover,
  nextRitualOf,
  parseCommunity,
  parseRitual,
  pick,
  pickList,
  PLACE_IDS,
  placeShort,
  placesLine,
  published,
  ritualEndMs,
  ritualStartMs,
  ritualsOf,
  searchText,
  spanDays,
  upcoming,
  whenLong,
  whenShort,
  withHome,
  withLife,
  worldOf,
  yearOf,
  type Community,
  type Ritual,
} from '../communities';

const CONTENT = fileURLToPath(new URL('../../content/communities/', import.meta.url));

function frontmatterOf(file: string): unknown {
  const text = readFileSync(file, 'utf8');
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  expect(block, `${file} has no front matter`).toBeTruthy();
  return parseYaml((block as RegExpExecArray)[1]!);
}

function files(dir: string): readonly string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => `${dir}${name}`);
}

const COMMUNITY_FILES = files(CONTENT);
const RITUAL_FILES = files(`${CONTENT}rituals/`);
const REGISTER = COMMUNITY_FILES.map((file) =>
  parseCommunity(idFromPath(file), frontmatterOf(file)),
);
const RITUALS = RITUAL_FILES.map((file) => parseRitual(idFromPath(file), frontmatterOf(file)));

const COMMUNITY = {
  name: 'La Tarugo',
  kind: { en: 'Conference', es: 'Congreso' },
  places: ['madrid'],
  summary: { en: 'People who make things.', es: 'Gente que hace cosas.' },
  links: [{ label: 'trgcon.com', href: 'https://www.trgcon.com/' }],
};

const RITUAL = {
  community: 'trgcon',
  title: 'TRG26',
  start: '2026-10-22',
  end: '2026-10-24',
  mode: 'in-person',
  where: { en: 'La Nave, Madrid', es: 'La Nave, Madrid' },
};

function ritual(extra: Record<string, unknown> = {}): Ritual {
  return parseRitual('trg26', { ...RITUAL, ...extra });
}

function community(extra: Record<string, unknown> = {}): Community {
  return parseCommunity('trgcon', { ...COMMUNITY, ...extra });
}

describe('the register on disk', () => {
  it('has the founder and every community Pablo named, each file parsing clean', () => {
    const ids = REGISTER.map((entry) => entry.id).sort();
    expect(ids).toEqual([
      'active-inference',
      'adigital',
      'arcasiles',
      'backfund',
      'city-of-mesa',
      'commit-conf',
      'cps',
      'fundacion-veron',
      'mad-tech-campus',
      'merge',
      'numen-games',
      'reset',
      'tetuan-valley',
      'trgcon',
      'vic',
    ]);
    expect(REGISTER.filter((entry) => entry.state === 'founder').map((entry) => entry.id)).toEqual([
      'numen-games',
    ]);
  });

  it('keeps the four prepared pages out of the site until their community says yes', () => {
    const prepared = REGISTER.filter((entry) => entry.visibility === 'house')
      .map((entry) => entry.id)
      .sort();
    expect(prepared).toEqual(['adigital', 'backfund', 'cps', 'mad-tech-campus']);
    expect(published(REGISTER)).toHaveLength(11);
  });

  it('gives TRGCON and VIC their homes in the fleet, and no other community a home yet', () => {
    const housed = REGISTER.filter((entry) => entry.sede !== undefined);
    expect(housed.map((entry) => [entry.id, entry.sede?.href, entry.sede?.world])).toEqual([
      ['trgcon', 'https://trgcon.numinia.com/', 'trgcon'],
      ['vic', 'https://vic.numinia.com/', 'vic'],
    ]);
  });

  it('points every ritual at a community that exists', () => {
    const ids = new Set(REGISTER.map((entry) => entry.id));
    for (const entry of RITUALS)
      expect(ids.has(entry.community), `${entry.id} → ${entry.community}`).toBe(true);
    expect(RITUALS.length).toBeGreaterThanOrEqual(9);
  });

  it('orders the register with the founder first, then by name', () => {
    const ordered = [...REGISTER].sort(byName);
    expect(ordered[0]!.id).toBe('numen-games');
    expect(ordered.slice(1).map((entry) => entry.name)).toEqual(
      [...ordered.slice(1).map((entry) => entry.name)].sort((a, b) => a.localeCompare(b, 'es')),
    );
  });
});

describe('idFromPath', () => {
  it('takes the file name as the id', () => {
    expect(idFromPath('/x/src/content/communities/trgcon.md')).toBe('trgcon');
    expect(idFromPath('rituals/merge-madrid-2026.md')).toBe('merge-madrid-2026');
  });
  it('refuses a name that is not lowercase words joined by hyphens', () => {
    expect(() => idFromPath('a/La Tarugo.md')).toThrow(/lowercase words/);
    expect(() => idFromPath('a/')).toThrow(/lowercase words/);
  });
});

describe('the organizations the register links', () => {
  it('links Numen Games to its organization in the till, and no other community yet', () => {
    expect(
      REGISTER.filter((entry) => entry.team !== undefined).map((entry) => [entry.id, entry.team]),
    ).toEqual([['numen-games', 'acc_t_2e2dd18c880ba974da1512dc7cde2431']]);
  });
});

describe('parseCommunity', () => {
  it('reads a minimal file with its defaults', () => {
    const entry = community();
    expect(entry).toMatchObject({
      id: 'trgcon',
      name: 'La Tarugo',
      places: ['madrid'],
      state: 'opened',
      visibility: 'public',
      operator: undefined,
      image: undefined,
      weekly: [],
      homeInProgress: false,
      home: undefined,
      archive: undefined,
      people: undefined,
      team: undefined,
    });
  });

  it('reads every optional field', () => {
    const entry = community({
      state: 'founder',
      visibility: 'house',
      operator: 'Reset',
      image: { src: '/images/art/oracle.webp', alt: { en: 'An oracle', es: 'Una oráculo' } },
      weekly: [
        { name: { en: 'The Coven', es: 'El Coven' }, when: { en: 'weekly', es: 'semanal' } },
      ],
      homeInProgress: true,
      home: { en: 'The Agora', es: 'El Ágora' },
      archive: { en: 'The Summa', es: 'La Summa' },
      people: { en: 'The Oracles', es: 'Los Oráculos' },
      team: 'acc_t_0123abcd',
    });
    expect(entry.team).toBe('acc_t_0123abcd');
    expect(entry.state).toBe('founder');
    expect(entry.visibility).toBe('house');
    expect(entry.operator).toBe('Reset');
    expect(entry.image?.src).toBe('/images/art/oracle.webp');
    expect(entry.weekly[0]?.name.es).toBe('El Coven');
    expect(entry.homeInProgress).toBe(true);
    expect(entry.home?.en).toBe('The Agora');
    expect(entry.archive?.es).toBe('La Summa');
    expect(entry.people?.en).toBe('The Oracles');
  });

  it('names the file and the field in every refusal', () => {
    expect(() => parseCommunity('x', null)).toThrow('communities/x.md: expected a mapping');
    expect(() => parseCommunity('x', [])).toThrow('expected a mapping');
    expect(() => community({ name: '' })).toThrow('"name" must be a non-empty string');
    expect(() => community({ name: 3 })).toThrow('"name" must be a non-empty string');
    expect(() => community({ kind: { en: 'x' } })).toThrow(
      'communities/trgcon.md.kind: "es" must be a non-empty string',
    );
    expect(() => community({ places: [] })).toThrow('"places" must list at least one place');
    expect(() => community({ places: 'madrid' })).toThrow('"places" must list at least one place');
    expect(() => community({ places: ['atlantis'] })).toThrow('unknown place "atlantis"');
    expect(() => community({ places: [3] })).toThrow('unknown place "3"');
    expect(() => community({ links: 'x' })).toThrow('"links" must be a list');
    expect(() => community({ links: [{ label: 'x', href: 'http://insecure' }] })).toThrow(
      'links[0]: links are https addresses',
    );
    expect(() => community({ links: [{ href: 'https://x' }] })).toThrow(
      'links[0]: "label" must be a non-empty string',
    );
    expect(() => community({ links: ['x'] })).toThrow('links[0]: expected a mapping');
    expect(() => community({ weekly: {} })).toThrow('"weekly" must be a list');
    expect(() => community({ weekly: [{ name: { en: 'a', es: 'b' } }] })).toThrow(
      'weekly[0].when: expected a mapping',
    );
    expect(() => community({ state: 'closed' })).toThrow('"state" must be one of founder, opened');
    expect(() => community({ visibility: 'secret' })).toThrow(
      '"visibility" must be one of public, house',
    );
    expect(() => community({ homeInProgress: 'yes' })).toThrow(
      '"homeInProgress" must be true or false',
    );
    expect(() =>
      community({ image: { src: 'https://elsewhere/x.jpg', alt: { en: 'a', es: 'b' } } }),
    ).toThrow('only house illustrations under /images/');
    expect(() => community({ image: { src: '/images/art/x.webp' } })).toThrow(
      'image.alt: expected a mapping',
    );
    expect(() => community({ operator: '' })).toThrow('"operator" must be a non-empty string');
    for (const team of ['', 'a b', 'x'.repeat(65), 3]) {
      expect(() => community({ team })).toThrow(
        '"team" must be an organization id: letters, digits, - and _, up to 64',
      );
    }
  });
});

describe('teamOf: the organization of a published community', () => {
  const linked = parseCommunity('numen-games', {
    ...COMMUNITY,
    name: 'Numen Games',
    state: 'founder',
    team: 'acc_t_0123abcd',
  });
  const plain = parseCommunity('merge', { ...COMMUNITY, name: 'MERGE' });
  const hidden = parseCommunity('cps', {
    ...COMMUNITY,
    name: 'CPS',
    visibility: 'house',
    team: 'acc_t_hidden',
  });

  it('gives the id the file names, for a community the site shows', async () => {
    expect(await teamOf([linked, plain, hidden], 'numen-games')).toBe('acc_t_0123abcd');
  });

  it('derives the till account from the id when the file has no team', async () => {
    const expected = `acc_t_${createHash('sha256').update('numinia-till community merge').digest('hex').slice(0, 32)}`;
    expect(await teamOf([linked, plain, hidden], 'merge')).toBe(expected);
    expect(await communityAccountId('merge')).toBe(expected);
  });

  it('gives nothing for a community on file only, one unknown, or none', async () => {
    expect(await teamOf([linked, plain, hidden], 'cps')).toBeNull();
    expect(await teamOf([linked, plain, hidden], 'atlantis')).toBeNull();
    expect(await teamOf([linked], null)).toBeNull();
  });
});

describe('parseRitual', () => {
  it('reads a whole-day ritual with its defaults', () => {
    const entry = ritual();
    expect(entry).toMatchObject({
      id: 'trg26',
      community: 'trgcon',
      allDay: true,
      mode: 'in-person',
      status: 'upcoming',
      city: false,
      programme: undefined,
      note: undefined,
      source: undefined,
      image: undefined,
    });
  });

  it('takes a single day when no end is given, and every optional field', () => {
    const entry = ritual({
      end: undefined,
      mode: undefined,
      status: 'held',
      city: true,
      programme: { en: ['Keynote'], es: ['Charla inaugural'] },
      note: { en: 'Born in 2020', es: 'Nació en 2020' },
      source: { name: 'trgcon.com', date: '2026-10-13' },
      image: { src: '/images/art/cosmos.webp', alt: { en: 'A galaxy', es: 'Una galaxia' } },
    });
    expect(entry.end).toBe('2026-10-22');
    expect(entry.mode).toBeUndefined();
    expect(entry.status).toBe('held');
    expect(entry.city).toBe(true);
    expect(pickList(entry.programme!, 'es')).toEqual(['Charla inaugural']);
    expect(pickList(entry.programme!, 'en')).toEqual(['Keynote']);
    expect(entry.note?.en).toBe('Born in 2020');
    expect(entry.source).toEqual({ name: 'trgcon.com', date: '2026-10-13' });
    expect(entry.image?.src).toBe('/images/art/cosmos.webp');
  });

  it('reads a timed ritual as UTC instants', () => {
    const entry = ritual({ start: '2026-10-22T19:00Z', end: '2026-10-22T21:30:00Z' });
    expect(entry.allDay).toBe(false);
    expect(ritualStartMs(entry)).toBe(Date.parse('2026-10-22T19:00:00Z'));
    expect(ritualEndMs(entry)).toBe(Date.parse('2026-10-22T21:30:00Z'));
  });

  it('reads a proper name as one title and a mapping as two', () => {
    expect(ritual().title).toEqual({ en: 'TRG26', es: 'TRG26' });
    const city = ritual({ title: { en: 'Public Domain Day', es: 'Día del Dominio Público' } });
    expect(pick(city.title, 'es')).toBe('Día del Dominio Público');
    expect(() => ritual({ title: '' })).toThrow('"title" must be a non-empty string');
    expect(() => ritual({ title: { en: 'x' } })).toThrow(
      'rituals/trg26.md.title: "es" must be a non-empty string',
    );
  });

  it('refuses days that do not exist, ends before starts and mixed forms', () => {
    expect(() => ritual({ start: '2026-02-30' })).toThrow(
      'rituals/trg26.md.start: expected a real day',
    );
    expect(() => ritual({ end: '2026-13-01' })).toThrow(
      'rituals/trg26.md.end: expected a real day',
    );
    expect(() => ritual({ end: '2026-10-21' })).toThrow('the end day comes before the start day');
    expect(() => ritual({ start: '2026-10-22T19:00Z' })).toThrow(
      'gives start and end as instants in UTC',
    );
    expect(() => ritual({ start: '22/10/2026', end: '2026-10-24' })).toThrow(
      'gives start and end as instants in UTC',
    );
    expect(() => ritual({ start: '2026-10-22T19:00Z', end: '2026-10-22T18:00Z' })).toThrow(
      'the end comes before the start',
    );
    expect(() => ritual({ mode: 'telepathy' })).toThrow(
      '"mode" must be one of in-person, online, mixed',
    );
    expect(() => ritual({ status: 'cancelled' })).toThrow('"status" must be one of upcoming, held');
    expect(() => ritual({ city: 'yes' })).toThrow('"city" must be true or false');
    expect(() => ritual({ source: { name: 'x' } })).toThrow(
      'source: "date" must be a non-empty string',
    );
    expect(() => ritual({ source: { name: 'x', date: 'yesterday' } })).toThrow(
      'source.date: expected a real day',
    );
    expect(() => ritual({ source: 'x' })).toThrow('source: expected a mapping');
    expect(() => ritual({ programme: { en: ['a'] } })).toThrow(
      'programme.es: expected a list of lines',
    );
    expect(() => ritual({ programme: { en: 'a', es: ['b'] } })).toThrow(
      'programme.en: expected a list of lines',
    );
    expect(() => ritual({ programme: { en: [''], es: ['b'] } })).toThrow(
      'programme.en: expected a list of lines',
    );
    expect(() => ritual({ programme: 'x' })).toThrow('programme: expected a mapping');
    expect(() => ritual({ where: undefined })).toThrow(
      'rituals/trg26.md.where: expected a mapping',
    );
    expect(() => parseRitual('x', 'text')).toThrow('rituals/x.md: expected a mapping');
  });
});

describe('texts and places', () => {
  it('picks Spanish for es and English for every other locale', () => {
    const text = { en: 'Home', es: 'Sede' };
    expect(pick(text, 'es')).toBe('Sede');
    expect(pick(text, 'en')).toBe('Home');
    expect(pick(text, 'ja')).toBe('Home');
    expect(pickList({ en: ['a'], es: ['b'] }, 'pt-br')).toEqual(['a']);
  });

  it('reads ja, ko and pt-br where the file carries them, English where it does not', () => {
    const text = { en: 'Home', es: 'Sede', ja: '拠点', 'pt-br': 'Sede' };
    expect(pick(text, 'ja')).toBe('拠点');
    expect(pick(text, 'pt-br')).toBe('Sede');
    expect(pick(text, 'ko')).toBe('Home');
    expect(pick(text, 'xx')).toBe('Home');
  });

  it('parses the extra locales of a text and refuses an empty one', () => {
    expect(community({ kind: { en: 'Studio', es: 'Estudio', ko: '스튜디오' } }).kind).toEqual({
      en: 'Studio',
      es: 'Estudio',
      ko: '스튜디오',
    });
    expect(() => community({ kind: { en: 'Studio', es: 'Estudio', ja: ' ' } })).toThrow(
      '"ja" must be a non-empty string',
    );
  });

  it('knows every place in both languages, short and long', () => {
    expect(PLACE_IDS).toContain('buenos-aires');
    expect(placesLine(['madrid', 'buenos-aires'], 'es')).toBe(
      'Madrid, España · Buenos Aires, Argentina',
    );
    expect(placesLine(['online'], 'en')).toBe('Online, from anywhere');
    expect(placeShort('mesa', 'es')).toBe('Mesa');
    expect(placeShort('online', 'en')).toBe('Online');
    expect(placeShort('tba', 'es')).toBe('Lugar por decir');
  });

  it('draws a monogram from the first two real words', () => {
    expect(monogram('La Tarugo · TRGCON')).toBe('TT');
    expect(monogram('City of Mesa')).toBe('CM');
    expect(monogram('Fundación Verón · Escuela del Vidrio')).toBe('FV');
    expect(monogram('MERGE')).toBe('M');
  });

  it('builds the search text from the community and its rituals', () => {
    const text = searchText(community(), [ritual()], 'es');
    expect(text).toContain('la tarugo');
    expect(text).toContain('congreso');
    expect(text).toContain('madrid, españa');
    expect(text).toContain('trg26 la nave');
    expect(searchText(community(), [], 'en')).toContain('conference');
  });
});

describe('order and lookup', () => {
  const a = ritual({ title: 'A' });
  const b = parseRitual('merge-madrid-2026', {
    ...RITUAL,
    community: 'merge',
    title: 'B',
    start: '2026-10-27',
    end: '2026-10-29',
  });
  const past = parseRitual('cc-2026', {
    ...RITUAL,
    community: 'commit-conf',
    start: '2026-06-05',
    end: '2026-06-06',
    status: 'held',
  });
  const older = parseRitual('vic-2025', {
    ...RITUAL,
    community: 'vic',
    start: '2025-06-16',
    end: '2025-07-07',
    status: 'held',
  });

  it('sorts by start, then by id for the same day', () => {
    const twin = parseRitual('aaa', { ...RITUAL });
    expect([b, a, twin].sort(byStart).map((entry) => entry.id)).toEqual([
      'aaa',
      'trg26',
      'merge-madrid-2026',
    ]);
  });

  it('separates what comes from what was held', () => {
    expect(upcoming([b, past, a]).map((entry) => entry.id)).toEqual(['trg26', 'merge-madrid-2026']);
    expect(held([older, a, past]).map((entry) => entry.id)).toEqual(['cc-2026', 'vic-2025']);
    expect(ritualsOf('merge', [a, b, past])).toEqual([b]);
    expect(nextRitualOf('merge', [a, b, past])?.id).toBe('merge-madrid-2026');
    expect(nextRitualOf('commit-conf', [a, b, past])).toBeUndefined();
  });

  it('lists the communities with life by their nearest ritual, published only', () => {
    const merge = parseCommunity('merge', { ...COMMUNITY, name: 'MERGE' });
    const hidden = parseCommunity('cps', { ...COMMUNITY, name: 'CPS', visibility: 'house' });
    const quiet = parseCommunity('commit-conf', { ...COMMUNITY, name: 'Commit' });
    const cps = parseRitual('cpslive', {
      ...RITUAL,
      community: 'cps',
      start: '2026-10-01',
      end: '2026-10-01',
    });
    expect(
      withLife([quiet, merge, hidden, community()], [b, a, past, cps]).map((entry) => entry.id),
    ).toEqual(['trgcon', 'merge']);
  });

  it('lists the communities with an open home, the founder first, published only', () => {
    const vic = parseCommunity('vic', {
      ...COMMUNITY,
      name: 'VIC',
      sede: { href: 'https://vic.numinia.com/' },
    });
    const founder = parseCommunity('numen-games', {
      ...COMMUNITY,
      name: 'Numen Games',
      state: 'founder',
    });
    const hidden = parseCommunity('cps', {
      ...COMMUNITY,
      name: 'CPS',
      visibility: 'house',
      sede: { href: 'https://cps.numinia.com/' },
    });
    expect(withHome([community(), vic, hidden, founder]).map((entry) => entry.id)).toEqual([
      'numen-games',
      'vic',
    ]);
  });

  it('measures the span and the year', () => {
    expect(spanDays(a)).toBe(3);
    expect(spanDays(ritual({ end: undefined }))).toBe(1);
    expect(spanDays(ritual({ start: '2026-10-22T19:00Z', end: '2026-10-22T21:00Z' }))).toBe(0);
    expect(yearOf(older)).toBe(2025);
  });
});

describe('dates as text', () => {
  it('writes a whole-day span short, in both languages, in UTC', () => {
    expect(whenShort(ritual(), 'es')).toBe('Jue, 22 oct – sáb, 24 oct');
    expect(whenShort(ritual(), 'en')).toBe('Thu 22 Oct – Sat 24 Oct');
    expect(whenShort(ritual({ end: undefined }), 'es')).toBe('Jue, 22 oct');
    expect(whenShort(ritual({ start: '2027-01-01', end: '2027-01-01' }), 'en')).toBe('Fri 1 Jan');
  });

  it('writes a timed ritual with its hour in UTC', () => {
    const timed = ritual({ start: '2026-10-22T19:00Z', end: '2026-10-22T21:00Z' });
    expect(whenShort(timed, 'es')).toBe('Jue, 22 oct · 19:00 UTC');
    expect(whenLong(timed, 'en')).toBe('Thursday, 22 October 2026, 19:00–21:00 UTC');
  });

  it('writes the long form for one day, one month and across months', () => {
    expect(whenLong(ritual(), 'es')).toBe('Del 22 al 24 de octubre de 2026');
    expect(whenLong(ritual(), 'en')).toBe('From 22 to 24 October 2026');
    expect(whenLong(ritual({ end: undefined }), 'es')).toBe('Jueves, 22 de octubre de 2026');
    expect(whenLong(ritual({ end: undefined }), 'en')).toBe('Thursday, 22 October 2026');
    const across = ritual({ start: '2026-10-31', end: '2026-11-03' });
    expect(whenLong(across, 'es')).toBe('Del 31 oct al 3 nov de 2026');
    expect(whenLong(across, 'en')).toBe('From 31 Oct to 3 Nov 2026');
  });

  it('dates a ritual by its day and short month, in UTC, without dots', () => {
    expect(dayAndMonth(ritual(), 'es')).toEqual({ day: 22, month: 'oct' });
    expect(dayAndMonth(ritual(), 'en')).toEqual({ day: 22, month: 'Oct' });
    expect(dayAndMonth(ritual({ start: '2026-09-01', end: '2026-09-01' }), 'es').month).not.toMatch(
      /\./,
    );
    const late = ritual({ start: '2026-10-31T23:30Z', end: '2026-11-01T01:00Z' });
    expect(dayAndMonth(late, 'ja')).toEqual({ day: 31, month: '10月' });
    expect(dayAndMonth(late, 'pt-br')).toEqual({ day: 31, month: 'out' });
    expect(dayAndMonth(late, 'xx')).toEqual({ day: 31, month: 'Oct' });
  });
});

describe('the app shell pages (v0.83.0)', () => {
  const commons = { href: 'https://v2.oncyber.io/agora_plaza_of_numinia', name: 'El Ágora' };
  const founder = parseCommunity('numen-games', {
    ...COMMUNITY,
    name: 'Numen Games',
    state: 'founder',
  });
  const merge = parseCommunity('merge', { ...COMMUNITY, name: 'MERGE' });
  const hidden = parseCommunity('cps', { ...COMMUNITY, name: 'CPS', visibility: 'house' });
  const trg = ritual();
  const mergeDays = parseRitual('merge-madrid-2026', {
    ...RITUAL,
    community: 'merge',
    title: 'MERGE 2026',
    start: '2026-10-27',
    end: '2026-10-29',
  });
  const cityDay = parseRitual('public-domain-day-2027', {
    ...RITUAL,
    community: 'numen-games',
    title: { en: 'Public Domain Day', es: 'Día del Dominio Público' },
    start: '2027-01-01',
    end: '2027-01-01',
    city: true,
  });
  const cpsDay = parseRitual('cpslive', {
    ...RITUAL,
    community: 'cps',
    start: '2026-10-01',
    end: '2026-10-01',
  });
  const past = parseRitual('cc-2026', {
    ...RITUAL,
    community: 'commit-conf',
    start: '2026-06-05',
    end: '2026-06-06',
    status: 'held',
  });

  it('opens a world only where one exists: the city rituals and the founder, in the commons', () => {
    expect(worldOf(founder, commons, 'es')).toBe(commons);
    expect(worldOf(founder, commons, 'es', trg)).toBe(commons);
    expect(worldOf(merge, commons, 'es', cityDay)).toBe(commons);
    expect(worldOf(merge, commons, 'es', mergeDays)).toBeUndefined();
    expect(worldOf(merge, commons, 'es')).toBeUndefined();
  });

  it('opens a community with a home in its own world, named after it unless the file names it', () => {
    const housed = parseCommunity('vic', {
      ...COMMUNITY,
      name: 'VIC',
      sede: { href: 'https://vic.numinia.com/' },
    });
    expect(worldOf(housed, commons, 'es')).toEqual({
      href: 'https://vic.numinia.com/',
      name: 'VIC',
    });
    expect(worldOf(housed, commons, 'es', cityDay)).toBe(commons);
    const named = parseCommunity('vic', {
      ...COMMUNITY,
      sede: { href: 'https://vic.numinia.com/', name: { en: 'The Hall', es: 'La Sala' } },
    });
    expect(worldOf(named, commons, 'es', mergeDays)?.name).toBe('La Sala');
    expect(worldOf(named, commons, 'ko')?.name).toBe('The Hall');
    const ownFounder = parseCommunity('numen-games', {
      ...COMMUNITY,
      state: 'founder',
      sede: { href: 'https://numen.numen.games', name: 'Numen' },
    });
    expect(worldOf(ownFounder, commons, 'en')?.href).toBe('https://numen.numen.games');
    expect(worldOf(ownFounder, commons, 'en')?.worldId).toBeUndefined();
  });

  it('names the fleet world of a home, so its links go through the pass door', () => {
    const housed = parseCommunity('vic', {
      ...COMMUNITY,
      name: 'VIC',
      sede: { href: 'https://vic.numinia.com/', world: 'vic' },
    });
    expect(housed.sede?.world).toBe('vic');
    expect(worldOf(housed, commons, 'es')).toEqual({
      href: 'https://vic.numinia.com/',
      name: 'VIC',
      worldId: 'vic',
    });
    expect(() =>
      community({ sede: { href: 'https://vic.numinia.com/', world: 'VIC Hall' } }),
    ).toThrow(/fleet id/);
    expect(() => community({ sede: { href: 'https://vic.numinia.com/', world: 7 } })).toThrow(
      /"world"/,
    );
  });

  it('reads a home as an https address, failing closed on anything else', () => {
    expect(() => community({ sede: 'https://vic.numinia.com' })).toThrow(/expected a mapping/);
    expect(() => community({ sede: { href: 'http://vic.numinia.com' } })).toThrow(/https address/);
    expect(() => community({ sede: { href: 'https://' } })).toThrow(/https address/);
    expect(() => community({ sede: {} })).toThrow(/"href"/);
    expect(community().sede).toBeUndefined();
  });

  it('counts people only in homes of the fleet, which answer a public /status', () => {
    expect(sedeDomain('https://vic.numinia.com/')).toBe('vic.numinia.com');
    expect(sedeDomain('https://Hall.Numen.Games:443/x')).toBe('hall.numen.games');
    expect(sedeDomain('https://vic.numinia.com?x=1')).toBe('vic.numinia.com');
    expect(sedeDomain('https://numinia.com/')).toBeNull();
    expect(sedeDomain('https://v2.oncyber.io/agora_plaza_of_numinia')).toBeNull();
    expect(sedeDomain('https://evilnuminia.com/')).toBeNull();
    expect(sedeDomain('not a url')).toBeNull();
    const fleet = parseCommunity('vic', {
      ...COMMUNITY,
      sede: { href: 'https://vic.numinia.com/' },
    });
    const elsewhere = parseCommunity('merge', {
      ...COMMUNITY,
      sede: { href: 'https://v2.oncyber.io/merge' },
    });
    const prepared = parseCommunity('cps', {
      ...COMMUNITY,
      visibility: 'house',
      sede: { href: 'https://cps.numinia.com/' },
    });
    expect(countedSedes([fleet, elsewhere, prepared, merge])).toEqual([
      { id: 'vic', domain: 'vic.numinia.com' },
    ]);
  });

  it('edits a file in GitHub: a community, a ritual, or a new ritual already filled in', () => {
    expect(editHref('community', 'vic')).toBe(
      `${REGISTER_REPO}/edit/main/apps/store/src/content/communities/vic.md`,
    );
    expect(editHref('ritual', 'trg26')).toBe(
      `${REGISTER_REPO}/edit/main/apps/store/src/content/communities/rituals/trg26.md`,
    );
    const href = new URL(newRitualHref('vic', '2026-11-20'));
    expect(href.pathname).toBe(
      '/numengames/numinia-web/new/main/apps/store/src/content/communities/rituals',
    );
    expect(href.searchParams.get('filename')).toBe('vic-ritual.md');
    const draft = href.searchParams.get('value') ?? '';
    expect(draft).toContain('community: vic\n');
    // The draft parses as a ritual of that community, so a save that keeps it is a valid file.
    const block = /^---\n([\s\S]*?)\n---/.exec(draft)![1]!;
    const parsed = parseRitual('vic-ritual', parseYaml(block));
    expect(parsed.community).toBe('vic');
    expect(parsed.start).toBe('2026-11-20');
  });

  it('features the house pick first, then the next rituals, each once, published only', () => {
    const nextYear = parseRitual('merge-madrid-2027', {
      ...RITUAL,
      community: 'merge',
      title: 'MERGE 2027',
      start: '2027-10-27',
      end: '2027-10-29',
    });
    const slides = featuredSlides(
      [merge, founder, hidden, community()],
      [mergeDays, cpsDay, trg, nextYear, cityDay, past],
    );
    expect(slides.map((slide) => [slide.community.id, slide.ritual?.id])).toEqual([
      ['trgcon', 'trg26'],
      ['merge', 'merge-madrid-2026'],
      ['numen-games', 'public-domain-day-2027'],
    ]);
    expect(
      featuredSlides([merge, founder], [mergeDays, trg, cityDay], 2).map(
        (slide) => slide.ritual?.id,
      ),
    ).toEqual(['merge-madrid-2026', 'public-domain-day-2027']);
  });

  it('features the first community alone when no ritual is in sight, and nothing when it cannot', () => {
    expect(featuredSlides([merge, founder], [past])).toEqual([
      { community: merge, ritual: undefined },
    ]);
    expect(featuredSlides([hidden], [cpsDay])).toEqual([]);
    expect(featuredSlides([merge], [mergeDays], 0)).toEqual([]);
  });

  it('keeps the follow list under the one browser key the shell agreed', () => {
    expect(FOLLOWS_KEY).toBe('numinia-follows');
  });

  it('embeds what /belong/ draws: each published community and its next ritual', () => {
    const entries = followEntries([merge, hidden, founder], [mergeDays, past, cpsDay], 'es', '/es');
    expect(entries).toEqual([
      {
        id: 'merge',
        name: 'MERGE',
        href: '/es/communities/merge/',
        line: `Congreso · ${placesLine(['madrid'], 'es')}`,
        next: {
          title: 'MERGE 2026',
          when: whenShort(mergeDays, 'es'),
          href: '/es/rituals/merge-madrid-2026/',
          start: '2026-10-27',
        },
      },
      {
        id: 'numen-games',
        name: 'Numen Games',
        href: '/es/communities/numen-games/',
        line: 'Congreso · Madrid, España',
        next: null,
      },
    ]);
    expect(followEntries([founder], [cityDay], 'en', '')[0]!.next).toMatchObject({
      title: 'Public Domain Day',
      href: '/rituals/public-domain-day-2027/',
    });
  });
});

describe('the calendar', () => {
  const trg = ritual();
  const anniversary = ritual({ start: '2026-10-31', end: '2026-11-03' });

  it('lays a month out Monday first, padding with the neighbours', () => {
    const month = calendarMonth(2026, 10, [trg, anniversary], 'es');
    expect(month.label).toBe('Octubre de 2026');
    expect(month.count).toBe(2);
    expect(month.weeks).toHaveLength(5);
    expect(month.weeks[0]!.map((cell) => `${cell.inMonth ? '' : '-'}${cell.day}`)).toEqual([
      '-28',
      '-29',
      '-30',
      '1',
      '2',
      '3',
      '4',
    ]);
    const last = month.weeks[4]!;
    expect(last.map((cell) => `${cell.inMonth ? '' : '-'}${cell.day}`)).toEqual([
      '26',
      '27',
      '28',
      '29',
      '30',
      '31',
      '-1',
    ]);
    const day22 = month.weeks[3]![3]!;
    expect(day22.day).toBe(22);
    expect(day22.rituals.map((entry) => entry.id)).toEqual(['trg26']);
    expect(month.weeks[3]![5]!.rituals.map((entry) => entry.id)).toEqual(['trg26']);
    expect(month.weeks[3]![6]!.rituals).toHaveLength(0);
    expect(last[5]!.rituals.map((entry) => entry.id)).toEqual(['trg26']);
  });

  it('counts a ritual in the month it starts and spans it into the next', () => {
    const november = calendarMonth(2026, 11, [trg, anniversary], 'en');
    expect(november.label).toBe('November 2026');
    expect(november.count).toBe(0);
    expect(november.weeks[0]![0]!.inMonth).toBe(false);
    expect(november.weeks[0]![6]!.rituals).toHaveLength(1);
    expect(november.weeks[1]![1]!.rituals).toHaveLength(1);
    expect(november.weeks[1]![2]!.rituals).toHaveLength(0);
  });

  it('walks months across a year end', () => {
    const months = calendarMonths({ year: 2026, month: 11 }, 3, [], 'en');
    expect(months.map((month) => `${month.year}-${month.month}`)).toEqual([
      '2026-11',
      '2026-12',
      '2027-1',
    ]);
    expect(months[2]!.label).toBe('January 2027');
  });

  it('starts at the first upcoming ritual, or at the fallback', () => {
    expect(firstMonth([anniversary, trg], { year: 2026, month: 1 })).toEqual({
      year: 2026,
      month: 10,
    });
    expect(firstMonth([ritual({ status: 'held' })], { year: 2026, month: 1 })).toEqual({
      year: 2026,
      month: 1,
    });
  });

  it('runs the grid through the month of the latest upcoming ritual (MIS-268: March 2027)', () => {
    const from = { year: 2026, month: 10 };
    const buenosAires = parseRitual('merge-buenos-aires-2027', {
      ...RITUAL,
      community: 'merge',
      title: 'MERGE Buenos Aires 2027',
      start: '2027-03-08',
      end: '2027-03-10',
    });
    const held2028 = ritual({ status: 'held', start: '2028-01-15', end: '2028-01-15' });
    const jan2028 = ritual({ start: '2028-01-15', end: '2028-01-15' });
    // Oct 2026 … Mar 2027 is six months, so March stays on the page.
    expect(monthsToCover(from, [buenosAires], 4)).toBe(6);
    // A held ritual never extends the grid.
    expect(monthsToCover(from, [buenosAires, held2028], 4)).toBe(6);
    expect(monthsToCover(from, [jan2028], 4)).toBe(16);
    // Never fewer than the minimum: a ritual in the first month, or none.
    expect(monthsToCover(from, [ritual()], 4)).toBe(4);
    expect(monthsToCover(from, [], 4)).toBe(4);
  });
});

describe('the iCalendar feed', () => {
  const options = {
    name: 'Numinia',
    site: 'https://numinia.com',
    locale: 'es',
    stamp: Date.parse('2026-10-14T12:00:00Z'),
  };

  it('writes one whole-day event per ritual, CRLF, with the day after as the end', () => {
    const feed = icsFeed(
      [
        ritual({
          programme: { en: ['Keynote'], es: ['Charla; inaugural, con todo'] },
          note: { en: 'n', es: 'Nota' },
        }),
      ],
      [community()],
      options,
    );
    expect(feed.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(feed.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(feed).toContain('X-WR-CALNAME:Numinia\r\n');
    expect(feed).toContain('UID:trg26@numinia.com\r\n');
    expect(feed).toContain('DTSTAMP:20261014T120000Z\r\n');
    expect(feed).toContain('DTSTART;VALUE=DATE:20261022\r\n');
    expect(feed).toContain('DTEND;VALUE=DATE:20261025\r\n');
    expect(feed).toContain('SUMMARY:TRG26 · La Tarugo\r\n');
    expect(feed).toContain('LOCATION:La Nave\\, Madrid\r\n');
    expect(feed).toContain(
      'DESCRIPTION:La Nave\\, Madrid\\nCharla\\; inaugural\\, con todo\\nNota\r\n',
    );
    expect(feed).toContain('URL:https://numinia.com/rituals/trg26/\r\n');
  });

  it('writes a timed event as UTC instants and names an unknown community by its id', () => {
    const feed = icsFeed(
      [ritual({ start: '2026-10-22T19:00Z', end: '2026-10-22T21:00Z', community: 'ghost' })],
      [],
      { ...options, locale: 'en' },
    );
    expect(feed).toContain('DTSTART:20261022T190000Z\r\n');
    expect(feed).toContain('DTEND:20261022T210000Z\r\n');
    expect(feed).toContain('SUMMARY:TRG26 · ghost\r\n');
  });

  it('orders the events by start whatever the input order', () => {
    const later = parseRitual('later', { ...RITUAL, start: '2026-11-12', end: '2026-11-14' });
    const feed = icsFeed([later, ritual()], [], options);
    expect(feed.indexOf('UID:trg26@')).toBeLessThan(feed.indexOf('UID:later@'));
  });

  it('folds long lines at 75 octets without splitting a character', () => {
    expect(foldLine('short')).toBe('short');
    const long = `DESCRIPTION:${'ñ'.repeat(60)}`;
    const folded = foldLine(long);
    const parts = folded.split('\r\n ');
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(parts.join('')).toBe(long);
    expect(
      foldLine('a'.repeat(200))
        .split('\r\n ')
        .map((part) => part.length),
    ).toEqual([75, 74, 51]);
  });

  it('every ritual on disk makes a valid event', () => {
    const feed = icsFeed(RITUALS, REGISTER, options);
    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(RITUALS.length);
    for (const line of feed.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe('countForm', () => {
  const FORMS = {
    oneOne: '{n} comunidad en {m} lugar',
    oneMany: '{n} comunidad en {m} lugares',
    manyOne: '{n} comunidades en {m} lugar',
    manyMany: '{n} comunidades en {m} lugares',
  };

  it('picks the form each of the two counts calls for', () => {
    expect(countForm(FORMS, 1, 1)).toBe(FORMS.oneOne);
    expect(countForm(FORMS, 1, 2)).toBe(FORMS.oneMany);
    expect(countForm(FORMS, 3, 1)).toBe(FORMS.manyOne);
    expect(countForm(FORMS, 3, 2)).toBe(FORMS.manyMany);
    expect(countForm(FORMS, 0, 0)).toBe(FORMS.manyMany);
  });
});
