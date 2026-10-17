/**
 * «Avisos» (cut J): each source becomes one kind of row — the sentence with
 * its subject in bold, a stable moment, the quiet actions — and the words
 * of time read as a person says them, in the five locales.
 */

import { describe, expect, it } from 'vitest';
import { NOTIFICATIONS_UI } from '../../i18n/notifications';
import type { DeskCommunityRequest, DeskCommunityRequestEntry } from '../accounts';
import { parseCommunity, parseRitual, type Community, type Ritual } from '../communities';
import {
  crowdMoment,
  decisionNotices,
  encounterNotices,
  fixtureNotices,
  matchesFilter,
  newestAt,
  parts,
  relativeTime,
  requestNotices,
  sortNotices,
  startsWhen,
  unseenCount,
  worldNotices,
  type EncounterContext,
  type Notice,
} from '../notices';

const NOW = new Date('2026-10-17T12:00:00.000Z');
const WORDS = NOTIFICATIONS_UI.es.words;

const BASE = {
  kind: { en: 'Conference', es: 'Congreso' },
  places: ['madrid'],
  summary: { en: 'People who make things.', es: 'Gente que hace cosas.' },
  links: [],
};
const community = (id: string, extra: Record<string, unknown> = {}): Community =>
  parseCommunity(id, { ...BASE, name: id.toUpperCase(), ...extra });
const ritual = (id: string, extra: Record<string, unknown> = {}): Ritual =>
  parseRitual(id, {
    community: 'vic',
    title: { en: `${id} EN`, es: `${id} ES` },
    where: { en: 'Madrid', es: 'Madrid' },
    ...extra,
  });

const vic = community('vic', {
  sede: { href: 'https://vic.numinia.com/', name: { en: 'Vic hall', es: 'Sala Vic' } },
});
const merge = community('merge');
const seed = community('seed', { state: 'founder' });
const COMMONS = { href: 'https://agora.numinia.xyz/', name: 'Agora' };

const context = (
  rituals: readonly Ritual[],
  extra: Partial<EncounterContext> = {},
): EncounterContext => ({
  rituals,
  communities: [vic, merge, seed],
  commons: COMMONS,
  locale: 'es',
  now: NOW,
  words: WORDS,
  ...extra,
});

describe('parts / startsWhen', () => {
  it('splits a template around its subject', () => {
    expect(parts('{subject} empieza hoy. Vas.', 'X')).toEqual({
      before: '',
      subject: 'X',
      after: ' empieza hoy. Vas.',
    });
    expect(parts('Hay {subject} en Vic.', '5 personas')).toEqual({
      before: 'Hay ',
      subject: '5 personas',
      after: ' en Vic.',
    });
    expect(parts('sin sujeto', 'X')).toEqual({ before: 'sin sujeto', subject: 'X', after: '' });
  });

  it('says today, tomorrow or in N days by calendar day', () => {
    expect(startsWhen(Date.parse('2026-10-17T23:00:00Z'), NOW, WORDS)).toBe('hoy');
    expect(startsWhen(Date.parse('2026-10-17T10:00:00Z'), NOW, WORDS)).toBe('hoy');
    expect(startsWhen(Date.parse('2026-10-18T01:00:00Z'), NOW, WORDS)).toBe('mañana');
    expect(startsWhen(Date.parse('2026-10-20T01:00:00Z'), NOW, WORDS)).toBe('en 3 días');
    expect(startsWhen(Date.parse('2026-10-20T01:00:00Z'), NOW, NOTIFICATIONS_UI.en.words)).toBe(
      'in 3 days',
    );
  });
});

