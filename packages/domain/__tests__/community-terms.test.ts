import { describe, expect, it } from 'vitest';
import {
  COMMUNITY_TERMS_FORMAT,
  COMMUNITY_TERMS_LAYER,
  type PublishedCommunityTerms,
} from '../src/types/community-terms.js';
import {
  currentCommunityTerms,
  publishCommunityTerms,
  TERMS_POINTS_MAX,
  TERMS_TEXT_MAX,
  TERMS_TITLE_MAX,
  TERMS_VERSION_MAX,
  validateCommunityTerms,
} from '../src/validators/community-terms.js';

const rules = {
  id: 'respeto',
  titulo: 'Trato respetuoso',
  texto: 'Aquí nos tratamos con respeto.',
  obligatorio: true,
  tipo: 'norma',
};
const report = {
  id: 'informe',
  titulo: 'Informe de la sesión',
  texto: 'Enviar un informe anónimo de rendimiento.',
  obligatorio: false,
  tipo: 'datos',
};
const draft = (over: Record<string, unknown> = {}) => ({
  version: '1.0',
  puntos: [rules, report],
  ...over,
});
const paths = (value: unknown) => {
  const result = validateCommunityTerms(value);
  if (result.ok) throw new Error('expected a refusal');
  return result.issues.map((i) => `${i.path}:${i.code}`);
};

describe('community terms — format identical to the world file (condiciones@1)', () => {
  it('accepts a valid draft and gives back the world file layer', () => {
    const result = validateCommunityTerms(draft());
    expect(result).toEqual({
      ok: true,
      value: { capa: 'comunidad', version: '1.0', puntos: [rules, report] },
    });
  });

  it('writes exactly the keys of the engine point, tipo included', () => {
    const result = validateCommunityTerms(draft({ puntos: [{ ...rules, extra: 'x' }] }));
    if (!result.ok) throw new Error('should be valid');
    expect(Object.keys(result.value.puntos[0]!).sort()).toEqual(
      ['id', 'obligatorio', 'texto', 'tipo', 'titulo'].sort(),
    );
    expect(Object.keys(result.value).sort()).toEqual(['capa', 'puntos', 'version']);
  });

  it('names the format and the layer the engine reads', () => {
    expect(COMMUNITY_TERMS_FORMAT).toBe('condiciones@1');
    expect(COMMUNITY_TERMS_LAYER).toBe('comunidad');
  });

  it('accepts the format and layer when the draft states them', () => {
    expect(validateCommunityTerms(draft({ formato: 'condiciones@1', capa: 'comunidad' })).ok).toBe(
      true,
    );
  });

  it('refuses another format or layer', () => {
    expect(paths(draft({ formato: 'condiciones@2' }))).toEqual(['formato:format']);
    expect(paths(draft({ capa: 'casa' }))).toEqual(['capa:layer']);
  });

  it('a point with no tipo is a norma (the engine default)', () => {
    const { tipo: _tipo, ...bare } = rules;
    void _tipo;
    const result = validateCommunityTerms(draft({ puntos: [bare] }));
    expect(result.ok && result.value.puntos[0]?.tipo).toBe('norma');
  });

  it('refuses a tipo that is neither norma nor datos', () => {
    expect(paths(draft({ puntos: [{ ...rules, tipo: 'otro' }] }))).toEqual(['puntos[0].tipo:type']);
  });

  it('refuses what is not an object', () => {
    for (const bad of [null, undefined, 'x', 3, [], [draft()]]) {
      expect(paths(bad)).toEqual([':format']);
    }
  });
});

describe('community terms — version', () => {
  it('needs 1 to 40 characters of text', () => {
    expect(validateCommunityTerms(draft({ version: 'v'.repeat(TERMS_VERSION_MAX) })).ok).toBe(true);
    for (const bad of [undefined, '', '   ', 'v'.repeat(TERMS_VERSION_MAX + 1), 2]) {
      expect(paths(draft({ version: bad }))).toEqual(['version:version']);
    }
  });
});

