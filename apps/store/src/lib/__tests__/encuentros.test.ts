/**
 * «Encuentros» (/calendar/): the upcoming encounters of the whole city as a
 * list, one section per month, the nearest first.
 */

import { describe, expect, it } from 'vitest';
import { parseRitual, type Ritual } from '../communities';
import { byMonth } from '../encuentros';

function ritual(id: string, start: string, end: string = start): Ritual {
  return parseRitual(id, {
    community: 'trgcon',
    title: id,
    start,
    end,
    where: { en: 'Madrid', es: 'Madrid' },
  });
}

describe('byMonth', () => {
  it('groups by the month an encounter starts, months and rows in date order', () => {
    const merge = ritual('merge', '2026-10-27');
    const trg = ritual('trg', '2026-10-22', '2026-10-24');
    const symposium = ritual('symposium', '2026-11-12T15:00:00Z', '2026-11-12T19:00:00Z');
    const months = byMonth([symposium, merge, trg], 'en');
    expect(months.map((month) => month.key)).toEqual(['2026-10', '2026-11']);
    expect(months[0]?.rituals.map((entry) => entry.id)).toEqual(['trg', 'merge']);
    expect(months[1]?.rituals.map((entry) => entry.id)).toEqual(['symposium']);
  });

  it('names each month in the page language, capitalised, Spanish or English', () => {
    const rows = [ritual('a', '2027-01-01')];
    expect(byMonth(rows, 'es')[0]?.label).toBe('Enero de 2027');
    expect(byMonth(rows, 'en')[0]?.label).toBe('January 2027');
    // The other locales read the content in English, as the rest of the register does.
    expect(byMonth(rows, 'ja')[0]?.label).toBe('January 2027');
  });

  it('keys months across a year change and pads them', () => {
    const months = byMonth([ritual('b', '2027-03-08'), ritual('a', '2026-12-31')], 'en');
    expect(months.map((month) => month.key)).toEqual(['2026-12', '2027-03']);
  });

  it('gives nothing for nothing', () => {
    expect(byMonth([], 'es')).toEqual([]);
  });
});
