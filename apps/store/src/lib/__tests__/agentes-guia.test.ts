/**
 * «Conectar una IA», the guide: which screen goes back to which, which steps
 * and extras each AI has, the two numbers the answers give (pinned to the
 * relay's own source), and the cutting of a line on its bold words.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BODIES_AT_ONCE,
  CHOOSE,
  EXPLAIN,
  FAQ_GLYPHS,
  GUIDE_CLIENTS,
  GUIDE_WAYS,
  IDLE_MINUTES,
  STEPS_KEYS,
  STEP_COUNT,
  backOf,
  extraOf,
  openClient,
  openWay,
  pieces,
  signsIn,
  stepsKeyOf,
  withPlace,
  withWay,
  type GuideView,
} from '../agentes-guia';

type Steps = Extract<GuideView, { at: 'steps' }>;
const steps = (view: GuideView): Steps => {
  if (view.at !== 'steps') throw new Error('not a steps view');
  return view;
};

describe('the way through the dialog', () => {
  it('opens the steps of an AI: Hermes on the computer, another one on the code', () => {
    expect(openClient('claude')).toEqual({
      at: 'steps',
      client: 'claude',
      place: 'computer',
      way: 'code',
    });
    expect(steps(openClient('other', 'key')).way).toBe('key');
  });

  it('sends each way’s card where it leads: the address to the tiles, the others to «Otra»', () => {
    expect(openWay('address')).toBe(CHOOSE);
    expect(openWay('code')).toEqual(openClient('other', 'code'));
    expect(openWay('key')).toEqual(openClient('other', 'key'));
    expect(GUIDE_WAYS).toEqual(['address', 'code', 'key']);
  });

  it('changes Hermes’ tab and another AI’s tab only on their own screens', () => {
    const hermes = openClient('hermes');
    expect(steps(withPlace(hermes, 'cloud')).place).toBe('cloud');
    expect(withPlace(openClient('claude'), 'cloud')).toEqual(openClient('claude'));
    expect(withPlace(CHOOSE, 'cloud')).toBe(CHOOSE);
    const other = openClient('other');
    expect(steps(withWay(other, 'key')).way).toBe('key');
    expect(withWay(hermes, 'key')).toBe(hermes);
    expect(withWay(EXPLAIN, 'key')).toBe(EXPLAIN);
  });

  it('goes back from the steps to the tiles, from the tiles to the three ways, and no further', () => {
    expect(backOf(openClient('chatgpt'))).toBe(CHOOSE);
    expect(backOf(CHOOSE)).toBe(EXPLAIN);
    expect(backOf(EXPLAIN)).toBeNull();
  });
});

describe('the steps of each AI', () => {
  it('names one list per AI, two for Hermes and two for another AI', () => {
    expect(stepsKeyOf(steps(openClient('claude')))).toBe('claude');
    expect(stepsKeyOf(steps(openClient('chatgpt')))).toBe('chatgpt');
    expect(stepsKeyOf(steps(openClient('hermes')))).toBe('hermes-computer');
    expect(stepsKeyOf(steps(withPlace(openClient('hermes'), 'cloud')))).toBe('hermes-cloud');
    expect(stepsKeyOf(steps(openClient('other')))).toBe('other-code');
    expect(stepsKeyOf(steps(openClient('other', 'key')))).toBe('other-key');
    expect(GUIDE_CLIENTS).toEqual(['claude', 'chatgpt', 'hermes', 'other']);
    expect(STEPS_KEYS).toHaveLength(6);
  });

  it('puts the address under the first step of the app ways and Hermes in the cloud, and the Hermes link on the computer', () => {
    expect(extraOf('claude', 0)).toBe('address');
    expect(extraOf('chatgpt', 0)).toBe('address');
    expect(extraOf('hermes-cloud', 0)).toBe('address');
    expect(extraOf('hermes-computer', 0)).toBe('hermes-link');
    expect(extraOf('hermes-cloud', 1)).toBe('terminal');
  });

  it('puts the code button first for the code way, then the address, then the Hermes line', () => {
    expect([0, 1, 2].map((index) => extraOf('other-code', index))).toEqual([
      'create-code',
      'address',
      'token-command',
    ]);
    expect(extraOf('other-key', 0)).toBe('create-key');
  });

  it('shows the sign-in picture for the AIs that sign in, not for the code or the key', () => {
    expect(STEPS_KEYS.filter(signsIn)).toEqual([
      'claude',
      'chatgpt',
      'hermes-computer',
      'hermes-cloud',
    ]);
  });

  it('has nothing under the steps that carry only words, nor beyond the third', () => {
    expect(extraOf('claude', 1)).toBeNull();
    expect(extraOf('claude', 2)).toBeNull();
    expect(extraOf('claude', STEP_COUNT)).toBeNull();
    expect(extraOf('other-key', 2)).toBeNull();
  });
});

describe('the questions and the two numbers', () => {
  it('has nine questions, each with its own glyph', () => {
    expect(FAQ_GLYPHS).toHaveLength(9);
    expect(new Set(FAQ_GLYPHS).size).toBe(9);
  });

  it('gives the numbers the relay really uses: three bodies at once, ten idle minutes', () => {
    const folder = new URL('../../../../mcp/src/', import.meta.url);
    const seats = readFileSync(new URL('plazas.ts', folder), 'utf8');
    const body = readFileSync(new URL('cuerpo.ts', folder), 'utf8');
    expect(seats).toContain(`export const MAX_BODIES = ${BODIES_AT_ONCE};`);
    expect(body).toContain(`export const IDLE_MS = ${IDLE_MINUTES} * 60_000;`);
  });
});

describe('a line with bold words', () => {
  it('cuts on the marks', () => {
    expect(pieces('Entra y **elige** la comunidad.')).toEqual([
      { text: 'Entra y ', bold: false },
      { text: 'elige', bold: true },
      { text: ' la comunidad.', bold: false },
    ]);
    expect(pieces('**Solo** eso')).toEqual([
      { text: 'Solo', bold: true },
      { text: ' eso', bold: false },
    ]);
  });

  it('leaves a plain line whole and drops nothing for an empty one', () => {
    expect(pieces('nada en negrita')).toEqual([{ text: 'nada en negrita', bold: false }]);
    expect(pieces('')).toEqual([]);
  });

  it('keeps an unpaired mark as plain text', () => {
    expect(pieces('a **b** c ** d')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c ** d', bold: false },
    ]);
    expect(pieces('a**b')).toEqual([{ text: 'a**b', bold: false }]);
  });
});
