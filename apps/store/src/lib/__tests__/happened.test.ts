import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@numinia/domain';
import { PANEL_SUMMARY_UI } from '../../i18n/panel-summary';
import type { DeskHappening } from '../accounts';
import { oldestOf, whatOf, whoOf, withPage, type HappenedWords } from '../happened';

const WALLET = `0x${'ab'.repeat(20)}`;
const OTHER = `0x${'cd'.repeat(20)}`;
const words: HappenedWords = {
  acts: { 'role-created': 'Rol creado', 'member-added': 'Persona añadida' },
  generic: 'Algo cambió',
  house: 'La casa',
  houseNamed: 'La casa ({name})',
};

const line = (seq: number, patch: Partial<DeskHappening> = {}): DeskHappening => ({
  seq,
  at: '2026-10-15T12:00:00.000Z',
  actor: WALLET,
  actorName: null,
  asHouse: false,
  act: 'role-created',
  subject: null,
  detail: null,
  ...patch,
});

describe('who did it', () => {
  it('is the published name, else a short wallet', () => {
    expect(whoOf(line(1, { actorName: 'Pablo' }), words)).toBe('Pablo');
    expect(whoOf(line(1), words)).toBe(`${WALLET.slice(0, 6)}…${WALLET.slice(-4)}`);
  });

  it('is «la casa», with the name it published when it has one', () => {
    expect(whoOf(line(1, { asHouse: true }), words)).toBe('La casa');
    expect(whoOf(line(1, { asHouse: true, actorName: 'Ursa' }), words)).toBe('La casa (Ursa)');
  });
});

describe('what was done', () => {
  it('is the act’s phrase, with the name it carries and who it was to', () => {
    expect(whatOf(line(1), words)).toBe('Rol creado');
    expect(whatOf(line(1, { detail: { name: 'Finanzas' } }), words)).toBe('Rol creado · Finanzas');
    expect(whatOf(line(1, { act: 'member-added', subject: OTHER }), words)).toBe(
      `Persona añadida → ${OTHER.slice(0, 6)}…${OTHER.slice(-4)}`,
    );
  });

  it('is a safe generic sentence for an act it does not know, never the id', () => {
    for (const act of ['future-act', 'constructor', '__proto__', 'toString']) {
      expect(whatOf(line(1, { act: act as DeskHappening['act'] }), words)).toBe('Algo cambió');
    }
  });

  it('knows every act of the log in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const said = PANEL_SUMMARY_UI[locale].latest;
      for (const act of Object.keys(said.acts)) {
        expect(whatOf(line(1, { act: act as DeskHappening['act'] }), said)).toBe(
          said.acts[act as keyof typeof said.acts],
        );
      }
      expect(said.generic.length).toBeGreaterThan(0);
      expect(said.houseNamed).toContain('{name}');
    }
  });
});

describe('the pages', () => {
  it('end at the oldest line seen', () => {
    expect(oldestOf([line(9), line(4)])).toBe(4);
    expect(oldestOf([])).toBeNull();
  });

  it('are appended, a line seen twice kept once', () => {
    const shown = [line(9), line(8)];
    expect(withPage(shown, [line(8), line(7)]).map((entry) => entry.seq)).toEqual([9, 8, 7]);
    expect(withPage([], [line(1)])).toHaveLength(1);
  });
});
