/**
 * «El menú de la cara»: what the account menu reads when it opens — the
 * name published, the personal balance and the organizations — by hand,
 * and a failure of any kind leaves the static menu as it is.
 */

import { describe, expect, it } from 'vitest';
import { EMPTY_FACE, formatBalance, loadFace, panelLink, readFace } from '../face-menu';

const PERSONAL = { id: 'acc_p_1', kind: 'personal', name: null, role: 'owner', balanceCents: 1840 };
const GAMES = {
  id: 'acc_t_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'admin',
  balanceCents: 0,
};
const HOUSE = {
  id: 'acc_t_other',
  kind: 'team',
  name: 'Otra',
  role: 'admin',
  balanceCents: 0,
  as: 'house',
};

describe('reading the two answers', () => {
  it('takes the balance, the organizations the person is in and the published name', () => {
    expect(
      readFace({ accounts: [PERSONAL, GAMES] }, { ok: true, profile: { name: '  Pablo ' } }),
    ).toEqual({
      name: 'Pablo',
      balanceCents: 1840,
      panels: [{ id: 'acc_t_games', name: 'Numen Games' }],
    });
  });

  it('leaves out the organizations the house only enters', () => {
    expect(readFace({ accounts: [PERSONAL, HOUSE, GAMES] }, null).panels).toEqual([
      { id: 'acc_t_games', name: 'Numen Games' },
    ]);
  });

  it('names an organization without a name by its id, and drops an id the address would refuse', () => {
    const nameless = { ...GAMES, name: null };
    const odd = { ...GAMES, id: 'acc t/../x' };
    expect(readFace({ accounts: [nameless, odd] }, null).panels).toEqual([
      { id: 'acc_t_games', name: 'acc_t_games' },
    ]);
  });

  it('reads anything odd as nothing to show', () => {
    for (const body of [null, 'x', 7, {}, { accounts: 'no' }]) {
      expect(readFace(body, body)).toEqual(EMPTY_FACE);
    }
    expect(
      readFace({ accounts: [null, 3, { kind: 'personal', balanceCents: 'x' }] }, { profile: 3 }),
    ).toEqual(EMPTY_FACE);
    expect(readFace(null, { profile: { name: '  ' } }).name).toBeNull();
    expect(readFace(null, { profile: { name: 4 } }).name).toBeNull();
    expect(
      readFace({ accounts: [{ ...PERSONAL, balanceCents: Number.POSITIVE_INFINITY }] }, null)
        .balanceCents,
    ).toBeNull();
  });
});

describe("asking the page's two routes", () => {
  const route =
    (answers: Record<string, () => Response | Promise<Response>>) =>
    async (input: string): Promise<Response> => {
      const answer = answers[input];
      if (answer === undefined) throw new Error('no route');
      return answer();
    };
  const json =
    (body: unknown, status = 200) =>
    () =>
      new Response(JSON.stringify(body), { status });

  it('reads both at once', async () => {
    const face = await loadFace(
      route({
        '/api/saldo': json({ accounts: [PERSONAL, GAMES] }),
        '/api/profile': json({ ok: true, profile: { name: 'Pablo' } }),
      }),
    );
    expect(face.name).toBe('Pablo');
    expect(face.balanceCents).toBe(1840);
    expect(face.panels).toHaveLength(1);
  });

  it('keeps what one route gave when the other fails', async () => {
    const face = await loadFace(
      route({ '/api/saldo': json({ accounts: [PERSONAL] }), '/api/profile': json({}, 503) }),
    );
    expect(face).toEqual({ name: null, balanceCents: 1840, panels: [] });
  });

  it('reads a failing network, a 401 and a body that is not JSON as nothing', async () => {
    expect(await loadFace(route({}))).toEqual(EMPTY_FACE);
    expect(
      await loadFace(
        route({
          '/api/saldo': json({ error: 'No session' }, 401),
          '/api/profile': () => new Response('<html>'),
        }),
      ),
    ).toEqual(EMPTY_FACE);
  });
});

describe('the figure and the links', () => {
  it("writes euros in the reader's language", () => {
    expect(formatBalance(1840, 'es')).toContain('18,40');
    expect(formatBalance(1840, 'en')).toContain('18.40');
    expect(formatBalance(1840, 'en')).toContain('€');
  });

  it('carries the organization in the address, encoded', () => {
    expect(panelLink('/es/panel/', 'acc_t_games')).toBe('/es/panel/?org=acc_t_games');
    expect(panelLink('/panel/', 'a b')).toBe('/panel/?org=a%20b');
  });
});