describe('encounterNotices', () => {
  const inThreeDays = ritual('three', { start: '2026-10-20', end: '2026-10-20' });
  const inAnHour = ritual('hour', { start: '2026-10-17T13:00:00Z', end: '2026-10-17T15:00:00Z' });
  const farAway = ritual('far', { start: '2026-11-15', end: '2026-11-15' });
  const over = ritual('over', { start: '2026-10-10', end: '2026-10-10' });
  const held = ritual('held', { start: '2026-10-20', end: '2026-10-20', status: 'held' });

  it('is nothing without RSVPs, for an unknown id, for an encounter over, held or beyond 14 days', () => {
    const all = [inThreeDays, inAnHour, farAway, over, held];
    expect(encounterNotices([], context(all))).toEqual([]);
    expect(encounterNotices(['nope'], context(all))).toEqual([]);
    expect(encounterNotices(['far', 'over', 'held'], context(all))).toEqual([]);
  });

  it('announces one within 14 days with the .ics, the title in the locale, and a stable moment', () => {
    const [notice] = encounterNotices(['three'], context([inThreeDays]));
    expect(notice).toEqual({
      id: 'encounter:three',
      kind: 'encounter',
      at: '2026-10-06T00:00:00.000Z',
      text: { before: '', subject: 'three ES', after: ' empieza en 3 días. Vas.' },
      href: '/rituals/three/',
      actions: [{ id: 'calendar', href: '/rituals/three.ics' }],
    });
    const [english] = encounterNotices(
      ['three'],
      context([inThreeDays], { locale: 'en', words: NOTIFICATIONS_UI.en.words }),
    );
    expect(english?.text).toEqual({
      before: '',
      subject: 'three EN',
      after: ' starts in 3 days. You are going.',
    });
  });

  it('within 2 h adds «Entrar» when the encounter opens somewhere: the home, the commons for a city or founder one', () => {
    const [notice] = encounterNotices(['hour'], context([inAnHour]));
    expect(notice?.id).toBe('encounter:hour:soon');
    expect(notice?.at).toBe('2026-10-17T11:00:00.000Z');
    expect(notice?.text.after).toBe(' empieza hoy. Vas.');
    expect(notice?.actions).toEqual([
      { id: 'calendar', href: '/rituals/hour.ics' },
      { id: 'enter', href: 'https://vic.numinia.com/' },
    ]);
    const city = ritual('city', {
      start: '2026-10-17T13:00:00Z',
      end: '2026-10-17T15:00:00Z',
      city: true,
      community: 'merge',
    });
    expect(encounterNotices(['city'], context([city]))[0]?.actions?.[1]).toEqual({
      id: 'enter',
      href: COMMONS.href,
    });
    const founder = ritual('seed', {
      start: '2026-10-17T13:00:00Z',
      end: '2026-10-17T15:00:00Z',
      community: 'seed',
    });
    expect(encounterNotices(['seed'], context([founder]))[0]?.actions?.[1]).toEqual({
      id: 'enter',
      href: COMMONS.href,
    });
    const nowhere = ritual('nowhere', {
      start: '2026-10-17T13:00:00Z',
      end: '2026-10-17T15:00:00Z',
      community: 'merge',
    });
    expect(encounterNotices(['nowhere'], context([nowhere]))[0]?.actions).toHaveLength(1);
    const unknown = ritual('ghost', {
      start: '2026-10-17T13:00:00Z',
      end: '2026-10-17T15:00:00Z',
      community: 'ghost',
    });
    expect(encounterNotices(['ghost'], context([unknown]))[0]?.actions).toHaveLength(1);
  });

  it('an encounter already begun but not over reads as today, with the door', () => {
    const begun = ritual('begun', { start: '2026-10-17T11:30:00Z', end: '2026-10-17T15:00:00Z' });
    const [notice] = encounterNotices(['begun'], context([begun]));
    expect(notice?.text.after).toBe(' empieza hoy. Vas.');
    expect(notice?.actions).toHaveLength(2);
  });
});

describe('worldNotices', () => {
  it('says how many are in a home of yours, singular and plural, and is nothing otherwise', () => {
    const notices = worldNotices(
      { vic: 5, merge: 3 },
      ['vic', 'merge'],
      [vic, merge],
      'es',
      NOW,
      WORDS,
    );
    expect(notices).toEqual([
      {
        id: 'world:vic',
        kind: 'world',
        at: '2026-10-17T12:00:00.000Z',
        text: { before: 'Hay ', subject: '5 personas', after: ' en Sala Vic.' },
        href: '/communities/vic/',
        actions: [{ id: 'enter', href: 'https://vic.numinia.com/' }],
      },
    ]);
    expect(
      worldNotices({ vic: 1 }, ['vic'], [vic], 'en', NOW, NOTIFICATIONS_UI.en.words)[0]?.text,
    ).toEqual({
      before: 'There are ',
      subject: '1 person',
      after: ' in Vic hall.',
    });
    expect(worldNotices({ vic: 5 }, [], [vic], 'es', NOW, WORDS)).toEqual([]);
    expect(worldNotices({ vic: 0 }, ['vic'], [vic], 'es', NOW, WORDS)).toEqual([]);
    expect(worldNotices({ vic: null }, ['vic'], [vic], 'es', NOW, WORDS)).toEqual([]);
    expect(worldNotices({ vic: 1.5 }, ['vic'], [vic], 'es', NOW, WORDS)).toEqual([]);
    expect(worldNotices({}, ['vic'], [vic], 'es', NOW, WORDS)).toEqual([]);
  });

  it('names the home by the community when the home has no name of its own', () => {
    const plain = community('plain', { sede: { href: 'https://plain.numinia.com/' } });
    expect(worldNotices({ plain: 2 }, ['plain'], [plain], 'es', NOW, WORDS)[0]?.text.after).toBe(
      ' en PLAIN.',
    );
  });

  it('notes the crowd on a 10-minute grid', () => {
    expect(crowdMoment(new Date('2026-10-17T12:07:59.000Z'))).toBe('2026-10-17T12:00:00.000Z');
    expect(crowdMoment(new Date('2026-10-17T12:10:00.000Z'))).toBe('2026-10-17T12:10:00.000Z');
  });
});

