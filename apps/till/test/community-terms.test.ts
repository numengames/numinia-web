/**
 * «Normas de vuestros espacios» (condiciones/w1, 2026-10-20): migration 0024
 * on the D1 shim and the two functions that keep a community's terms
 * (`src/db/community-terms.ts`). The format and its rules are tested in
 * @numinia/domain; here: who may publish, that every version is kept, that
 * a refused draft writes nothing, and that the database itself forbids
 * changing a published version.
 */

import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { communityTerms, publishTerms, type TermsAnswer } from '../src/db/community-terms';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab'); // founds the community: an owner
const MARIA = wallet('cd'); // a member
const LEO = wallet('ee'); // an administrator, not an owner
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;
const T0 = new Date('2026-10-20T12:00:00.000Z');
const T1 = new Date('2026-10-21T08:30:00.000Z');

const norma = {
  id: 'respeto',
  titulo: 'Trato respetuoso',
  texto: 'Aquí nos tratamos con respeto.',
  obligatorio: true,
  tipo: 'norma',
};
const datos = {
  id: 'informe',
  titulo: 'Informe de la sesión',
  texto: 'Enviar un informe anónimo de rendimiento.',
  obligatorio: false,
  tipo: 'datos',
};
const draft = (version: string, puntos: unknown[] = [norma, datos]) => ({ version, puntos });

async function scene() {
  const shim = migratedTill();
  const desk = new AccountDesk(ctx, { TILL_DB: shim.db });
  const made = await desk.createTeam(PABLO, 'Numen');
  if (!made.ok) throw new Error(made.problems.join());
  const id = made.account.id;
  for (const [who, role] of [
    [MARIA, 'member'],
    [LEO, 'admin'],
  ] as const) {
    const added = await desk.setMember(PABLO, id, who, role);
    if (!added.ok) throw new Error(added.problems.join());
  }
  return { ...shim, desk, id };
}

const ok = (answer: TermsAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};
const problems = (answer: TermsAnswer): readonly string[] => {
  if (answer.ok) throw new Error('expected a refusal');
  return answer.problems;
};
const stored = (sqlite: Awaited<ReturnType<typeof scene>>['sqlite']): number =>
  Number(sqlite.prepare('SELECT COUNT(*) AS n FROM community_terms').get()?.['n']);