describe('community terms — points', () => {
  it('refuses empty points: none, not a list, or too many', () => {
    expect(paths(draft({ puntos: [] }))).toEqual(['puntos:points']);
    expect(paths(draft({ puntos: undefined }))).toEqual(['puntos:points']);
    expect(paths(draft({ puntos: 'x' }))).toEqual(['puntos:points']);
    const many = Array.from({ length: TERMS_POINTS_MAX + 1 }, (_, n) => ({
      ...rules,
      id: `p${n}`,
    }));
    expect(paths(draft({ puntos: many }))).toEqual(['puntos:points']);
    expect(validateCommunityTerms(draft({ puntos: many.slice(0, TERMS_POINTS_MAX) })).ok).toBe(
      true,
    );
  });

  it('refuses repeated ids and says which', () => {
    const result = validateCommunityTerms(draft({ puntos: [rules, { ...report, id: 'respeto' }] }));
    if (result.ok) throw new Error('expected a refusal');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ path: 'puntos[1].id', code: 'id-repeated' });
    expect(result.issues[0]?.message).toContain('«respeto»');
  });

  it('refuses ids that are not lower-case, digits and hyphens (max 32)', () => {
    for (const bad of ['', 'Uso', 'con espacio', '-pronto', 'ñ', 'a'.repeat(33), 7, undefined]) {
      expect(paths(draft({ puntos: [{ ...rules, id: bad }] }))).toEqual(['puntos[0].id:id']);
    }
    expect(validateCommunityTerms(draft({ puntos: [{ ...rules, id: 'a'.repeat(32) }] })).ok).toBe(
      true,
    );
    expect(validateCommunityTerms(draft({ puntos: [{ ...rules, id: '1-a' }] })).ok).toBe(true);
  });

  it('refuses a title or text that is empty, blank or too long', () => {
    expect(
      validateCommunityTerms(draft({ puntos: [{ ...rules, titulo: 't'.repeat(TERMS_TITLE_MAX) }] }))
        .ok,
    ).toBe(true);
    expect(
      validateCommunityTerms(draft({ puntos: [{ ...rules, texto: 't'.repeat(TERMS_TEXT_MAX) }] }))
        .ok,
    ).toBe(true);
    for (const bad of ['', '  ', 'x'.repeat(TERMS_TITLE_MAX + 1), 5, undefined]) {
      expect(paths(draft({ puntos: [{ ...rules, titulo: bad }] }))).toEqual([
        'puntos[0].titulo:title',
      ]);
    }
    for (const bad of ['', '\n', 'x'.repeat(TERMS_TEXT_MAX + 1), null]) {
      expect(paths(draft({ puntos: [{ ...rules, texto: bad }] }))).toEqual([
        'puntos[0].texto:text',
      ]);
    }
  });

  it('needs obligatorio to be true or false', () => {
    for (const bad of ['sí', 1, undefined]) {
      expect(paths(draft({ puntos: [{ ...rules, obligatorio: bad }] }))).toEqual([
        'puntos[0].obligatorio:mandatory',
      ]);
    }
  });

  it('refuses a point that is not an object, once per problem', () => {
    expect(paths(draft({ puntos: ['x'] }))).toEqual([
      'puntos[0].id:id',
      'puntos[0].titulo:title',
      'puntos[0].texto:text',
      'puntos[0].obligatorio:mandatory',
    ]);
  });

  it('collects the problems of every point', () => {
    expect(
      paths(
        draft({
          version: '',
          puntos: [
            { ...rules, id: 'A' },
            { ...report, titulo: '' },
          ],
        }),
      ),
    ).toEqual(['version:version', 'puntos[0].id:id', 'puntos[1].titulo:title']);
  });
});