const entry = (extra: Partial<DeskCommunityRequestEntry> = {}): DeskCommunityRequestEntry => ({
  id: `req_${'a1'.repeat(16)}`,
  communityId: 'vic',
  wallet: '0x00000000000000000000000000000000000000a1',
  kind: 'join',
  note: null,
  state: 'open',
  createdAt: '2026-10-14T10:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
  name: 'Lucía Vidal',
  avatar: null,
  ...extra,
});
const NAMES = { vic: 'Vic', merge: 'Merge' };

describe('requestNotices', () => {
  it('asks you to decide an open request, by name or by short wallet, to join or to claim', () => {
    const [join] = requestNotices([entry()], NAMES, WORDS);
    expect(join).toEqual({
      id: `request:req_${'a1'.repeat(16)}`,
      kind: 'community',
      at: '2026-10-14T10:00:00.000Z',
      text: { before: '', subject: 'Lucía Vidal', after: ' quiere entrar en Vic.' },
      href: '/communities/vic/',
      actions: [
        { id: 'accept', request: `req_${'a1'.repeat(16)}`, community: 'vic' },
        { id: 'later', request: `req_${'a1'.repeat(16)}`, community: 'vic' },
      ],
    });
    const [claim] = requestNotices(
      [entry({ kind: 'claim', name: null, communityId: 'ghost' })],
      NAMES,
      WORDS,
    );
    expect(claim?.text).toEqual({
      before: '',
      subject: '0x0000…00a1',
      after: ' quiere reclamar ghost.',
    });
  });

  it('is nothing for one already decided', () => {
    expect(
      requestNotices([entry({ state: 'accepted' }), entry({ state: 'declined' })], NAMES, WORDS),
    ).toEqual([]);
  });
});

describe('decisionNotices', () => {
  const own = (extra: Partial<DeskCommunityRequest> = {}): DeskCommunityRequest => {
    const { name: _name, avatar: _avatar, ...base } = entry();
    return { ...base, ...extra };
  };

  it('tells you an answer to your own request: titular for a claim, member for a join, or not for now', () => {
    const at = '2026-10-16T09:00:00.000Z';
    const [claim] = decisionNotices(
      [own({ kind: 'claim', state: 'accepted', decidedAt: at })],
      NAMES,
      WORDS,
    );
    expect(claim).toEqual({
      id: `decision:req_${'a1'.repeat(16)}`,
      kind: 'community',
      at,
      text: { before: '', subject: 'Vic', after: ' te ha aceptado. Ya eres Titular.' },
      href: '/communities/vic/',
    });
    const [join] = decisionNotices([own({ state: 'accepted', decidedAt: at })], NAMES, WORDS);
    expect(join?.text.after).toBe(' te ha aceptado. Ya eres miembro.');
    const [declined] = decisionNotices(
      [own({ state: 'declined', decidedAt: at, communityId: 'merge' })],
      NAMES,
      WORDS,
    );
    expect(declined?.text).toEqual({
      before: '',
      subject: 'Merge',
      after: ' no ha aceptado tu petición por ahora.',
    });
  });

  it('says nothing of an open one, nor of a decision with no moment', () => {
    expect(decisionNotices([own(), own({ state: 'accepted' })], NAMES, WORDS)).toEqual([]);
  });
});

const notice = (id: string, at: string, kind: Notice['kind'] = 'world'): Notice => ({
  id,
  kind,
  at,
  text: { before: '', subject: id, after: '' },
});

