/**
 * The sheet file contract: a full round-trip survives byte-exact data,
 * malformed input degrades instead of exploding, and unknown domain ids
 * are dropped on import (the file is portable, not gullible).
 */

import { describe, expect, it } from 'vitest';
import { rollD6Pool } from '../lap/dice';
import { emptySheet, sheetFromMarkdown, sheetToMarkdown, SHEET_FORMAT } from '../lap/sheet';

describe('sheet markdown round-trip', () => {
  it('survives a fully populated sheet', () => {
    const sheet = emptySheet();
    sheet.identity.name = 'Aliseda';
    sheet.identity.player = 'Pablo';
    sheet.identity.species = 'biomechanical';
    sheet.identity.guild = 'alchemists';
    sheet.identity.faction = 'heirs-of-eleusis';
    sheet.attributes.strength = 3;
    sheet.attributes.charisma = 7;
    sheet.values.threshold = 5;
    sheet.values.prisma = 12;
    sheet.competences['technomancy'] = 4;
    sheet.text.weapons = 'Llave inglesa ceremonial';
    sheet.notes = 'Primera crónica.\nSegunda línea.';
    const restored = sheetFromMarkdown(sheetToMarkdown(sheet));
    expect(restored).toEqual(sheet);
  });

  it('declares its format for future migrations', () => {
    expect(sheetToMarkdown(emptySheet())).toContain(SHEET_FORMAT);
  });

  it('drops unknown domain ids but keeps free text', () => {
    const markdown = sheetToMarkdown(emptySheet())
      .replace('| species |  |', '| species | dragon-lord |')
      .replace('| name |  |', '| name | Iris |');
    const restored = sheetFromMarkdown(markdown);
    expect(restored.identity.species).toBe('');
    expect(restored.identity.name).toBe('Iris');
  });

  it('degrades on malformed numbers and garbage input', () => {
    const restored = sheetFromMarkdown('## Attributes\n| strength | many |\n| charisma | -3 |');
    expect(restored.attributes.strength).toBe(0);
    expect(restored.attributes.charisma).toBe(0);
    expect(sheetFromMarkdown('not a sheet at all')).toEqual(emptySheet());
  });

  it('clamps scores into 0..99', () => {
    const restored = sheetFromMarkdown('## Values\n| prisma | 4000 |');
    expect(restored.values.prisma).toBe(99);
  });
});

describe('dice', () => {
  it('rolls pool-many d6 within bounds and sums them', () => {
    const roll = rollD6Pool(5, () => 0.999);
    expect(roll.rolls).toHaveLength(5);
    expect(roll.rolls.every((value) => value >= 1 && value <= 6)).toBe(true);
    expect(roll.total).toBe(30);
  });

  it('never rolls on empty or negative pools', () => {
    expect(rollD6Pool(0).rolls).toHaveLength(0);
    expect(rollD6Pool(-4).rolls).toHaveLength(0);
  });
});
