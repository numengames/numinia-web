/**
 * The canon quoted in more than one place stays one string (CAN-002).
 */
import { describe, expect, it } from 'vitest';
import { EPITAPH } from '../canon';

describe('EPITAPH', () => {
  it('is the Oracle’s wording, in English, untouched', () => {
    expect(EPITAPH.startsWith('They dreamed and experimented life')).toBe(true);
    expect(EPITAPH.endsWith('they built a game with which to create a better world.')).toBe(true);
  });
});