describe('migration 0024: every published version is kept', () => {
  it('is a STRICT table keyed by organization and version number', async () => {
    const { sqlite } = await scene();
    expect(
      sqlite
        .prepare(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('community_terms') ORDER BY cid`,
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { name: 'account_id', type: 'TEXT', notnull: 1, pk: 1 },
      { name: 'seq', type: 'INTEGER', notnull: 1, pk: 2 },
      { name: 'version', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'points', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'published_by', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'published_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
  });

  it('refuses a row that is not a version of an existing organization', async () => {
    const { sqlite, id } = await scene();
    const insert = (account: string, version: string, points: string, by: string, at: string) =>
      sqlite
        .prepare(
          'INSERT INTO community_terms (account_id, seq, version, points, published_by, published_at) VALUES (?, 1, ?, ?, ?, ?)',
        )
        .run(account, version, points, by, at);
    const points = JSON.stringify([norma]);
    const at = T0.toISOString();
    expect(() => insert('acc-nobody', '1.0', points, PABLO, at)).toThrow(/FOREIGN KEY/);
    expect(() => insert(id, '', points, PABLO, at)).toThrow(/CHECK/);
    expect(() => insert(id, 'v'.repeat(41), points, PABLO, at)).toThrow(/CHECK/);
    expect(() => insert(id, '1.0', '{"a":1}', PABLO, at)).toThrow(/CHECK/);
    expect(() => insert(id, '1.0', '[]', PABLO, at)).toThrow(/CHECK/);
    expect(() => insert(id, '1.0', 'no json', PABLO, at)).toThrow(/CHECK/);
    expect(() => insert(id, '1.0', points, 'someone', at)).toThrow(/CHECK/);
    expect(() => insert(id, '1.0', points, PABLO, 'yesterday')).toThrow(/CHECK/);
    expect(stored(sqlite)).toBe(0);
    insert(id, '1.0', points, PABLO, at);
    expect(stored(sqlite)).toBe(1);
  });

  it('never changes or deletes a published version, and reads one version name once, without case', async () => {
    const s = await scene();
    ok(await publishTerms(s.db, PABLO, s.id, draft('V1'), false, T0));
    expect(() => s.sqlite.prepare("UPDATE community_terms SET version = 'x'").run()).toThrow(
      'a published version of the terms is kept',
    );
    expect(() => s.sqlite.prepare('DELETE FROM community_terms').run()).toThrow(
      'a published version of the terms is kept',
    );
    expect(() =>
      s.sqlite
        .prepare(
          "INSERT INTO community_terms (account_id, seq, version, points, published_by, published_at) VALUES (?, 2, 'v1', '[1]', ?, ?)",
        )
        .run(s.id, PABLO, T1.toISOString()),
    ).toThrow(/UNIQUE/);
    expect(stored(s.sqlite)).toBe(1);
  });
});

describe('reading a community’s terms', () => {
  it('shows none before the first publication, and who may publish', async () => {
    const s = await scene();
    for (const [who, mayEdit] of [
      [PABLO, true],
      [LEO, true],
      [MARIA, false],
    ] as const) {
      expect(ok(await communityTerms(s.db, who, s.id, false, T0))).toEqual({
        ok: true,
        accountId: s.id,
        current: null,
        history: [],
        mayEdit,
      });
    }
  });

  it('is for members and the house, not for a stranger', async () => {
    const s = await scene();
    expect(problems(await communityTerms(s.db, STRANGER, s.id, false, T0))).toEqual([
      PROBLEMS.notMember,
    ]);
  });

  it('refuses what it cannot read, naming each argument', async () => {
    const s = await scene();
    expect(problems(await communityTerms(s.db, 'nobody', 7, 'yes', T0))).toEqual([
      PROBLEMS.wallet,
      PROBLEMS.accountId,
      ORG_PROBLEMS.house,
    ]);
    expect(problems(await publishTerms(s.db, 'nobody', 7, draft('1'), 'yes', T0))).toEqual([
      PROBLEMS.wallet,
      PROBLEMS.accountId,
      ORG_PROBLEMS.house,
    ]);
  });

  it('writes down the house’s read (ORG-009)', async () => {
    const s = await scene();
    ok(await communityTerms(s.db, HOUSE, s.id, true, T0));
    const lines = s.sqlite
      .prepare("SELECT act, detail FROM team_log WHERE act = 'house-read'")
      .all()
      .map((row) => ({ ...row }));
    expect(lines).toEqual([{ act: 'house-read', detail: '{"what":"community-terms"}' }]);
  });
});

describe('publishing a version', () => {
  it('keeps the first version with who and when, as the file’s comunidad layer', async () => {
    const s = await scene();
    const first = ok(await publishTerms(s.db, PABLO, s.id, draft('1.0'), false, T0));
    const published = {
      terms: { capa: 'comunidad', version: '1.0', puntos: [norma, datos] },
      publishedAt: T0.toISOString(),
      publishedBy: PABLO,
    };
    expect(first).toEqual({
      ok: true,
      accountId: s.id,
      current: published,
      history: [published],
      mayEdit: true,
    });
    expect(ok(await communityTerms(s.db, MARIA, s.id, false, T1))).toEqual({
      ok: true,
      accountId: s.id,
      current: published,
      history: [published],
      mayEdit: false,
    });
  });

  it('a new version becomes the current one and the earlier ones stay, oldest first', async () => {
    const s = await scene();
    ok(await publishTerms(s.db, PABLO, s.id, draft('1.0'), false, T0));
    const second = ok(await publishTerms(s.db, LEO, s.id, draft('1.1', [norma]), false, T1));
    expect(second.history.map((h) => h.terms.version)).toEqual(['1.0', '1.1']);
    expect(second.history.map((h) => h.publishedBy)).toEqual([PABLO, LEO]);
    expect(second.current?.terms.puntos).toEqual([norma]);
    const again = ok(await communityTerms(s.db, PABLO, s.id, false, T1));
    expect(again.history).toEqual(second.history);
    expect(again.history[0]?.terms.puntos).toEqual([norma, datos]);
    expect(
      s.sqlite
        .prepare('SELECT seq, version FROM community_terms ORDER BY seq')
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { seq: 1, version: '1.0' },
      { seq: 2, version: '1.1' },
    ]);
  });

  it('versions are kept apart per community', async () => {
    const s = await scene();
    const other = await s.desk.createTeam(PABLO, 'Otra');
    if (!other.ok) throw new Error('team');
    ok(await publishTerms(s.db, PABLO, s.id, draft('1.0'), false, T0));
    ok(await publishTerms(s.db, PABLO, other.account.id, draft('1.0', [norma]), false, T0));
    expect(ok(await communityTerms(s.db, PABLO, other.account.id, false, T0)).history).toHaveLength(
      1,
    );
    expect(ok(await communityTerms(s.db, PABLO, s.id, false, T0)).history[0]?.terms.puntos).toEqual(
      [norma, datos],
    );
  });

  it('refuses a version that was already published, without case, and writes nothing', async () => {
    const s = await scene();
    ok(await publishTerms(s.db, PABLO, s.id, draft('V1'), false, T0));
    for (const same of ['V1', 'v1']) {
      const refused = problems(await publishTerms(s.db, PABLO, s.id, draft(same), false, T1));
      expect(refused).toHaveLength(1);
      expect(refused[0]).toMatch(/^version: .*ya está publicada/);
    }
    expect(stored(s.sqlite)).toBe(1);
  });

  it('refuses a data point that is mandatory, saying how to fix it, and writes nothing', async () => {
    const s = await scene();
    const refused = problems(
      await publishTerms(
        s.db,
        PABLO,
        s.id,
        draft('1.0', [{ ...datos, obligatorio: true }]),
        false,
        T0,
      ),
    );
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatch(
      /^puntos\[0\]\.obligatorio: Un permiso de datos no puede ser obligatorio/,
    );
    expect(refused[0]).toMatch(/opcional/);
    expect(stored(s.sqlite)).toBe(0);
  });

  it('refuses empty points and repeated ids, one line per problem', async () => {
    const s = await scene();
    expect(problems(await publishTerms(s.db, PABLO, s.id, draft('1.0', []), false, T0))).toEqual([
      expect.stringMatching(/^puntos: Hacen falta de 1 a 20 puntos/),
    ]);
    expect(
      problems(await publishTerms(s.db, PABLO, s.id, draft('1.0', [norma, norma]), false, T0)),
    ).toEqual([
      expect.stringMatching(/^puntos\[1\]\.id: Hay dos puntos con el identificador «respeto»/),
    ]);
    expect(stored(s.sqlite)).toBe(0);
  });

  it('only an administrator publishes; a member or a stranger is refused, nothing written', async () => {
    const s = await scene();
    expect(problems(await publishTerms(s.db, MARIA, s.id, draft('1.0'), false, T0))).toEqual([
      expect.stringMatching(/administrator/),
    ]);
    expect(problems(await publishTerms(s.db, STRANGER, s.id, draft('1.0'), false, T0))).toEqual([
      PROBLEMS.notMember,
    ]);
    expect(
      problems(await publishTerms(s.db, PABLO, 'acc-nobody', draft('1.0'), false, T0)),
    ).toEqual([PROBLEMS.notMember]);
    expect(stored(s.sqlite)).toBe(0);
  });

  it('the house, as an administrator in the alpha, may publish too — as its own wallet', async () => {
    const s = await scene();
    const answer = await publishTerms(s.db, HOUSE, s.id, draft('1.0'), true, T0);
    expect(answer.ok ? answer.current?.publishedBy : problems(answer)).toBe(HOUSE);
  });

  it('answers that the community changed when a version took its place meanwhile', async () => {
    const s = await scene();
    let raced = false;
    const racing = {
      batch: s.db.batch.bind(s.db),
      prepare(query: string) {
        const statement = s.db.prepare(query);
        if (!query.includes('FROM community_terms WHERE account_id = ?1 ORDER BY seq'))
          return statement;
        return {
          bind: (...values: unknown[]) => {
            const bound = statement.bind(...values);
            return {
              ...bound,
              all: async <T>() => {
                const result = await bound.all<T>();
                if (!raced) {
                  raced = true;
                  ok(await publishTerms(s.db, LEO, s.id, draft('2.0'), false, T0));
                }
                return result;
              },
            } as unknown as D1PreparedStatement;
          },
        } as unknown as D1PreparedStatement;
      },
    };
    expect(problems(await publishTerms(racing, PABLO, s.id, draft('2.0'), false, T1))).toEqual([
      PROBLEMS.meanwhile,
    ]);
    expect(stored(s.sqlite)).toBe(1);
  });
});

describe('a stored row that no longer passes the domain', () => {
  it('fails closed instead of showing it', async () => {
    const s = await scene();
    s.sqlite
      .prepare(
        'INSERT INTO community_terms (account_id, seq, version, points, published_by, published_at) VALUES (?, 1, ?, ?, ?, ?)',
      )
      .run(s.id, '1.0', JSON.stringify([{ ...datos, obligatorio: true }]), PABLO, T0.toISOString());
    await expect(communityTerms(s.db, PABLO, s.id, false, T1)).rejects.toThrow(
      'community terms 1 no longer pass the domain',
    );
  });
});

describe('the desk the store calls: communityTerms and publishTerms (condiciones/w2)', () => {
  it('lets an administrator publish v1.1 through the desk and shows it in the history', async () => {
    const s = await scene();
    ok(await s.desk.publishTerms(PABLO, s.id, draft('1.0')));
    const done = ok(await s.desk.publishTerms(LEO, s.id, draft('1.1', [norma])));
    expect(done.current?.terms.version).toBe('1.1');
    const read = ok(await s.desk.communityTerms(MARIA, s.id));
    expect(read.history.map((past) => past.terms.version)).toEqual(['1.0', '1.1']);
    expect(read.mayEdit).toBe(false);
  });

  it('refuses a member and a stranger at the desk, and writes nothing', async () => {
    const s = await scene();
    expect(problems(await s.desk.publishTerms(MARIA, s.id, draft('1.0'))).length).toBeGreaterThan(
      0,
    );
    expect(
      problems(await s.desk.publishTerms(STRANGER, s.id, draft('1.0'))).length,
    ).toBeGreaterThan(0);
    expect(stored(s.sqlite)).toBe(0);
  });

  it('answers the validator’s problems as path: message, in Spanish', async () => {
    const s = await scene();
    const refused = problems(
      await s.desk.publishTerms(PABLO, s.id, draft('1.0', [{ ...datos, obligatorio: true }])),
    );
    expect(refused.some((line) => line.startsWith('puntos[0].obligatorio: '))).toBe(true);
  });
});