describe('community terms — a data point is never mandatory (EDPB 05/2020 §39)', () => {
  it('refuses datos + obligatorio and tells how to fix it', () => {
    const result = validateCommunityTerms(draft({ puntos: [{ ...report, obligatorio: true }] }));
    if (result.ok) throw new Error('expected a refusal');
    expect(result.issues).toHaveLength(1);
    const [issue] = result.issues;
    expect(issue).toMatchObject({ path: 'puntos[0].obligatorio', code: 'data-mandatory' });
    expect(issue?.message).toMatch(/opcional/);
    expect(issue?.message).toMatch(/norma/);
  });

  it('accepts a datos point that is optional and a norma that is mandatory or optional', () => {
    expect(validateCommunityTerms(draft({ puntos: [report] })).ok).toBe(true);
    expect(validateCommunityTerms(draft({ puntos: [{ ...rules, obligatorio: false }] })).ok).toBe(
      true,
    );
    expect(validateCommunityTerms(draft({ puntos: [rules] })).ok).toBe(true);
  });
});

describe('community terms — versioning keeps the history', () => {
  const at = new Date('2026-10-20T12:00:00.000Z');
  const later = new Date('2026-10-21T08:30:00.000Z');

  it('has no current version before the first publication', () => {
    expect(currentCommunityTerms([])).toBeUndefined();
  });

  it('publishes the first version with who and when', () => {
    const first = publishCommunityTerms([], draft(), '0xabc', at);
    if (!first.ok) throw new Error('expected a publication');
    expect(first.published).toEqual({
      terms: { capa: 'comunidad', version: '1.0', puntos: [rules, report] },
      publishedAt: '2026-10-20T12:00:00.000Z',
      publishedBy: '0xabc',
    });
    expect(first.history).toEqual([first.published]);
    expect(currentCommunityTerms(first.history)).toBe(first.published);
  });

  it('a new version keeps the earlier ones and becomes the current', () => {
    const first = publishCommunityTerms([], draft(), '0xabc', at);
    if (!first.ok) throw new Error('first');
    const before: readonly PublishedCommunityTerms[] = first.history;
    const second = publishCommunityTerms(
      before,
      draft({ version: '1.1', puntos: [rules] }),
      '0xdef',
      later,
    );
    if (!second.ok) throw new Error('second');
    expect(second.history.map((h) => h.terms.version)).toEqual(['1.0', '1.1']);
    expect(second.history[0]).toBe(first.published);
    expect(currentCommunityTerms(second.history)?.terms.puntos).toEqual([rules]);
    expect(currentCommunityTerms(second.history)?.publishedBy).toBe('0xdef');
    expect(before).toHaveLength(1); // the history passed in is not touched
  });

  it('refuses a version that was already published, without case', () => {
    const first = publishCommunityTerms([], draft({ version: 'V1' }), '0xabc', at);
    if (!first.ok) throw new Error('first');
    for (const same of ['V1', 'v1']) {
      const again = publishCommunityTerms(first.history, draft({ version: same }), '0xabc', later);
      if (again.ok) throw new Error('expected a refusal');
      expect(again.issues).toHaveLength(1);
      expect(again.issues[0]).toMatchObject({ path: 'version', code: 'version-repeated' });
      expect(again.issues[0]?.message).toContain('ya está publicada');
    }
  });

  it('an earlier version stays taken even when it is not the current one', () => {
    const first = publishCommunityTerms([], draft({ version: '1' }), 'a', at);
    if (!first.ok) throw new Error('first');
    const second = publishCommunityTerms(first.history, draft({ version: '2' }), 'a', later);
    if (!second.ok) throw new Error('second');
    expect(publishCommunityTerms(second.history, draft({ version: '1' }), 'a', later).ok).toBe(
      false,
    );
  });

  it('publishes nothing when the draft is invalid', () => {
    const result = publishCommunityTerms([], draft({ puntos: [] }), '0xabc', at);
    if (result.ok) throw new Error('expected a refusal');
    expect(result.issues.map((i) => i.code)).toEqual(['points']);
  });
});
