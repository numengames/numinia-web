/**
 * «Tus comunidades» (cut N): the grouping behind /belong/ — the
 * organizations you administer under «Las que llevas», the rest you are in
 * under «A las que perteneces», the follows that are neither under «Las que
 * sigues»; each community once, in a known order; the till's answers read
 * by hand, anything odd reading as nothing.
 */

import { describe, expect, it } from 'vitest';
import {
  belongFacts,
  countdownLine,
  daysUntil,
  groupBelong,
  readBelongFollows,
  readBelongOrgs,
  readBelongWorlds,
  type BelongFact,
} from '../belong';
import { parseCommunity, parseRitual } from '../communities';

const COMMONS = { href: 'https://plaza.numinia.com/', name: 'La Plaza del Ágora' };

const trgcon = parseCommunity('trgcon', {
  name: 'La Tarugo',
  kind: { en: 'Conference', es: 'Congreso' },
  places: ['madrid'],
  summary: { en: 'People who make things.', es: 'Gente que hace cosas.' },
  links: [],
  image: { src: '/images/trg.webp', alt: { en: 'A hall', es: 'Una nave' } },
});
const numen = parseCommunity('numen-games', {
  name: 'Numen Games',
  kind: { en: 'Studio', es: 'Estudio' },
  places: ['madrid', 'online'],
  summary: { en: 'The founder.', es: 'La fundadora.' },
  links: [],
  state: 'founder',
  team: 'acc_team_numen_games',
});
const vic = parseCommunity('vic', {
  name: 'VIC',
  kind: { en: 'Club', es: 'Club' },
  places: ['valencia'],
  summary: { en: 'A club.', es: 'Un club.' },
  links: [],
  sede: { href: 'https://vic.numinia.com/' },
});
const hidden = parseCommunity('cps', {
  name: 'CPS',
  kind: { en: 'Club', es: 'Club' },
  places: ['madrid'],
  summary: { en: 'Hidden.', es: 'Oculta.' },
  links: [],
  visibility: 'house',
});
const trg26 = parseRitual('trg26', {
  community: 'trgcon',
  title: 'TRG26',
  start: '2999-10-22',
  end: '2999-10-24',
  mode: 'in-person',
  where: { en: 'La Nave', es: 'La Nave' },
});

const derived = (id: string): Promise<string> => Promise.resolve(`acc_t_${id}`);

async function facts(): Promise<readonly BelongFact[]> {
  return belongFacts([trgcon, numen, vic, hidden], [trg26], 'es', '/es', COMMONS, derived);
}

describe('belongFacts', () => {
  it('bakes every published community with its cover, place, account ids, world and next encounter', async () => {
    const baked = await facts();
    expect(baked.map((fact) => fact.id)).toEqual(['trgcon', 'numen-games', 'vic']);
    expect(baked[0]).toEqual({
      id: 'trgcon',
      name: 'La Tarugo',
      href: '/es/communities/trgcon/',
      cover: { src: '/images/trg.webp', alt: 'Una nave' },
      monogram: 'T',
      place: 'Madrid, España',
      accountIds: ['acc_t_trgcon'],
      world: null,
      counted: false,
      next: { title: 'TRG26', href: '/es/rituals/trg26/', start: '2999-10-22' },
    });
    expect(baked[1]).toMatchObject({
      cover: null,
      accountIds: ['acc_team_numen_games', 'acc_t_numen-games'],
      world: COMMONS,
      counted: false,
      next: null,
    });
    expect(baked[2]).toMatchObject({
      world: { href: 'https://vic.numinia.com/', name: 'VIC' },
      counted: true,
    });
  });
});

describe('readBelongOrgs', () => {
  const personal = { id: 'acc_p', kind: 'personal', name: null, role: 'owner', balanceCents: 1 };
  it('keeps the teams with their role; the personal account and the house entries out', () => {
    expect(
      readBelongOrgs({
        accounts: [
          personal,
          { id: 'acc_a', kind: 'team', name: 'A', role: 'admin', balanceCents: 0 },
          { id: 'acc_b', kind: 'team', name: '', role: 'member', balanceCents: 0 },
          { id: 'acc_h', kind: 'team', name: 'H', role: 'admin', balanceCents: 0, as: 'house' },
          'odd',
        ],
      }),
    ).toEqual([
      { id: 'acc_a', name: 'A', role: 'admin' },
      { id: 'acc_b', name: 'acc_b', role: 'member' },
    ]);
  });
  it('a refusal, a wrong shape or a team without an id reads as null', () => {
    expect(readBelongOrgs(null)).toBeNull();
    expect(readBelongOrgs({ ok: false })).toBeNull();
    expect(readBelongOrgs({ accounts: [{ kind: 'team', name: 'No id' }] })).toBeNull();
  });
});

