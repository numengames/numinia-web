/**
 * The words of the public terms page (condiciones/w3): the five locales carry
 * the same keys, every message with a hole keeps the same holes in every
 * language, and Castilian — the master — says the line the brief fixes.
 */

import { describe, expect, it } from 'vitest';
import { COMMUNITY_TERMS_PAGE_UI } from '../../i18n/community-terms-page';

const flat = (value: unknown, path = ''): [string, string][] =>
  typeof value === 'string'
    ? [[path, value]]
    : Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) =>
        flat(inner, path === '' ? key : `${path}.${key}`),
      );

const LOCALES = ['es', 'en', 'ja', 'ko', 'pt-br'] as const;
const holes = (text: string): string => (text.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('community terms page messages', () => {
  const master = flat(COMMUNITY_TERMS_PAGE_UI.es);

  it('has every locale', () => {
    expect(Object.keys(COMMUNITY_TERMS_PAGE_UI).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)('%s has the master’s keys, none empty, with the same holes', (locale) => {
    const words = new Map(flat(COMMUNITY_TERMS_PAGE_UI[locale]));
    expect([...words.keys()].sort()).toEqual(master.map(([key]) => key).sort());
    for (const [key, text] of master) {
      const own = words.get(key) ?? '';
      expect(own.trim(), `${locale} ${key}`).not.toBe('');
      expect(holes(own), `${locale} ${key}`).toBe(holes(text));
    }
  });

  it('says in Castilian what the brief fixes', () => {
    const es = COMMUNITY_TERMS_PAGE_UI.es;
    expect(es.own.none).toBe('Esta comunidad no añade normas propias: valen las de Numinia.');
    expect(es.fixed.text).toContain('Las normas de Numinia van delante');
    expect(es.own.mandatory).toBe('Obligatoria');
    expect(es.own.optional).toBe('Opcional');
  });
});
