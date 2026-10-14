/**
 * The reading player's pure half (lib/speech-position.ts), ported with
 * numinia.org's own cases: a drop lands on a sentence head, a position
 * resolves to the queue the engine speaks, and the clock, the section label
 * and the saved place agree with the position.
 */

import { describe, expect, it } from 'vitest';
import {
  RATES,
  charAtSpoken,
  chunkStarts,
  clock,
  duration,
  estimate,
  locate,
  nextRate,
  parseRate,
  restorePosition,
  sectionAt,
  sentenceStart,
  sentences,
  spokenWeight,
} from '../speech-position';

const TEXT =
  'Nobody joins Numinia. You arrive, and at some point you notice. ' +
  'The first thing you meet is a word! Someone is an Alchemist… ' +
  'What that means is that they build things.';

describe('sentenceStart', () => {
  it('a drop lands on the start of the sentence it fell in', () => {
    expect(sentenceStart(TEXT, TEXT.indexOf('at some point'))).toBe(TEXT.indexOf('You arrive'));
  });
  it('a drop inside the first sentence goes to the top', () => {
    expect(sentenceStart(TEXT, 9)).toBe(0);
  });
  it('every terminal mark ends a sentence: . ! and …', () => {
    expect(sentenceStart(TEXT, TEXT.indexOf('an Alchemist'))).toBe(TEXT.indexOf('Someone'));
    expect(sentenceStart(TEXT, TEXT.indexOf('they build'))).toBe(TEXT.indexOf('What that'));
  });
  it('a drop on the space after a mark belongs to the sentence it closed', () => {
    expect(sentenceStart(TEXT, TEXT.indexOf(' You'))).toBe(0);
  });
  it('a mark inside a word does not split a sentence', () => {
    expect(sentenceStart('Version 3.5 ships today.', 15)).toBe(0);
  });
  it('a quote closed after its mark ends the sentence; a bare quote does not', () => {
    const q = '«Una cita.» Después viene otra.';
    expect(sentenceStart(q, q.indexOf('viene'))).toBe(q.indexOf('Después'));
    expect(sentenceStart('Dijo «hola» y se fue.', 15)).toBe(0);
  });
  it('a drop past either end is clamped, not thrown', () => {
    expect(sentenceStart(TEXT, 99999)).toBe(TEXT.indexOf('What that'));
    expect(sentenceStart(TEXT, -5)).toBe(0);
  });
  it('an empty text has only the top', () => {
    expect(sentenceStart('', 4)).toBe(0);
  });
});

describe('locate', () => {
  it('a position resolves to the chunk that holds it and the offset inside it', () => {
    expect(locate([0, 40, 90], 0)).toEqual({ index: 0, offset: 0 });
    expect(locate([0, 40, 90], 57)).toEqual({ index: 1, offset: 17 });
    expect(locate([0, 40, 90], 90)).toEqual({ index: 2, offset: 0 });
    expect(locate([0, 40, 90], 500)).toEqual({ index: 2, offset: 410 });
  });
  it('an empty queue is its own start', () => {
    expect(locate([], 12)).toEqual({ index: 0, offset: 12 });
  });
});

describe('clock and duration', () => {
  it('the clock reads minutes and zero-padded seconds', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(7.4)).toBe('0:07');
    expect(clock(59.6)).toBe('1:00');
    expect(clock(238)).toBe('3:58');
    expect(clock(-3)).toBe('0:00');
  });
  it('the duration follows the words and the rate', () => {
    expect(duration(360, 1)).toBe(120);
    expect(duration(360, 2)).toBe(60);
  });
  it('the button estimate says under a minute, or the rounded minutes', () => {
    expect(estimate(90, 1, 'min')).toBe('· <1 min');
    expect(estimate(1800, 1, 'min')).toBe('· ~10 min');
    expect(estimate(1800, 2, 'min')).toBe('· ~5 min');
  });
});

describe('sectionAt', () => {
  const secs = [
    { at: 0, title: 'Intro' },
    { at: 50, title: '1. The city' },
    { at: 120, title: '2. Why' },
  ];
  it('the section shown is the last heading at or before the position', () => {
    expect(sectionAt(secs, 0).title).toBe('Intro');
    expect(sectionAt(secs, 49).title).toBe('Intro');
    expect(sectionAt(secs, 50).title).toBe('1. The city');
    expect(sectionAt(secs, 9999).title).toBe('2. Why');
    expect(sectionAt(secs, 130).index).toBe(2);
  });
  it('a position before the first heading still names the first section', () => {
    expect(sectionAt([{ at: 10, title: 'Late' }], 2)).toEqual({ index: 0, at: 10, title: 'Late' });
  });
  it('with no headings there is still one section, never an empty label', () => {
    expect(sectionAt([], 42)).toEqual({ index: 0, at: 0, title: '' });
  });
});

