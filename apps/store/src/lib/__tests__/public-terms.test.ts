/**
 * «Normas de la comunidad» in public (condiciones/w3): the JSON anybody reads
 * (page, w4, AIs). What is under test: only what is publishable leaves — the
 * version in force with its points and the number and date of every version,
 * never who published, never the account; the cache words; 400 / 404 / 503 /
 * 502; and the fixture desk, which answers the same contract as the till.
 */

import { describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk } from '../accounts';
import { boundAccounts } from '../accounts-source';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { LEGAL_DOC_VERSION } from '../legal';
import {
  PUBLIC_TERMS_API,
  PUBLIC_TERMS_CACHE,
  PUBLIC_TERMS_SCHEMA,
  answerPublicTerms,
  numiniaTermsPath,
  readPublicTerms,
  termsPagePath,
} from '../public-terms';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const seed = deskSeed as unknown as AccountsSeed;
const quiet = vi.fn();
const everyone = () => true;
const url = (query: string) => new URL(`https://numinia.com${PUBLIC_TERMS_API}${query}`);
const json = async (response: Response): Promise<unknown> => response.json();

const POINT = {
  id: 'turno',
  titulo: 'Turno de palabra',
  texto: 'Respeta el turno.',
  obligatorio: true,
  tipo: 'norma',
} as const;

function tillAnswer(overrides: Record<string, unknown> = {}): unknown {
  return {
    ok: true,
    communityId: 'numen-games',
    current: {
      terms: { capa: 'comunidad', version: '1.1', puntos: [POINT] },
      publishedAt: '2026-10-20T10:00:00.000Z',
    },
    history: [
      { version: '1.0', publishedAt: '2026-10-19T10:00:00.000Z' },
      { version: '1.1', publishedAt: '2026-10-20T10:00:00.000Z' },
    ],
    ...overrides,
  };
}

const deskOf = (value: unknown): AccountDesk =>
  ({ publicTerms: vi.fn(async () => value) }) as unknown as AccountDesk;

describe('paths', () => {
  it('puts the page under the community, in the locale, and Numinia’s terms under legal', () => {
    expect(termsPagePath('es', 'vic')).toBe('/es/communities/vic/normas/');
    expect(termsPagePath('en', 'vic')).toBe('/communities/vic/normas/');
    expect(termsPagePath('pt-br', 'vic')).toBe('/pt-br/communities/vic/normas/');
    expect(numiniaTermsPath('es')).toBe('/es/legal/terms/');
    expect(numiniaTermsPath('en')).toBe('/legal/terms/');
  });
});

describe('answerPublicTerms', () => {
  it('answers the version in force and the history, with the cache a public read may have', async () => {
    const response = await answerPublicTerms(
      deskOf(tillAnswer()),
      url('?comunidad=numen-games'),
      everyone,
      quiet,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PUBLIC_TERMS_CACHE);
    expect(PUBLIC_TERMS_CACHE).toContain('s-maxage=300');
    expect(await json(response)).toEqual({
      schema: PUBLIC_TERMS_SCHEMA,
      ok: true,
      communityId: 'numen-games',
      page: '/es/communities/numen-games/normas/',
      numinia: { terms: '/es/legal/terms/', version: LEGAL_DOC_VERSION.terms },
      current: {
        capa: 'comunidad',
        version: '1.1',
        puntos: [POINT],
        publishedAt: '2026-10-20T10:00:00.000Z',
      },
      history: [
        { version: '1.0', publishedAt: '2026-10-19T10:00:00.000Z' },
        { version: '1.1', publishedAt: '2026-10-20T10:00:00.000Z' },
      ],
    });
  });

  it('never lets an author or an account through, even when the till sent them', async () => {
    const leaky = tillAnswer({
      accountId: 'acc_t_secret',
      mayEdit: true,
      current: {
        terms: { capa: 'comunidad', version: '1.0', puntos: [POINT] },
        publishedAt: '2026-10-20T10:00:00.000Z',
        publishedBy: `0x${'ab'.repeat(20)}`,
      },
      history: [
        {
          version: '1.0',
          publishedAt: '2026-10-20T10:00:00.000Z',
          publishedBy: `0x${'ab'.repeat(20)}`,
        },
      ],
    });
    const text = JSON.stringify(
      await json(await answerPublicTerms(deskOf(leaky), url('?comunidad=vic'), everyone, quiet)),
    );
    expect(text).not.toContain('publishedBy');
    expect(text).not.toContain('0xab');
    expect(text).not.toContain('acc_t_secret');
    expect(text).not.toContain('mayEdit');
    expect(text).not.toContain('accountId');
  });

  it('answers a community with nothing published: current null, empty history — not a refusal', async () => {
    const response = await answerPublicTerms(
      deskOf(tillAnswer({ communityId: 'vic', current: null, history: [] })),
      url('?comunidad=vic'),
      everyone,
      quiet,
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ ok: true, current: null, history: [] });
  });

  it('is a 400 for what is not a community id, without asking the till', async () => {
    const desk = deskOf(tillAnswer());
    for (const query of [
      '',
      '?comunidad=',
      '?comunidad=Numen Games',
      '?comunidad=-x',
      '?cuenta=acc_t_1',
    ]) {
      const response = await answerPublicTerms(desk, url(query), everyone, quiet);
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(desk.publicTerms).not.toHaveBeenCalled();
  });

  it('is a 404 for a community that is not public, without asking the till', async () => {
    const desk = deskOf(tillAnswer());
    const response = await answerPublicTerms(
      desk,
      url('?comunidad=prepared'),
      (id) => id !== 'prepared',
      quiet,
    );
    expect(response.status).toBe(404);
    expect(await json(response)).toEqual({ error: 'not-found' });
    expect(desk.publicTerms).not.toHaveBeenCalled();
  });

  it('says 503, uncached, when no till is bound or the till lacks the method', async () => {
    const unbound = await answerPublicTerms(null, url('?comunidad=vic'), everyone, quiet);
    expect(unbound.status).toBe(503);
    expect(unbound.headers.get('cache-control')).toBe('no-store');
    const old = boundAccounts({
      ...Object.fromEntries(
        Object.entries(createAccountsFixtureDesk(seed, () => NOW)).filter(
          ([name]) => name !== 'publicTerms',
        ),
      ),
    });
    expect(old).not.toBeNull();
    const lacking = await answerPublicTerms(old, url('?comunidad=vic'), everyone, quiet);
    expect(lacking.status).toBe(503);
  });

  it('says 502, uncached, when the till fails or answers something odd', async () => {
    const failing = { publicTerms: vi.fn(async () => Promise.reject(new Error('down'))) };
    const down = await answerPublicTerms(
      failing as unknown as AccountDesk,
      url('?comunidad=vic'),
      everyone,
      quiet,
    );
    expect(down.status).toBe(502);
    expect(down.headers.get('cache-control')).toContain('no-store');
    const odd = await answerPublicTerms(
      deskOf({ nope: 1 }),
      url('?comunidad=vic'),
      everyone,
      quiet,
    );
    expect(odd.status).toBe(502);
  });

  it('passes the till’s refusal as a 400 with its words, uncached', async () => {
    const response = await answerPublicTerms(
      deskOf({ ok: false, problems: ['communityId must be a community id'] }),
      url('?comunidad=vic'),
      everyone,
      quiet,
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await json(response)).toEqual({
      error: 'refused',
      problems: ['communityId must be a community id'],
    });
  });
});

