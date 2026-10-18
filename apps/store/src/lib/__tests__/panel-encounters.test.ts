import { describe, expect, it } from 'vitest';
import { parseCommunity, parseRitual } from '../communities';
import { encounterMap, gatheringsMap } from '../panel-encounters';

const both = (text: string) => ({ es: text, en: `${text} (en)` });

function community(id: string, extra: Record<string, unknown> = {}) {
  return parseCommunity(id, {
    name: id,
    kind: both('Estudio'),
    places: ['online'],
    summary: both('Una comunidad'),
    ...extra,
  });
}

function ritual(id: string, of: string, start: string, extra: Record<string, unknown> = {}) {
  return parseRitual(id, {
    community: of,
    title: both(`Encuentro ${id}`),
    start,
    where: both('En línea'),
    ...extra,
  });
}

describe('the build-time map of each organization’s next encounters', () => {
  const communities = [
    community('numen-games', { team: 'acc_team_numen_games' }),
    community('sin-equipo'),
    community('casa', { team: 'acc_team_casa', visibility: 'house' }),
    community('callada', { team: 'acc_team_callada' }),
  ];
  const rituals = [
    ritual('b', 'numen-games', '2026-11-20T18:00:00Z', { end: '2026-11-20T20:00:00Z' }),
    ritual('a', 'numen-games', '2026-10-31', { end: '2026-11-03' }),
    ritual('held', 'numen-games', '2026-09-01', { status: 'held' }),
    ritual('c', 'numen-games', '2027-01-01'),
    ritual('d', 'numen-games', '2027-02-01'),
    ritual('otro', 'sin-equipo', '2026-12-01'),
    ritual('privado', 'casa', '2026-12-01'),
  ];
  const href = (id: string) => `/es/rituals/${id}/`;
  const NOW = new Date('2026-10-16T12:00:00.000Z');

  it('lists, per organization named in a published community, its upcoming encounters, nearest first', () => {
    expect(encounterMap(communities, rituals, 'es', href, NOW)).toEqual({
      acc_team_numen_games: [
        {
          title: 'Encuentro a',
          href: '/es/rituals/a/',
          startsAt: '2026-10-31T00:00:00.000Z',
          // A whole-day encounter is over when its last day is.
          endsAt: '2026-11-04T00:00:00.000Z',
        },
        {
          title: 'Encuentro b',
          href: '/es/rituals/b/',
          startsAt: '2026-11-20T18:00:00.000Z',
          endsAt: '2026-11-20T20:00:00.000Z',
        },
        {
          title: 'Encuentro c',
          href: '/es/rituals/c/',
          startsAt: '2027-01-01T00:00:00.000Z',
          endsAt: '2027-01-02T00:00:00.000Z',
        },
      ],
    });
  });

  it('titles them in the page’s language and keeps as many as asked', () => {
    const english = encounterMap(communities, rituals, 'en', (id) => `/rituals/${id}/`, NOW, 1);
    expect(english).toEqual({
      acc_team_numen_games: [
        {
          title: 'Encuentro a (en)',
          href: '/rituals/a/',
          startsAt: '2026-10-31T00:00:00.000Z',
          endsAt: '2026-11-04T00:00:00.000Z',
        },
      ],
    });
  });

  it('leaves out an encounter already over when the site is built, whatever its file says', () => {
    const later = new Date('2026-11-04T00:00:00.000Z');
    expect(
      encounterMap(communities, rituals, 'es', href, later)['acc_team_numen_games']?.map(
        (entry) => entry.href,
      ),
    ).toEqual(['/es/rituals/b/', '/es/rituals/c/', '/es/rituals/d/']);
    expect(
      encounterMap(communities, rituals, 'es', href, new Date('2027-03-01T00:00:00.000Z')),
    ).toEqual({});
  });
});

describe('the build-time lists of the panel’s «Encuentros», per organization', () => {
  const communities = [
    community('numen-games', { team: 'acc_team_numen_games' }),
    community('sin-equipo'),
    community('casa', { team: 'acc_team_casa', visibility: 'house' }),
  ];
  const rituals = [
    ritual('b', 'numen-games', '2026-11-20T18:00:00Z', { end: '2026-11-20T20:00:00Z' }),
    ritual('a', 'numen-games', '2026-10-31', { end: '2026-11-02' }),
    ritual('viejo', 'numen-games', '2025-09-01', { status: 'held' }),
    ritual('reciente', 'numen-games', '2026-09-01', { status: 'held' }),
    ritual('privado', 'casa', '2026-12-01'),
  ];
  const hrefs = {
    ritual: (id: string) => `/es/rituals/${id}/`,
    community: (id: string) => `/es/communities/${id}/`,
  };
  // The page derives the second account from the id (lib/community-teams.ts); here, by hand.
  const accountsOf = (id: string) => (id === 'casa' ? ['acc_t_casa'] : [`acc_t_${id}`]);

  it('gives every account of a published community its upcoming (nearest first) and held (latest first) encounters', () => {
    const map = gatheringsMap(communities, rituals, 'es', hrefs, accountsOf);
    expect(Object.keys(map).sort()).toEqual([
      'acc_t_numen-games',
      'acc_t_sin-equipo',
      'acc_team_numen_games',
    ]);
    const house = map['acc_team_numen_games'];
    expect(house).toEqual(map['acc_t_numen-games']);
    expect(house?.community).toEqual({
      id: 'numen-games',
      name: 'numen-games',
      href: '/es/communities/numen-games/',
      calendar: '/communities/numen-games/calendar.ics',
    });
    expect(house?.upcoming).toEqual([
      {
        id: 'a',
        title: 'Encuentro a',
        href: '/es/rituals/a/',
        when: 'Sáb, 31 oct – lun, 2 nov',
        year: 2026,
        where: 'En línea',
      },
      {
        id: 'b',
        title: 'Encuentro b',
        href: '/es/rituals/b/',
        when: 'Vie, 20 nov · 18:00 UTC',
        year: 2026,
        where: 'En línea',
      },
    ]);
    expect(house?.held.map((row) => [row.id, row.year])).toEqual([
      ['reciente', 2026],
      ['viejo', 2025],
    ]);
  });

  it('a published community with no encounters still has its lists, both empty', () => {
    const map = gatheringsMap(communities, rituals, 'es', hrefs, accountsOf);
    expect(map['acc_t_sin-equipo']?.upcoming).toEqual([]);
    expect(map['acc_t_sin-equipo']?.held).toEqual([]);
  });

  it('never lists a community kept on file, under any of its accounts', () => {
    const map = gatheringsMap(communities, rituals, 'es', hrefs, accountsOf);
    expect(map['acc_team_casa']).toBeUndefined();
    expect(map['acc_t_casa']).toBeUndefined();
  });

  it('speaks the page’s language', () => {
    const map = gatheringsMap(communities, rituals, 'en', hrefs, accountsOf);
    expect(map['acc_team_numen_games']?.upcoming[0]?.title).toBe('Encuentro a (en)');
    expect(map['acc_team_numen_games']?.upcoming[0]?.where).toBe('En línea (en)');
  });
});