describe('sortNotices / unseenCount / newestAt / matchesFilter', () => {
  const a = notice('a', '2026-10-17T10:00:00.000Z', 'encounter');
  const b = notice('b', '2026-10-17T11:00:00.000Z');
  const c = notice('c', '2026-10-17T11:00:00.000Z', 'community');

  it('orders newest first, ties by id', () => {
    expect(sortNotices([a, c, b]).map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });

  it('counts what is newer than the moment last seen; everything when nothing or nonsense was seen', () => {
    expect(unseenCount([a, b, c], null)).toBe(3);
    expect(unseenCount([a, b, c], 'nonsense')).toBe(3);
    expect(unseenCount([a, b, c], '2026-10-17T10:00:00.000Z')).toBe(2);
    expect(unseenCount([a, b, c], '2026-10-17T11:00:00.000Z')).toBe(0);
    expect(unseenCount([], null)).toBe(0);
  });

  it('finds the newest moment, or null', () => {
    expect(newestAt([a, b, c])).toBe('2026-10-17T11:00:00.000Z');
    expect(newestAt([b, a])).toBe('2026-10-17T11:00:00.000Z');
    expect(newestAt([])).toBeNull();
  });

  it('answers the chips', () => {
    expect([a, b, c].filter((n) => matchesFilter(n, 'all'))).toHaveLength(3);
    expect([a, b, c].filter((n) => matchesFilter(n, 'world'))).toEqual([b]);
    expect([a, b, c].filter((n) => matchesFilter(n, 'community'))).toEqual([c]);
  });
});

describe('relativeTime', () => {
  const saturday = NOW; // 2026-10-17 is a Saturday

  it('says now, minutes ago, today, yesterday, the weekday within a week, the date beyond — in Spanish', () => {
    expect(relativeTime('2026-10-17T11:59:30.000Z', saturday, 'es')).toBe('ahora');
    expect(relativeTime('2026-10-17T11:57:00.000Z', saturday, 'es')).toBe('hace 3 min');
    expect(relativeTime('2026-10-17T09:00:00.000Z', saturday, 'es')).toBe('hoy');
    expect(relativeTime('2026-10-16T23:30:00.000Z', saturday, 'es')).toBe('ayer');
    expect(relativeTime('2026-10-12T08:00:00.000Z', saturday, 'es')).toBe('lun');
    expect(relativeTime('2026-10-01T08:00:00.000Z', saturday, 'es')).toBe('1 oct');
  });

  it('reads a moment ahead as today', () => {
    expect(relativeTime('2026-10-17T13:00:00.000Z', saturday, 'es')).toBe('ahora');
    expect(relativeTime('2026-10-18T13:00:00.000Z', saturday, 'es')).toBe('ahora');
  });

  it('speaks the other four locales', () => {
    expect(relativeTime('2026-10-17T11:57:00.000Z', saturday, 'en')).toBe('3m ago');
    expect(relativeTime('2026-10-16T23:30:00.000Z', saturday, 'en')).toBe('yesterday');
    expect(relativeTime('2026-10-12T08:00:00.000Z', saturday, 'en')).toBe('Mon');
    expect(relativeTime('2026-10-16T23:30:00.000Z', saturday, 'ja')).toBe('昨日');
    expect(relativeTime('2026-10-16T23:30:00.000Z', saturday, 'ko')).toBe('어제');
    expect(relativeTime('2026-10-16T23:30:00.000Z', saturday, 'pt-br')).toBe('ontem');
    expect(relativeTime('2026-10-12T08:00:00.000Z', saturday, 'pt-br')).toBe('seg.');
  });
});

describe('fixtureNotices', () => {
  it('gives one of every kind, newest first, hung from now', () => {
    const notices = fixtureNotices('es', NOW, WORDS, [vic, merge]);
    expect(notices.map((n) => n.kind).sort()).toEqual([
      'community',
      'community',
      'encounter',
      'world',
    ]);
    expect(notices.map((n) => n.id)).toEqual([
      'world:vic',
      'decision:req_' + 'b2'.repeat(16),
      'request:req_' + 'a1'.repeat(16),
      'encounter:numinia-anniversary-2026',
    ]);
    expect(notices.find((n) => n.kind === 'encounter')?.text).toEqual({
      before: '',
      subject: 'El Aniversario de Numinia',
      after: ' empieza en 3 días. Vas.',
    });
    expect(notices.find((n) => n.kind === 'world')?.text.subject).toBe('5 personas');
    expect(notices.find((n) => n.id.startsWith('decision'))?.text.subject).toBe('MERGE');
    expect(notices.find((n) => n.id.startsWith('request'))?.text.subject).toBe('Lucía Vidal');
  });

  it('still answers with a register of one community without a home, or none', () => {
    expect(
      fixtureNotices('es', NOW, WORDS, [merge])
        .map((n) => n.kind)
        .sort(),
    ).toEqual(['community', 'community', 'encounter', 'world']);
    expect(
      fixtureNotices('es', NOW, WORDS, [])
        .map((n) => n.kind)
        .sort(),
    ).toEqual(['community', 'community', 'encounter']);
  });
});