describe('readPublicTerms (the page’s reading)', () => {
  it('gives the document, or the response that says why not', async () => {
    const read = await readPublicTerms(deskOf(tillAnswer()), 'numen-games', quiet);
    expect(read.ok && read.doc.current?.version).toBe('1.1');
    const none = await readPublicTerms(null, 'numen-games', quiet);
    expect(none.ok).toBe(false);
    expect(!none.ok && none.response.status).toBe(503);
  });
});

describe('the fixture desk answers the same contract', () => {
  const desk = (): AccountDesk => createAccountsFixtureDesk(seed, () => NOW);

  it('shows the seeded terms of Numen Games without who published them', async () => {
    const response = await answerPublicTerms(
      desk(),
      url('?comunidad=numen-games'),
      everyone,
      quiet,
    );
    expect(response.status).toBe(200);
    const body = (await json(response)) as {
      current: { version: string; puntos: { id: string; tipo: string }[] };
      history: { version: string }[];
    };
    expect(body.current.version).toBe('1.0');
    expect(body.current.puntos.map((point) => point.id)).toEqual(['turno', 'grabar', 'avisos']);
    expect(body.current.puntos.map((point) => point.tipo)).toEqual(['norma', 'norma', 'datos']);
    expect(body.history).toEqual([{ version: '1.0', publishedAt: '2026-10-20T09:00:00.000Z' }]);
    expect(JSON.stringify(body)).not.toContain('publishedBy');
    expect(JSON.stringify(body)).not.toContain('0xab');
  });

  it('answers nothing published for a community without terms', async () => {
    const response = await answerPublicTerms(desk(), url('?comunidad=vic'), everyone, quiet);
    expect(await json(response)).toMatchObject({
      ok: true,
      communityId: 'vic',
      current: null,
      history: [],
    });
  });

  it('shows what the house published for a community it opened, and only that community’s', async () => {
    const fixture = desk();
    const HOUSE = `0x${'99'.repeat(20)}`;
    const opened = await fixture.ensureCommunityTeam(HOUSE, true, 'vic', 'Vic');
    if (!opened.ok) throw new Error(opened.problems.join());
    const draft = (version: string) => ({ version, puntos: [POINT] });
    for (const version of ['1.0', '1.1']) {
      const published = await fixture.publishTerms(HOUSE, opened.account.id, draft(version), true);
      expect(published.ok).toBe(true);
    }
    const body = (await json(
      await answerPublicTerms(fixture, url('?comunidad=vic'), everyone, quiet),
    )) as { current: { version: string }; history: { version: string }[] };
    expect(body.current.version).toBe('1.1');
    expect(body.history.map((entry) => entry.version)).toEqual(['1.0', '1.1']);
    const other = (await json(
      await answerPublicTerms(fixture, url('?comunidad=reset'), everyone, quiet),
    )) as { current: unknown };
    expect(other.current).toBeNull();
  });

  it('refuses what is not a community id', async () => {
    const answer = await desk().publicTerms('Not A Community');
    expect(answer.ok).toBe(false);
  });
});
