/**
 * «La ciudad» in the LAP's statistics: the city's figures counted from the
 * register (published communities, encounters to come, homes of their own)
 * and the live total of people inside the homes, from /api/live's answer.
 */

import { describe, expect, it } from 'vitest';
import { cityStats, insideTotal } from '../city-stats';
import { parseCommunity, parseRitual, type Community, type Ritual } from '../communities';

const BASE = {
  kind: { en: 'Conference', es: 'Congreso' },
  places: ['madrid'],
  summary: { en: 'People who make things.', es: 'Gente que hace cosas.' },
  links: [],
};

function community(id: string, extra: Record<string, unknown> = {}): Community {
  return parseCommunity(id, { ...BASE, name: id, ...extra });
}

function ritual(id: string, communityId: string, extra: Record<string, unknown> = {}): Ritual {
  return parseRitual(id, {
    community: communityId,
    title: id,
    start: '2026-10-22',
    end: '2026-10-24',
    mode: 'in-person',
    where: { en: 'Madrid', es: 'Madrid' },
    ...extra,
  });
}

describe('the city, counted from the register', () => {
  const register = [
    community('vic', { sede: { href: 'https://vic.numinia.com/' } }),
    community('trgcon'),
    community('prepared', { visibility: 'house', sede: { href: 'https://x.numinia.com/' } }),
  ];
  const rituals = [
    ritual('trg26', 'trgcon'),
    ritual('vic-1', 'vic', { start: '2026-11-02', end: '2026-11-02' }),
    ritual('trg25', 'trgcon', { status: 'held', start: '2025-10-22', end: '2025-10-24' }),
    ritual('hidden', 'prepared'),
  ];

  it('counts only what the site shows: published communities, their coming encounters, their homes', () => {
    expect(cityStats(register, rituals)).toEqual({ communities: 2, upcoming: 2, sedes: 1 });
  });

  it('says zero, not nothing, for an empty register', () => {
    expect(cityStats([], [])).toEqual({ communities: 0, upcoming: 0, sedes: 0 });
  });
});

describe('who is inside right now', () => {
  it('adds every home that answered', () => {
    expect(insideTotal({ vic: 3, 'active-inference': 0, other: 2 })).toBe(5);
  });

  it('reads the fixture’s answer (every home at zero) as zero', () => {
    expect(insideTotal({ vic: 0 })).toBe(0);
  });

  it('skips a home that did not answer, and anything that is not a count', () => {
    expect(insideTotal({ vic: 2, quiet: null, odd: '4', bad: -1, inf: Infinity })).toBe(2);
  });

  it('knows nothing when no home answered or the answer is not a map', () => {
    expect(insideTotal({ vic: null })).toBeNull();
    expect(insideTotal({})).toBeNull();
    expect(insideTotal(null)).toBeNull();
    expect(insideTotal(undefined)).toBeNull();
    expect(insideTotal(7)).toBeNull();
  });
});
