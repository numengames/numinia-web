import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LORE_LOCALES,
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from '../src/types/i18n.js';

describe('i18n foundations (ADR-001, ADR-002)', () => {
  it('supports exactly the five ratified UI locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['es', 'en', 'ja', 'ko', 'pt-br']);
  });

  it('lore is restricted to Spanish and English', () => {
    expect(LORE_LOCALES).toEqual(['es', 'en']);
  });

  it('default routing locale is English (unprefixed root)', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });

  it('isSupportedLocale guards arbitrary strings', () => {
    expect(isSupportedLocale('es')).toBe(true);
    expect(isSupportedLocale('pt-br')).toBe(true);
    expect(isSupportedLocale('zh')).toBe(false);
    expect(isSupportedLocale('de')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
  });
});
