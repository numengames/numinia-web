/**
 * «Tu agenda» (cut F): the ids the till keeps for a wallet become the
 * encounters still to come, soonest first, and the ones already over, latest
 * first; an id the register lacks is dropped.
 */

import { describe, expect, it } from 'vitest';
import { agendaEnds, agendaOf, isPast } from '../agenda';
import { parseRitual, type Ritual } from '../communities';

const NOW = new Date('2026-10-17T12:00:00.000Z');

const make = (id: string, extra: Record<string, unknown>): Ritual =>
  parseRitual(id, {
    community: 'trgcon',
    title: id,
    where: { en: 'Madrid', es: 'Madrid' },
    ...extra,
  });

const soon = make('soon', { start: '2026-10-20', end: '2026-10-20' });
const later = make('later', { start: '2026-11-05', end: '2026-11-06' });
const today = make('today', { start: '2026-10-17', end: '2026-10-17' });
const timedOver = make('timed-over', {
  start: '2026-10-17T09:00:00Z',
  end: '2026-10-17T11:00:00Z',
});
const timedOn = make('timed-on', { start: '2026-10-17T11:00:00Z', end: '2026-10-17T13:00:00Z' });
const held = make('held', { start: '2027-01-01', end: '2027-01-01', status: 'held' });
const old = make('old', { start: '2026-09-01', end: '2026-09-01' });
const ALL = [later, soon, held, old, today, timedOver, timedOn];

describe('isPast', () => {
  it('is over once held, or once its last instant is behind now', () => {
    expect(isPast(soon, NOW)).toBe(false);
    expect(isPast(today, NOW)).toBe(false);
    expect(isPast(timedOn, NOW)).toBe(false);
    expect(isPast(timedOver, NOW)).toBe(true);
    expect(isPast(old, NOW)).toBe(true);
    expect(isPast(held, NOW)).toBe(true);
  });
});

describe('agendaOf', () => {
  it('splits what is to come, soonest first, from what passed, latest first', () => {
    const agenda = agendaOf(
      ALL.map((ritual) => ritual.id),
      ALL,
      NOW,
    );
    expect(agenda.upcoming.map((ritual) => ritual.id)).toEqual([
      'today',
      'timed-on',
      'soon',
      'later',
    ]);
    expect(agenda.past.map((ritual) => ritual.id)).toEqual(['held', 'timed-over', 'old']);
  });

  it('keeps only the ids asked, drops ids the register lacks, and orders ties by id', () => {
    const twin = make('a-twin', { start: '2026-10-20', end: '2026-10-20' });
    const agenda = agendaOf(['soon', 'gone', 'a-twin'], [...ALL, twin], NOW);
    expect(agenda.upcoming.map((ritual) => ritual.id)).toEqual(['a-twin', 'soon']);
    expect(agenda.past).toEqual([]);
    expect(agendaOf([], ALL, NOW)).toEqual({ upcoming: [], past: [] });
  });
});

describe('agendaEnds', () => {
  it('maps each encounter still to come to the millisecond it ends; the ones over are left out', () => {
    const ends = agendaEnds(ALL, NOW);
    expect(Object.keys(ends).sort()).toEqual(['later', 'soon', 'timed-on', 'today']);
    expect(ends['timed-on']).toBe(Date.parse('2026-10-17T13:00:00Z'));
    expect(ends['soon']).toBeGreaterThan(NOW.getTime());
    expect(agendaEnds([], NOW)).toEqual({});
  });
});
