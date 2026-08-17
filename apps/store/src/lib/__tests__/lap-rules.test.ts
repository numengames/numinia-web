/**
 * The sheet rules engine (MIS-085 D): v0.6.0 creation rules over a LapSheet.
 * Enabling matrix, point-buy budgets, position derivations and the audit of
 * a file that claims points it cannot have — degrade and warn, never explode.
 */

import { describe, expect, it } from 'vitest';
import { emptySheet } from '../lap/sheet';
import { sheetRules } from '../lap/rules';

function identifiedSheet() {
  const sheet = emptySheet();
  sheet.identity.guild = 'alchemists';
  sheet.identity.faction = 'neo-atlantists';
  sheet.identity.species = 'biomechanical';
  sheet.identity.archetype = 'magician';
  sheet.identity.position = 'whisperer-of-machines';
  return sheet;
}

describe('sheetRules', () => {
  it('enables only the competences of guild, faction and species', () => {
    const rules = sheetRules(identifiedSheet());
    expect(rules.enabled.has('technomancy')).toBe(true);
    expect(rules.enabled.has('virtual-architecture')).toBe(true);
    expect(rules.enabled.has('neural-vision')).toBe(false);
    expect(rules.enabled.has('decoding')).toBe(false);
    // Blank identity enables nothing — the sheet grows as it decides.
    expect(sheetRules(emptySheet()).enabled.size).toBe(0);
  });

  it('tracks the 16-point attribute budget with per-attribute bounds', () => {
    const sheet = identifiedSheet();
    for (const key of Object.keys(sheet.attributes)) {
      sheet.attributes[key as keyof typeof sheet.attributes] = 2;
    }
    const rules = sheetRules(sheet);
    expect(rules.attributes.pool).toBe(16);
    expect(rules.attributes.spent).toBe(16);
    expect(rules.attributes.min).toBe(1);
    expect(rules.attributes.max).toBe(5);
  });

  it('derives position mechanics: bonus attribute, umbral, initiative and the aptitude pool', () => {
    const rules = sheetRules(identifiedSheet());
    // Susurrador de Máquinas: +1 Inteligencia, Umbral 3, Iniciativa 2.
    expect(rules.position?.bonusAttribute).toBe('intelligence');
    expect(rules.position?.initialUmbral).toBe(3);
    expect(rules.position?.initiative).toBe(2);
    // Affinity: guild alchemists preferred (2) + faction neo-atlantists
    // neutral (0) + species biomechanical preferred (2) + archetype magician
    // preferred (2) = 6 aptitude dice.
    expect(rules.position?.affinity).toEqual({ compatible: true, points: 6 });
  });

  it('flags an incompatible position instead of hiding it', () => {
    const sheet = identifiedSheet();
    sheet.identity.position = 'pythia';
    sheet.identity.guild = 'procurators'; // Pitia's incompatible guild tier
    expect(sheetRules(sheet).position?.affinity.compatible).toBe(false);
  });

  it('derives Aliento del Velo from Percepción', () => {
    const sheet = identifiedSheet();
    sheet.attributes.perception = 4;
    expect(sheetRules(sheet).veilBreath).toBe(4);
  });

  it('audits points sitting on disabled competences without destroying them', () => {
    const sheet = identifiedSheet();
    sheet.competences['decoding'] = 3; // disabled for this identity
    sheet.competences['technomancy'] = 2; // enabled — fine
    const rules = sheetRules(sheet);
    expect(rules.disabledWithPoints).toEqual(['decoding']);
    expect(sheet.competences['decoding']).toBe(3); // audit, not amputation
  });

  it('counts the competence budget only over decided sources', () => {
    const sheet = emptySheet();
    sheet.identity.guild = 'sentinels';
    const rules = sheetRules(sheet);
    expect(rules.competences.perSource).toBe(6);
    expect(rules.competences.pool).toBe(6); // one source decided
    expect(sheetRules(identifiedSheet()).competences.pool).toBe(18);
  });

  it('ignores identity strings that are not valid domain ids', () => {
    const sheet = emptySheet();
    sheet.identity.guild = 'dragon-lords';
    sheet.identity.position = 'nonsense';
    const rules = sheetRules(sheet);
    expect(rules.enabled.size).toBe(0);
    expect(rules.position).toBeUndefined();
  });
});
