/**
 * The Bazar's «Movimientos» section (first cut): the thirteen movements a
 * CC0 clip covers in full, each with its dictionary id and a name in every
 * locale.
 */

import { SUPPORTED_LOCALES } from '@numinia/domain';
import { describe, expect, it } from 'vitest';
import { MOVEMENTS_MESSAGES } from '../../i18n/movements';
import { MOVEMENTS, MOVEMENTS_LICENSE, MOVEMENT_ID, libraryName } from '../movements';

describe('the Bazar movements', () => {
  it('lists the thirteen movements COBERTURA.md marks covered in full, in the dictionary order', () => {
    expect(MOVEMENTS.map((m) => m.id)).toEqual([
      'GS-03',
      'EST-13',
      'EST-15',
      'EST-16',
      'EST-19',
      'REA-23',
      'REA-24',
      'MUN-32',
      'MUN-34',
      'MUN-35',
      'MUN-36',
      'MUN-37',
      'DUO-42',
    ]);
  });

  it('gives every movement a stable dictionary id, once', () => {
    const ids = MOVEMENTS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(MOVEMENT_ID);
  });

  it('names where every movement comes from', () => {
    for (const movement of MOVEMENTS) {
      expect(movement.clips.length).toBeGreaterThan(0);
      expect(libraryName(movement.library)).not.toBe('');
    }
    expect(MOVEMENTS_LICENSE).toBe('CC0-1.0');
  });

  it('names every movement in every locale, and nothing else', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const names = MOVEMENTS_MESSAGES[locale].names;
      expect(Object.keys(names).sort()).toEqual(MOVEMENTS.map((m) => m.id).sort());
      for (const name of Object.values(names)) expect(name.trim()).not.toBe('');
      expect(MOVEMENTS_MESSAGES[locale].jump).toContain('{n}');
    }
  });
});