describe('sentences (the queue)', () => {
  it('one sentence per utterance, so the light re-syncs at every sentence', () => {
    expect(sentences(TEXT)).toEqual([
      'Nobody joins Numinia.',
      'You arrive, and at some point you notice.',
      'The first thing you meet is a word!',
      'Someone is an Alchemist…',
      'What that means is that they build things.',
    ]);
  });
  it('a mark inside a word is glued back into its sentence', () => {
    expect(sentences('Version 3.5 ships. Done')).toEqual(['Version 3.5 ships.', 'Done']);
  });
  it('a closing quote after the mark belongs to the sentence it closes', () => {
    expect(sentences('«Una cita.» Después (otra.) Fin.')).toEqual([
      '«Una cita.»',
      'Después (otra.)',
      'Fin.',
    ]);
  });
  it('a sentence longer than an engine will hold is cut at a comma, never mid-word', () => {
    const long = 'word, '.repeat(80) + 'end.';
    const parts = sentences(long);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(220);
    expect(parts.join(' ')).toBe(long);
  });
  it('with no comma it is cut at a space', () => {
    const long = 'word '.repeat(80) + 'end.';
    const parts = sentences(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(' ')).toBe(long);
  });
  it('with no space at all it is cut at the limit', () => {
    const long = 'x'.repeat(500) + '.';
    expect(sentences(long).join('')).toBe(long);
  });
  it('an empty text is an empty queue', () => {
    expect(sentences('')).toEqual([]);
  });
});

describe('spoken weight', () => {
  it('a number weighs what it takes to say, not what it takes to write', () => {
    expect(spokenWeight('word')).toBe(4);
    expect(spokenWeight('1920')).toBeGreaterThanOrEqual(14);
    expect(spokenWeight('2026-09-24')).toBeGreaterThanOrEqual(30);
    expect(spokenWeight('3.5')).toBeGreaterThan(3);
    expect(spokenWeight('-5')).toBe(6.5);
  });
  it('the spoken position walks the text by weight: a date takes longer to pass', () => {
    const s = 'On 2026-09-24 we met.';
    const at = charAtSpoken(s, 12);
    expect(at).toBeGreaterThanOrEqual(s.indexOf('2026'));
    expect(at).toBeLessThan(s.indexOf(' we'));
    expect(charAtSpoken(s, 999)).toBe(s.length);
    expect(charAtSpoken(s, 0)).toBe(0);
  });
});

describe('rates', () => {
  it('the speed steps gently: 1, 1.25, 1.5, 2, then 0.75, then back to 1', () => {
    expect([...RATES]).toEqual([1, 1.25, 1.5, 2, 0.75]);
    expect(nextRate(1)).toBe(1.25);
    expect(nextRate(2)).toBe(0.75);
    expect(nextRate(0.75)).toBe(1);
    expect(nextRate(3)).toBe(1);
  });
  it('a stored speed off the dial reads as 1×', () => {
    expect(parseRate('1.5')).toBe(1.5);
    expect(parseRate('0.8')).toBe(1);
    expect(parseRate(null)).toBe(1);
  });
});

describe('chunkStarts', () => {
  it('each chunk starts where it sits in the text', () => {
    const chunks = sentences(TEXT);
    const starts = chunkStarts(TEXT, chunks);
    chunks.forEach((c, k) => expect(TEXT.slice(starts[k], starts[k]! + c.length)).toBe(c));
  });
  it('a chunk missing from the text keeps the cursor', () => {
    expect(chunkStarts('abc def', ['abc', 'zzz', 'def'])).toEqual([0, 3, 6]);
  });
});

describe('restorePosition', () => {
  const chunks = ['One.', 'Two words.', 'Three.'];
  const save = (v: unknown) => JSON.stringify(v);
  it('a matching fingerprint resumes at the saved chunk and offset', () => {
    expect(restorePosition(save({ i: 1, o: 4, n: 3 }), chunks)).toEqual({ index: 1, offset: 4 });
    expect(restorePosition(save({ i: 0, o: 2, n: 3 }), chunks)).toEqual({ index: 0, offset: 2 });
  });
  it('a broken offset degrades to the chunk start', () => {
    expect(restorePosition(save({ i: 2, o: 99, n: 3 }), chunks)).toEqual({ index: 2, offset: 0 });
    expect(restorePosition(save({ i: 2, n: 3 }), chunks)).toEqual({ index: 2, offset: 0 });
  });
  it('nothing saved, or unreadable, is nothing to resume', () => {
    expect(restorePosition(null, chunks)).toBeNull();
    expect(restorePosition('{oops', chunks)).toBeNull();
    expect(restorePosition('7', chunks)).toBeNull();
  });
  it('a re-chunked text, a bad index or the very top is stale', () => {
    expect(restorePosition(save({ i: 1, o: 0, n: 5 }), chunks)).toBe('stale');
    expect(restorePosition(save({ i: 'x', n: 3 }), chunks)).toBe('stale');
    expect(restorePosition(save({ i: 3, n: 3 }), chunks)).toBe('stale');
    expect(restorePosition(save({ i: -1, n: 3 }), chunks)).toBe('stale');
    expect(restorePosition(save({ i: 0, o: 0, n: 3 }), chunks)).toBe('stale');
  });
});