describe('readBelongFollows and readBelongWorlds', () => {
  it('read the ids, and nothing from a wrong shape', () => {
    expect(readBelongFollows({ mine: ['a', 1, 'b'] })).toEqual(['a', 'b']);
    expect(readBelongFollows(null)).toEqual([]);
    expect(readBelongFollows({ mine: 'a' })).toEqual([]);
    const worlds = readBelongWorlds({
      ok: true,
      communities: [
        { accountId: 'acc_a', worldIds: ['w1', 2, 'w2'] },
        { accountId: 'acc_b' },
        { worldIds: [] },
        null,
      ],
    });
    expect([...worlds.entries()]).toEqual([['acc_a', ['w1', 'w2']]]);
    expect(readBelongWorlds({ ok: false }).size).toBe(0);
    expect(readBelongWorlds(undefined).size).toBe(0);
  });
});

describe('groupBelong', () => {
  it('admins lead, members belong, follows are the rest — each community once, by name then register order', async () => {
    const baked = await facts();
    const groups = groupBelong(
      [
        { id: 'acc_team_numen_games', name: 'Numen Games (till)', role: 'admin' },
        { id: 'acc_t_vic', name: 'VIC', role: 'member' },
        { id: 'acc_team_other', name: 'Zeta', role: 'admin' },
        { id: 'acc_team_alpha', name: 'Alpha', role: 'admin' },
        { id: 'acc_team_other', name: 'Zeta again', role: 'admin' },
        { id: 'acc_t_numen-games', name: 'Numen twice', role: 'member' },
      ],
      ['vic', 'trgcon', 'numen-games', 'unknown'],
      new Map([['acc_team_numen_games', ['agora', 'forest']]]),
      baked,
    );
    expect(groups.lead.map((card) => [card.key, card.name, card.worldIds])).toEqual([
      ['acc_team_alpha', 'Alpha', []],
      ['numen-games', 'Numen Games', ['agora', 'forest']],
      ['acc_team_other', 'Zeta', []],
    ]);
    expect(groups.lead[1]).toMatchObject({
      role: 'admin',
      accountId: 'acc_team_numen_games',
      community: { id: 'numen-games' },
    });
    expect(groups.lead[0]?.community).toBeNull();
    expect(groups.member.map((card) => card.key)).toEqual(['vic']);
    expect(groups.member[0]).toMatchObject({ role: 'member', accountId: 'acc_t_vic' });
    expect(groups.follow.map((card) => card.key)).toEqual(['trgcon']);
    expect(groups.follow[0]).toMatchObject({
      role: 'follow',
      accountId: null,
      worldIds: [],
      community: { id: 'trgcon' },
    });
  });
  it('with nothing, three empty sections', () => {
    expect(groupBelong([], [], new Map(), [])).toEqual({ lead: [], member: [], follow: [] });
  });
});

describe('daysUntil and countdownLine', () => {
  const now = new Date('2026-10-17T15:00:00+02:00');
  const words = {
    now: 'ahora',
    tomorrow: 'mañana',
    days: 'en {n} días',
    weeks: 'en {n} semanas',
    months: 'en {n} meses',
    held: 'celebrado',
  };
  it('counts whole days to a day or an instant; an unreadable start is null', () => {
    expect(daysUntil('2026-10-17', now)).toBe(0);
    expect(daysUntil('2026-10-22', now)).toBe(5);
    expect(daysUntil('2026-10-16', now)).toBe(-1);
    expect(daysUntil('2026-10-28T18:00:00Z', now)).toBe(11);
    expect(daysUntil('soon', now)).toBeNull();
  });
  it('says the days as Countdown.astro does', () => {
    expect([-1, 0, 1, 5, 13, 14, 59, 60, 95].map((days) => countdownLine(days, words))).toEqual([
      'celebrado',
      'ahora',
      'mañana',
      'en 5 días',
      'en 13 días',
      'en 2 semanas',
      'en 8 semanas',
      'en 2 meses',
      'en 3 meses',
    ]);
  });
});
