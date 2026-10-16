import { describe, expect, it } from 'vitest';
import { parseCommunity, parseRitual } from '../communities';
import { encounterMap } from '../panel-encounters';

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
