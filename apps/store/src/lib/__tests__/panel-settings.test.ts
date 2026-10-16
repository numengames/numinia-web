import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@numinia/domain';
import { PANEL_UI } from '../../i18n/panel';
import {
  DEFAULT_VOCABULARY,
  HAPPENINGS_PAGE,
  SWITCHABLE_PIECES,
  VOCABULARIES,
  isOn,
  isSwitchable,
  isVocabulary,
  termsOf,
  withVocabulary,
} from '../panel-settings';
import { PIECES } from '../panel';

describe('which pieces may be turned off', () => {
  it('are built pieces other than the summary and the settings', () => {
    expect([...SWITCHABLE_PIECES]).toEqual(['venues', 'members', 'roles', 'balance']);
    for (const id of SWITCHABLE_PIECES) {
      expect(PIECES.find((piece) => piece.id === id)?.kind).toBe('built');
    }
    expect(isSwitchable('roles')).toBe(true);
    expect(isSwitchable('summary')).toBe(false);
    expect(isSwitchable('settings')).toBe(false);
    expect(isSwitchable('agents')).toBe(false);
  });

  it('are on unless named as off', () => {
    expect(isOn('roles', [])).toBe(true);
    expect(isOn('roles', ['venues'])).toBe(true);
    expect(isOn('roles', ['venues', 'roles'])).toBe(false);
  });

  it('page «Qué ha pasado» thirty lines at a time', () => {
    expect(HAPPENINGS_PAGE).toBe(30);
  });
});

describe('the three presets of «Cómo se llama cada cosa»', () => {
  it('know their ids, and today’s wording is «mixed»', () => {
    expect([...VOCABULARIES]).toEqual(['simple', 'mixed', 'numinia']);
    expect(DEFAULT_VOCABULARY).toBe('mixed');
    expect(isVocabulary('numinia')).toBe(true);
    expect(isVocabulary('Numinia')).toBe(false);
    expect(isVocabulary(null)).toBe(false);
  });

  it('change nothing under «mixed»: the very words the panel already had', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(termsOf('mixed', locale)).toBeNull();
      expect(withVocabulary(PANEL_UI[locale], 'mixed', locale)).toBe(PANEL_UI[locale]);
    }
  });

  it('change exactly three words in every locale, and no other', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const base = PANEL_UI[locale];
      for (const vocabulary of ['simple', 'numinia'] as const) {
        const terms = termsOf(vocabulary, locale);
        expect(terms).not.toBeNull();
        const words = withVocabulary(base, vocabulary, locale);
        expect(words.names.venues).toBe(terms?.venues);
        expect(words.names.gatherings).toBe(terms?.gatherings);
        expect(words.standing.as.owner).toBe(terms?.owner);
        expect({ ...words.names, venues: '', gatherings: '' }).toEqual({
          ...base.names,
          venues: '',
          gatherings: '',
        });
        expect(words.standing.as.house).toBe(base.standing.as.house);
        expect(words.standing.as.member).toBe(base.standing.as.member);
        expect(words.leads).toBe(base.leads);
      }
    }
  });

  it('say different things: the three presets never share all three words in one locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const simple = termsOf('simple', locale);
      const numinia = termsOf('numinia', locale);
      expect(simple).not.toEqual(numinia);
      expect(simple?.venues).not.toBe(PANEL_UI[locale].names.venues);
    }
  });
});
