/**
 * «Normas de vuestros espacios», the panel's pure side: the page the browser
 * is told, the draft an administrator edits, the next version to suggest,
 * and the till's problems sorted by field; plus the words in five locales.
 */

import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@numinia/domain';
import { PANEL_TERMS_UI } from '../../i18n/panel-terms';
import {
  blankPoint,
  draftBody,
  draftOf,
  idFor,
  nextVersion,
  problemsOf,
  readTermsPage,
  termsPageOf,
  withType,
  type TermsVersion,
} from '../panel-terms';

const point = {
  id: 'turno',
  titulo: 'Turno',
  texto: 'Respeta el turno.',
  obligatorio: true,
  tipo: 'norma',
} as const;
const version = (v: string): TermsVersion => ({
  version: v,
  puntos: [point],
  publishedAt: '2026-10-20T09:00:00.000Z',
});

describe('the page the browser is told', () => {
  it('drops the author of every version', () => {
    const page = termsPageOf({
      accountId: 'a',
      mayEdit: false,
      current: {
        terms: { capa: 'comunidad', version: '1.0', puntos: [point] },
        publishedAt: 'x',
        publishedBy: '0xabc',
      },
      history: [
        {
          terms: { capa: 'comunidad', version: '1.0', puntos: [point] },
          publishedAt: 'x',
          publishedBy: '0xabc',
        },
      ],
    });
    expect(JSON.stringify(page)).not.toContain('0xabc');
    expect(readTermsPage({ terms: page })).toEqual(page);
  });

  it('reads nothing out of shape', () => {
    expect(readTermsPage(null)).toBeNull();
    expect(
      readTermsPage({ terms: { accountId: 'a', mayEdit: 'sí', history: [], current: null } }),
    ).toBeNull();
    expect(
      readTermsPage({ terms: { accountId: 'a', mayEdit: true, history: [{}], current: null } }),
    ).toBeNull();
  });
});

describe('the draft', () => {
  it('starts as the version in force, each point with a key', () => {
    expect(draftOf(version('1.0')).map((p) => [p.key, p.id])).toEqual([[1, 'turno']]);
    expect(draftOf(null)).toEqual([]);
  });

  it('turns «obligatorio» off when a point becomes data, and keeps it for a norm', () => {
    expect(withType({ ...blankPoint(1), obligatorio: true }, 'datos')).toMatchObject({
      tipo: 'datos',
      obligatorio: false,
    });
    expect(withType({ ...blankPoint(1), obligatorio: true }, 'norma').obligatorio).toBe(true);
  });

  it('makes ids from titles, free ones, and keeps the ids that exist', () => {
    expect(idFor('Sin grabar', new Set())).toBe('sin-grabar');
    expect(idFor('Sin grabar', new Set(['sin-grabar']))).toBe('sin-grabar-2');
    expect(idFor('¡¡¡', new Set())).toBe('punto');
    const body = draftBody(' 1.1 ', [
      { ...blankPoint(1), id: 'turno', titulo: ' Turno ', texto: ' x ' },
      { ...blankPoint(2), titulo: 'Turno' },
      { ...blankPoint(3), titulo: 'Turno' },
    ]);
    expect(body.version).toBe('1.1');
    expect(body.puntos.map((p) => p.id)).toEqual(['turno', 'turno-2', 'turno-3']);
    expect(body.puntos[0]).toMatchObject({ titulo: 'Turno', texto: 'x' });
  });
});

describe('the next version', () => {
  it('suggests 1.0 for none, then the next minor, never one used', () => {
    expect(nextVersion([])).toBe('1.0');
    expect(nextVersion([version('1.0')])).toBe('1.1');
    expect(nextVersion([version('2')])).toBe('2.1');
    expect(nextVersion([version('1.1'), version('1.0')])).toBe('1.2');
    expect(nextVersion([version('beta')])).toBe('');
  });
});

describe('the till’s problems, by field', () => {
  it('sorts each line to its version, its point and field, or to the general ones', () => {
    const problems = problemsOf([
      'version: ya existe',
      'puntos[1].obligatorio: los datos nunca pueden ser obligatorios',
      'puntos[1].titulo: falta',
      'puntos: demasiados',
      'Hace falta el rol administrator',
    ]);
    expect(problems.version).toEqual(['ya existe']);
    expect(problems.points[1]).toEqual({
      obligatorio: ['los datos nunca pueden ser obligatorios'],
      titulo: ['falta'],
    });
    expect(problems.general).toEqual(['demasiados', 'Hace falta el rol administrator']);
  });
});

describe('the words', () => {
  it('have the same keys in every locale, no empty text, and the Castilian master says what the brief asks', () => {
    const shape = (value: unknown, path = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([key, inner]) => shape(inner, `${path}.${key}`))
        : [`${path}:${typeof value === 'string' && value.trim() !== ''}`];
    const es = shape(PANEL_TERMS_UI.es);
    for (const locale of SUPPORTED_LOCALES) expect(shape(PANEL_TERMS_UI[locale])).toEqual(es);
    expect(PANEL_TERMS_UI.es.edit.dataNote).toBe(
      'Los datos nunca pueden ser obligatorios: quien los rechaza entra igual.',
    );
    expect(PANEL_TERMS_UI.es.fixed.text).toContain('van siempre delante');
  });
});
