/**
 * The index of worlds (/mundos/, v3 cut C): which worlds it lists and what
 * each card says — only what the fleet, the till and the worlds said.
 */

import { describe, expect, it } from 'vitest';
import {
  communityCover,
  filtersOf,
  groupsOnFirst,
  onFirst,
  readableWorldName,
  readOwner,
  stateRank,
  worldCards,
  worldFilters,
  worldName,
  worldState,
  withAis,
  type CommunityAccounts,
  type FleetEntry,
  type WorldOwner,
} from '../world-index';

const HOUSE: CommunityAccounts = {
  id: 'numen-games',
  name: 'Numen Games',
  founder: true,
  accounts: ['acc_team_numen_games', 'acc_t_house'],
};
const RESET: CommunityAccounts = {
  id: 'reset',
  name: 'Reset',
  founder: false,
  accounts: ['acc_t_reset'],
};

const owner = (accountId: string, accountName = accountId): WorldOwner => ({
  accountId,
  accountName,
});

describe('worldState', () => {
  it('says on, off or under works from the phase', () => {
    expect(worldState('running', null)).toBe('on');
    expect(worldState('stopped', 3)).toBe('off');
    for (const phase of ['creating', 'importing', 'uploading', 'updating'] as const) {
      expect(worldState(phase, null)).toBe('works');
    }
  });

  it('says nothing for a world on its way, and «on» for a hand-run one only when it answered', () => {
    expect(worldState('starting', null)).toBeNull();
    expect(worldState('stopping', 2)).toBeNull();
    expect(worldState('deleting', null)).toBeNull();
    expect(worldState(null, null)).toBeNull();
    expect(worldState(null, 0)).toBe('on');
  });
});

describe('readableWorldName / worldName', () => {
  it('reads a slug as words, never prints it raw', () => {
    expect(readableWorldName('agora-plaza')).toBe('Agora Plaza');
    expect(readableWorldName('mystery-at-the-printing-house')).toBe(
      'Mystery At The Printing House',
    );
    expect(readableWorldName('alchemiststower')).toBe('Alchemiststower');
    expect(readableWorldName('pablofm_2')).toBe('Pablofm 2');
  });

  it('keeps the id when there is nothing in it to read', () => {
    expect(readableWorldName('--')).toBe('--');
    expect(readableWorldName('')).toBe('');
  });

  it('prefers the title the world states of itself', () => {
    expect(worldName('La Plaza del Ágora', 'agora-plaza')).toBe('La Plaza del Ágora');
    expect(worldName(null, 'agora-plaza')).toBe('Agora Plaza');
  });
});

describe('readOwner', () => {
  it('reads the till’s public answer: an owner, or nobody', () => {
    expect(
      readOwner({ ok: true, home: { accountId: 'a', accountName: 'A', placedAt: 'x' } }),
    ).toEqual({ accountId: 'a', accountName: 'A' });
    expect(readOwner({ ok: true, home: null, manage: false })).toBeNull();
  });

  it('keeps nothing from a refusal or an odd answer', () => {
    expect(readOwner({ ok: false, problems: ['x'] })).toBeUndefined();
    expect(readOwner(null)).toBeUndefined();
    expect(readOwner([])).toBeUndefined();
    expect(readOwner({ ok: true, home: 'a' })).toBeUndefined();
    expect(readOwner({ ok: true, home: { accountId: 'a', accountName: '' } })).toBeUndefined();
    expect(readOwner({ ok: true, home: { accountId: 1, accountName: 'A' } })).toBeUndefined();
  });
});

describe('communityCover', () => {
  const covers = { acc_t_trgcon: '/images/communities/trgcon.webp' };

  it('gives a world its community’s picture by the account that holds it', () => {
    expect(communityCover('acc_t_trgcon', covers)).toBe('/images/communities/trgcon.webp');
  });

  it('gives none to a world of no account, of an account without picture, or with no list', () => {
    expect(communityCover(null, covers)).toBeNull();
    expect(communityCover(undefined, covers)).toBeNull();
    expect(communityCover('acc_t_other', covers)).toBeNull();
    expect(communityCover('toString', covers)).toBeNull();
    expect(communityCover('acc_t_trgcon', undefined)).toBeNull();
  });
});

