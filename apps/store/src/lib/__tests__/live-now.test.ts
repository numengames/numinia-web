/**
 * «Ahora en la ciudad»: only worlds with someone inside, only numbers.
 */

import { describe, expect, it } from 'vitest';
import { insideLine, peopleInside, totalInside } from '../live-now';

describe('peopleInside', () => {
  it('keeps the worlds with someone inside', () => {
    expect(peopleInside({ inside: { agora: 3, trgcon: 0, merge: null, ai: 1 } })).toEqual({
      agora: 3,
      ai: 1,
    });
  });

  it('reads anything odd as nobody', () => {
    for (const body of [null, 'x', 7, {}, { inside: null }, { inside: 'x' }]) {
      expect(peopleInside(body)).toEqual({});
    }
    expect(peopleInside({ inside: { a: -2, b: 1.5, c: '4', d: Number.NaN } })).toEqual({});
  });
});

describe('insideLine', () => {
  const words = { one: '1 persona dentro ahora', many: '{n} personas dentro ahora' };

  it('says one or many in the page’s words', () => {
    expect(insideLine(1, words)).toBe('1 persona dentro ahora');
    expect(insideLine(12, words)).toBe('12 personas dentro ahora');
  });
});

describe('totalInside', () => {
  it('adds every world', () => {
    expect(totalInside({ a: 2, b: 5 })).toBe(7);
    expect(totalInside({})).toBe(0);
  });
});
