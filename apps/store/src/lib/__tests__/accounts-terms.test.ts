/**
 * «Normas de vuestros espacios» (condiciones/w2) in the fixture desk
 * (DATA_SOURCE=fixture), at the store's door (/api/saldo/terms) and in the
 * browser's reader and sender: the same contract as the till's. An
 * administrator publishes v1.1 and it shows in the history; whoever is not
 * one cannot publish — the desk refuses it, not only the screen.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import { NOT_MEMBER, type AccountDesk, type Asker, type DeskTermsAnswer } from '../accounts';
import { answerPublishTerms, answerTerms, boundAccounts } from '../accounts-source';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { readTermsPage } from '../panel-terms';
import { loadTerms, publishTerms } from '../panel-terms-client';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;
const NUMEN = 'acc_team_numen_games';
const INSTITUTE = 'acc_team_active_inference';
const INSTITUTE_ADMIN = `0x${'0'.repeat(38)}c3`;
const INSTITUTE_PLAIN = '0x00000000000000000000000000000000000000d4';
const quiet = () => undefined;

const fresh = (): AccountDesk => createAccountsFixtureDesk(seed, () => NOW);
const asker = (wallet = ME, house = false): Asker => ({ wallet, house });
const url = (path: string): URL => new URL(`https://numinia.test/api/saldo/${path}`);
const post = (body: unknown): Request =>
  new Request('https://numinia.test/api/saldo/terms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const json = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;
const terms = (answer: DeskTermsAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};

const POINTS = [
  {
    id: 'turno',
    titulo: 'Turno de palabra',
    texto: 'Respeta el turno.',
    obligatorio: true,
    tipo: 'norma',
  },
  { id: 'avisos', titulo: 'Avisos', texto: 'Recibir avisos.', obligatorio: false, tipo: 'datos' },
];

describe('the fixture desk: community terms', () => {
  it('shows an administrator the version in force and its history', async () => {
    const answer = terms(await fresh().communityTerms(ME, NUMEN));
    expect(answer).toMatchObject({ accountId: NUMEN, mayEdit: true });
    expect(answer.current?.terms.version).toBe('1.0');
    expect(answer.history.map((past) => past.terms.version)).toEqual(['1.0']);
  });

  it('starts with nothing published in a community that wrote none', async () => {
    const answer = terms(await fresh().communityTerms(INSTITUTE_ADMIN, INSTITUTE));
    expect(answer.current).toBeNull();
    expect(answer.history).toEqual([]);
  });

  it('lets an administrator publish v1.1: it becomes the version in force and the history grows', async () => {
    const desk = fresh();
    const done = terms(await desk.publishTerms(ME, NUMEN, { version: '1.1', puntos: POINTS }));
    expect(done.current?.terms.version).toBe('1.1');
    expect(done.current?.publishedAt).toBe(NOW.toISOString());
    expect(done.current?.publishedBy.toLowerCase()).toBe(ME);
    const after = terms(await desk.communityTerms(ME, NUMEN));
    expect(after.history.map((past) => past.terms.version)).toEqual(['1.0', '1.1']);
    expect(after.current?.terms.puntos.map((point) => point.id)).toEqual(['turno', 'avisos']);
  });

  it('refuses a plain member, in words, and writes nothing', async () => {
    const desk = fresh();
    const member = terms(await desk.communityTerms(INSTITUTE_PLAIN, INSTITUTE));
    expect(member.mayEdit).toBe(false);
    const refused = await desk.publishTerms(INSTITUTE_PLAIN, INSTITUTE, {
      version: '1.0',
      puntos: POINTS,
    });
    expect(refused.ok).toBe(false);
    expect(terms(await desk.communityTerms(INSTITUTE_ADMIN, INSTITUTE)).history).toEqual([]);
  });

  it('refuses a stranger, and a draft the validator does not accept, with every problem as path: message', async () => {
    const desk = fresh();
    expect(await desk.communityTerms(INSTITUTE_PLAIN, 'acc_nope')).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    const dataMandatory = await desk.publishTerms(ME, NUMEN, {
      version: '1.1',
      puntos: [{ ...POINTS[1], obligatorio: true }],
    });
    expect(dataMandatory.ok).toBe(false);
    if (!dataMandatory.ok) {
      expect(
        dataMandatory.problems.some((line) => line.startsWith('puntos[0].obligatorio: ')),
      ).toBe(true);
    }
    const repeated = await desk.publishTerms(ME, NUMEN, { version: '1.0', puntos: POINTS });
    expect(repeated.ok).toBe(false);
    if (!repeated.ok) expect(repeated.problems[0]).toMatch(/^version: .*ya está publicada/);
    expect(terms(await desk.communityTerms(ME, NUMEN)).history).toHaveLength(1);
    expect(
      await desk.publishTerms(INSTITUTE_PLAIN, 'acc_nope', { version: '1.0', puntos: POINTS }),
    ).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
  });
});

describe('the door: /api/saldo/terms', () => {
  it('answers a member, 401 to nobody, 400 without an account, 403 to a stranger, 503 without a desk', async () => {
    const desk = fresh();
    const ok = await answerTerms(desk, asker(), url(`terms?cuenta=${NUMEN}`), quiet);
    expect(ok.status).toBe(200);
    const page = readTermsPage(await json(ok));
    expect(page?.mayEdit).toBe(true);
    expect(page?.history).toHaveLength(1);
    expect(
      JSON.stringify(
        await json(await answerTerms(desk, asker(), url(`terms?cuenta=${NUMEN}`), quiet)),
      ),
    ).not.toContain('publishedBy');
    expect((await answerTerms(desk, null, url('terms'), quiet)).status).toBe(401);
    expect((await answerTerms(desk, asker(), url('terms'), quiet)).status).toBe(400);
    expect((await answerTerms(null, asker(), url('terms?cuenta=a'), quiet)).status).toBe(503);
    expect(
      (await answerTerms(desk, asker(INSTITUTE_PLAIN), url('terms?cuenta=acc_nope'), quiet)).status,
    ).toBe(403);
  });

  it('publishes for an administrator, and the next read shows the new version', async () => {
    const desk = fresh();
    const done = await answerPublishTerms(
      desk,
      asker(),
      post({ accountId: NUMEN, version: '1.1', puntos: POINTS }),
      quiet,
    );
    expect(done.status).toBe(200);
    expect(readTermsPage(await json(done))?.history.map((past) => past.version)).toEqual([
      '1.0',
      '1.1',
    ]);
    const again = readTermsPage(
      await json(await answerTerms(desk, asker(), url(`terms?cuenta=${NUMEN}`), quiet)),
    );
    expect(again?.current?.version).toBe('1.1');
  });

  it('refuses to publish to whoever is not an administrator: 403 at the server, nothing written', async () => {
    const desk = fresh();
    const refused = await answerPublishTerms(
      desk,
      asker(INSTITUTE_PLAIN),
      post({ accountId: INSTITUTE, version: '1.0', puntos: POINTS }),
      quiet,
    );
    expect(refused.status).toBe(403);
    expect(terms(await desk.communityTerms(INSTITUTE_ADMIN, INSTITUTE)).history).toEqual([]);
  });

  it('answers 403 with the validator’s problems for a bad draft, 400 for a body out of shape, 401, 503', async () => {
    const desk = fresh();
    const bad = await answerPublishTerms(
      desk,
      asker(),
      post({ accountId: NUMEN, version: '', puntos: [] }),
      quiet,
    );
    expect(bad.status).toBe(403);
    expect(((await json(bad))['problems'] as string[]).length).toBeGreaterThan(0);
    for (const body of [{}, { accountId: NUMEN, extra: 1, version: '1.1', puntos: [] }]) {
      expect((await answerPublishTerms(desk, asker(), post(body), quiet)).status).toBe(400);
    }
    expect((await answerPublishTerms(desk, null, post({}), quiet)).status).toBe(401);
    expect(
      (
        await answerPublishTerms(
          null,
          asker(),
          post({ accountId: NUMEN, version: '1.1', puntos: POINTS }),
          quiet,
        )
      ).status,
    ).toBe(503);
  });
});

describe('the door when the till cannot answer', () => {
  it('says 503 for a till older than these methods, 502 for one that fails or answers out of shape', async () => {
    const old = boundAccounts(
      Object.fromEntries(
        Object.keys(fresh()).map((name) => [
          name,
          name === 'communityTerms' || name === 'publishTerms'
            ? undefined
            : () => Promise.resolve({ ok: false, problems: [] }),
        ]),
      ),
    );
    expect(old).not.toBeNull();
    const logged: unknown[] = [];
    const log = (event: unknown) => logged.push(event);
    expect((await answerTerms(old, asker(), url('terms?cuenta=a'), log)).status).toBe(503);
    expect(
      (
        await answerPublishTerms(
          old,
          asker(),
          post({ accountId: 'a', version: '1', puntos: [] }),
          log,
        )
      ).status,
    ).toBe(503);
    const broken = {
      ...fresh(),
      communityTerms: () => Promise.reject(new Error('down')),
      publishTerms: () => Promise.resolve({ nope: 1 }),
    } as unknown as AccountDesk;
    expect((await answerTerms(broken, asker(), url('terms?cuenta=a'), log)).status).toBe(502);
    expect(
      (
        await answerPublishTerms(
          broken,
          asker(),
          post({ accountId: 'a', version: '1', puntos: [] }),
          log,
        )
      ).status,
    ).toBe(502);
    expect(logged.length).toBeGreaterThan(0);
  });

  it('refuses a body that is not JSON, or too big, before asking the till', async () => {
    const desk = fresh();
    const notJson = new Request('https://numinia.test/api/saldo/terms', {
      method: 'POST',
      body: 'x',
    });
    expect((await answerPublishTerms(desk, asker(), notJson, quiet)).status).toBe(415);
    const huge = post({ accountId: NUMEN, version: '1.1', puntos: 'x'.repeat(140_000) });
    expect((await answerPublishTerms(desk, asker(), huge, quiet)).status).toBe(413);
  });
});

describe('the browser: reading and publishing through the door', () => {
  const through =
    (desk: AccountDesk) =>
    async (input: string, init?: RequestInit): Promise<Response> =>
      init?.method === 'POST'
        ? answerPublishTerms(
            desk,
            asker(),
            new Request(`https://numinia.test${input}`, init),
            quiet,
          )
        : answerTerms(desk, asker(), new URL(`https://numinia.test${input}`), quiet);

  it('reads the page and publishes v1.1, which then shows in the history', async () => {
    const fetcher = through(fresh());
    const before = await loadTerms(fetcher, NUMEN);
    expect(before?.history.map((past) => past.version)).toEqual(['1.0']);
    const result = await publishTerms(fetcher, NUMEN, { version: '1.1', puntos: POINTS });
    expect(result.at).toBe('published');
    if (result.at === 'published') {
      expect(result.page.history.map((past) => past.version)).toEqual(['1.0', '1.1']);
      expect(result.page.current?.version).toBe('1.1');
    }
  });

  it('brings back the problems of a refused draft in Spanish, and says «failed» when the network does', async () => {
    const fetcher = through(fresh());
    const refused = await publishTerms(fetcher, NUMEN, {
      version: '1.0',
      puntos: [{ ...POINTS[1], obligatorio: true }],
    });
    expect(refused.at).toBe('refused');
    if (refused.at === 'refused') expect(refused.problems.length).toBeGreaterThan(0);
    expect(
      (
        await publishTerms(() => Promise.reject(new Error('offline')), NUMEN, {
          version: '1',
          puntos: [],
        })
      ).at,
    ).toBe('failed');
    expect(await loadTerms(() => Promise.reject(new Error('offline')), NUMEN)).toBeNull();
  });

  it('is null or «failed» when the answer is not JSON, out of shape, or a refusal with no problems', async () => {
    const text = () => Promise.resolve(new Response('x'));
    const body = (value: unknown, status: number) => () =>
      Promise.resolve(new Response(JSON.stringify(value), { status }));
    expect(await loadTerms(text, NUMEN)).toBeNull();
    expect(await loadTerms(body({ error: 'x' }, 403), NUMEN)).toBeNull();
    expect((await publishTerms(text, NUMEN, { version: '1', puntos: [] })).at).toBe('failed');
    expect(
      (await publishTerms(body({ terms: 1 }, 200), NUMEN, { version: '1', puntos: [] })).at,
    ).toBe('failed');
    expect(
      (await publishTerms(body({ problems: [1] }, 403), NUMEN, { version: '1', puntos: [] })).at,
    ).toBe('failed');
    expect(
      (await publishTerms(body({ error: 'x' }, 500), NUMEN, { version: '1', puntos: [] })).at,
    ).toBe('failed');
    expect((await publishTerms(body(null, 403), NUMEN, { version: '1', puntos: [] })).at).toBe(
      'failed',
    );
  });
});