describe('worldCards', () => {
  const fleet: readonly FleetEntry[] = [
    { id: 'agora-plaza', phase: 'running', domain: 'agora.numen.games' },
    { id: 'bosque', phase: 'stopped', domain: 'bosque.numinia.com' },
    { id: 'old-plaza', phase: 'deleting', domain: 'old-plaza.numinia.com' },
    { id: 'tower', phase: 'creating', domain: null },
    { id: 'demo', phase: null, domain: 'demo.numinia.com' },
    { id: 'agora-plaza', phase: 'stopped', domain: 'twice.numinia.com' },
    { id: 'lost', phase: 'running', domain: 'lost.numinia.com' },
  ];
  const owners = new Map<string, WorldOwner | null>([
    ['agora-plaza', owner('acc_team_numen_games', 'Numen Games')],
    ['bosque', owner('acc_t_reset', 'Reset')],
    ['old-plaza', owner('acc_t_reset', 'Reset')],
    ['tower', owner('acc_t_house', 'Numen Games')],
    ['demo', null],
  ]);

  it('dresses a world with no picture of its own in its community’s', () => {
    const dressed = { ...RESET, image: '/images/communities/reset.webp' };
    const cards = worldCards({ fleet, owners, communities: [HOUSE, dressed] });
    expect(cards.find((card) => card.id === 'bosque')?.cover).toBe(
      '/images/communities/reset.webp',
    );
    expect(cards.find((card) => card.id === 'agora-plaza')?.cover).toBeNull();
  });

  it('lists placed worlds only, once each, never one being deleted', () => {
    const cards = worldCards({ fleet, owners, communities: [HOUSE, RESET] });
    expect(cards.map((card) => card.id)).toEqual(['agora-plaza', 'tower', 'bosque']);
  });

  it('says only what it was told: no count, no picture, the id read as words', () => {
    const [agora, tower, bosque] = worldCards({ fleet, owners, communities: [HOUSE, RESET] });
    expect(agora).toEqual({
      id: 'agora-plaza',
      name: 'Agora Plaza',
      state: 'on',
      inside: null,
      ais: null,
      cover: null,
      url: 'https://agora.numen.games/',
      community: { id: 'numen-games', name: 'Numen Games' },
      city: true,
    });
    expect(tower).toMatchObject({ state: 'works', url: null, city: true });
    expect(bosque).toMatchObject({
      state: 'off',
      city: false,
      community: { id: 'reset', name: 'Reset' },
    });
  });

  it('leaves out a world whose owner is no community of the city', () => {
    expect(
      worldCards({
        fleet: [{ id: 'portfolio', phase: 'running', domain: 'portfolio.numinia.com' }],
        owners: new Map([['portfolio', owner('acc_t_unknown', 'Somebody')]]),
        communities: [HOUSE],
      }),
    ).toEqual([]);
  });

  it('takes the count and the face the worlds gave, the picture only from the world itself', () => {
    const cards = worldCards({
      fleet,
      owners,
      communities: [HOUSE, RESET],
      inside: { bosque: 4, 'agora-plaza': null, tower: 0 },
      faces: {
        'agora-plaza': { title: 'La Plaza del Ágora', image: 'https://agora.numen.games/p.webp' },
        bosque: { title: null, image: 'https://elsewhere.example/p.webp' },
        tower: { title: 'Torre', image: 'https://tower/p.webp' },
      },
    });
    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));
    expect(byId['agora-plaza']).toMatchObject({
      name: 'La Plaza del Ágora',
      cover: 'https://agora.numen.games/p.webp',
      inside: null,
    });
    expect(byId['bosque']).toMatchObject({ name: 'Bosque', cover: null, inside: 4 });
    // «tower» has no address: its face is not believed, so its id is read as words.
    expect(byId['tower']).toMatchObject({ name: 'Tower', cover: null, inside: 0 });
    // The ones that are on, with people first.
    expect(cards[0]?.id).toBe('agora-plaza');
  });

  it('takes the AIs a world counted, only beside a count of people', () => {
    const cards = worldCards({
      fleet: [
        { id: 'a', phase: 'running', domain: 'a.numinia.com' },
        { id: 'b', phase: 'running', domain: 'b.numinia.com' },
        { id: 'c', phase: 'running', domain: 'c.numinia.com' },
        { id: 'd', phase: 'running', domain: 'd.numinia.com' },
      ],
      owners: new Map([
        ['a', owner('acc_t_reset')],
        ['b', owner('acc_t_reset')],
        ['c', owner('acc_t_reset')],
        ['d', owner('acc_t_reset')],
      ]),
      communities: [HOUSE, RESET],
      inside: { a: 3, b: 0, c: null },
      // «c» did not answer for people: whatever it said of AIs is not shown; «d» was not asked.
      ais: { a: 1, b: 2, c: 5, d: 4 },
    });
    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));
    expect(byId['a']).toMatchObject({ inside: 3, ais: 1 });
    expect(byId['b']).toMatchObject({ inside: 0, ais: 2 });
    expect(byId['c']).toMatchObject({ inside: null, ais: null });
    expect(byId['d']).toMatchObject({ inside: null, ais: null });
    // No AI map at all (an older engine, fixture): none.
    const old = worldCards({
      fleet: [{ id: 'a', phase: 'running', domain: 'a.numinia.com' }],
      owners: new Map([['a', owner('acc_t_reset')]]),
      communities: [HOUSE, RESET],
      inside: { a: 3 },
    });
    expect(old[0]).toMatchObject({ inside: 3, ais: null });
  });

  it('puts every world that is on before the ones off, even with fewer people', () => {
    const cards = worldCards({
      fleet: [
        { id: 'quiet-on', phase: 'running', domain: 'quiet-on.numinia.com' },
        { id: 'busy-off', phase: 'stopped', domain: 'busy-off.numinia.com' },
      ],
      owners: new Map([
        ['quiet-on', owner('acc_t_reset')],
        ['busy-off', owner('acc_t_reset')],
      ]),
      communities: [HOUSE, RESET],
      inside: { 'quiet-on': 0, 'busy-off': 40 },
    });
    expect(cards.map((card) => card.id)).toEqual(['quiet-on', 'busy-off']);
  });

  it('puts the city’s first between equals, then orders by name', () => {
    const cards = worldCards({
      fleet: [
        { id: 'b', phase: 'running', domain: 'b.numinia.com' },
        { id: 'a', phase: 'running', domain: 'a.numinia.com' },
        { id: 'c', phase: 'running', domain: 'c.numinia.com' },
      ],
      owners: new Map([
        ['a', owner('acc_t_reset')],
        ['b', owner('acc_t_reset')],
        ['c', owner('acc_t_house')],
      ]),
      communities: [HOUSE, RESET],
    });
    expect(cards.map((card) => card.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('filters', () => {
  const [withPeople, city, community] = worldCards({
    fleet: [
      { id: 'busy', phase: 'running', domain: 'busy.numinia.com' },
      { id: 'agora', phase: 'running', domain: 'agora.numinia.com' },
      { id: 'quiet', phase: 'stopped', domain: 'quiet.numinia.com' },
    ],
    owners: new Map([
      ['busy', owner('acc_t_reset')],
      ['agora', owner('acc_t_house')],
      ['quiet', owner('acc_t_reset')],
    ]),
    communities: [HOUSE, RESET],
    inside: { busy: 2, agora: 0 },
  });

  it('says which filters a card answers to', () => {
    expect(filtersOf(withPeople!)).toEqual(['all', 'people', 'communities']);
    expect(filtersOf(city!)).toEqual(['all', 'city']);
    expect(filtersOf(community!)).toEqual(['all', 'communities']);
  });

  it('draws a chip only when some world answers to it, «all» always', () => {
    expect(worldFilters([withPeople!, city!, community!])).toEqual([
      { id: 'all', count: 3 },
      { id: 'people', count: 1 },
      { id: 'city', count: 1 },
      { id: 'communities', count: 2 },
    ]);
    expect(worldFilters([community!])).toEqual([
      { id: 'all', count: 1 },
      { id: 'communities', count: 1 },
    ]);
    expect(worldFilters([])).toEqual([{ id: 'all', count: 0 }]);
  });
});

describe('withAis — «3 dentro · 1 IA»', () => {
  const words = { one: '1 IA', many: '{n} IAs' };

  it('adds the AIs after the people', () => {
    expect(withAis('3 dentro ahora', 1, words)).toBe('3 dentro ahora · 1 IA');
    expect(withAis('3 dentro ahora', 2, words)).toBe('3 dentro ahora · 2 IAs');
    expect(withAis('Nadie dentro ahora', 1, words)).toBe('Nadie dentro ahora · 1 IA');
  });

  it('leaves the line as it was with none, or when the world did not say', () => {
    expect(withAis('3 dentro ahora', 0, words)).toBe('3 dentro ahora');
    expect(withAis('3 dentro ahora', null, words)).toBe('3 dentro ahora');
  });
});

describe('the ones that are on come first', () => {
  const card = (id: string, state: 'on' | 'off' | 'works' | null) => ({
    id,
    name: id,
    state,
    inside: null,
    ais: null,
    cover: null,
    url: null,
    community: { id: 'reset', name: 'Reset' },
    city: false,
  });

  it('ranks on, under works, unsaid and off in that order', () => {
    expect(['off', null, 'works', 'on'].map((s) => stateRank(s as 'on' | 'off' | 'works' | null))).toEqual([3, 2, 1, 0]);
  });

  it('orders a list of cards without touching the original and keeps equals in place', () => {
    const list = [card('a', 'off'), card('b', 'on'), card('c', null), card('d', 'works'), card('e', 'on')];
    expect(onFirst(list).map((c) => c.id)).toEqual(['b', 'e', 'd', 'c', 'a']);
    expect(list.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('puts the groups holding a world that is on first, an empty group last', () => {
    const groups = [
      { name: 'empty', cards: [] as ReturnType<typeof card>[] },
      { name: 'off', cards: [card('x', 'off')] },
      { name: 'mixed', cards: [card('y', 'off'), card('z', 'on')] },
    ];
    const ordered = groupsOnFirst(groups);
    expect(ordered.map((g) => g.name)).toEqual(['mixed', 'off', 'empty']);
    expect(ordered[0]?.cards.map((c) => c.id)).toEqual(['z', 'y']);
  });

  it('puts a world under works before one whose state nobody said, in the index too', () => {
    const cards = worldCards({
      fleet: [
        { id: 'off-1', phase: 'stopped', domain: 'o.numinia.com' },
        { id: 'works-1', phase: 'creating', domain: 'w.numinia.com' },
        { id: 'on-1', phase: 'running', domain: 'n.numinia.com' },
      ],
      owners: new Map([
        ['off-1', owner('acc_t_reset')],
        ['works-1', owner('acc_t_reset')],
        ['on-1', owner('acc_t_reset')],
      ]),
      communities: [HOUSE, RESET],
    });
    expect(cards.map((c) => c.id)).toEqual(['on-1', 'works-1', 'off-1']);
  });
});
