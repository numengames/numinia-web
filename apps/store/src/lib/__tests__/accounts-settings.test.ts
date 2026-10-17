/**
 * «Ajustes de la comunidad» and «Qué ha pasado» (cut 8) in the fixture desk
 * (DATA_SOURCE=fixture), at the store's door (lib/accounts-source.ts) and in
 * the browser's readers (lib/accounts.ts): the same contract as the till's.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import {
  NOT_MEMBER,
  readHappenings,
  readSettings,
  type AccountDesk,
  type Asker,
  type DeskHappeningsAnswer,
  type DeskSettingsAnswer,
} from '../accounts';
import {
  accountsFrom,
  answerChangeSettings,
  answerHappened,
  answerSettings,
  boundAccounts,
} from '../accounts-source';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { DEFAULT_AI_MODEL, DEFAULT_AI_TRIAL_CAP_CENTS } from '../panel-settings';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;
const NUMEN = 'acc_team_numen_games';
const INSTITUTE = 'acc_team_active_inference';
const INSTITUTE_PLAIN = '0x00000000000000000000000000000000000000d4';
const quiet = () => undefined;

const fresh = (): AccountDesk => createAccountsFixtureDesk(seed, () => NOW);
const asker = (wallet = ME, house = false): Asker => ({ wallet, house });
const url = (path: string): URL => new URL(`https://numinia.test/api/saldo/${path}`);
const post = (body: unknown): Request =>
  new Request('https://numinia.test/api/saldo/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const settingsOf = (answer: DeskSettingsAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};
const happened = (answer: DeskHappeningsAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};
const json = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe('the fixture desk: settings', () => {
  it('starts as today: nothing off, the «mixed» words; the owner may edit', async () => {
    const desk = fresh();
    expect(settingsOf(await desk.settings(ME, NUMEN))).toEqual({
      ok: true,
      accountId: NUMEN,
      off: [],
      vocabulary: 'mixed',
      mayEdit: true,
      aiAgent: {
        enabled: true,
        model: DEFAULT_AI_MODEL,
        trialCapCents: DEFAULT_AI_TRIAL_CAP_CENTS,
      },
    });
  });

  it('turns pieces off in the order of the panel and picks the words; each change is logged', async () => {
    const desk = fresh();
    const done = settingsOf(
      await desk.changeSettings(ME, NUMEN, { off: ['roles', 'venues'], vocabulary: 'simple' }),
    );
    expect(done).toMatchObject({ off: ['venues', 'roles'], vocabulary: 'simple' });
    expect(settingsOf(await desk.settings(ME, NUMEN))).toMatchObject({ off: ['venues', 'roles'] });
    const lines = happened(await desk.happenings(ME, NUMEN)).lines;
    expect(lines[0]).toMatchObject({
      act: 'settings-changed',
      actor: ME,
      detail: { off: 'venues,roles', vocabulary: 'simple' },
    });
  });

  it('writes nothing when nothing changes', async () => {
    const desk = fresh();
    await desk.changeSettings(ME, NUMEN, { vocabulary: 'numinia' });
    const before = happened(await desk.happenings(ME, NUMEN)).lines.length;
    await desk.changeSettings(ME, NUMEN, { vocabulary: 'numinia', off: [] });
    expect(happened(await desk.happenings(ME, NUMEN)).lines).toHaveLength(before);
  });

  it('refuses a malformed change in words', async () => {
    const desk = fresh();
    const loose = desk.changeSettings as (...args: unknown[]) => Promise<DeskSettingsAnswer>;
    for (const change of [null, {}, { other: 1 }, 'x']) {
      expect((await loose(ME, NUMEN, change)).ok).toBe(false);
    }
    expect(await loose(ME, NUMEN, { off: ['summary'], vocabulary: 'x' })).toEqual({
      ok: false,
      problems: [
        'off must be a list of pieces, each once',
        'vocabulary must be one of: simple, mixed, numinia',
      ],
    });
    expect((await loose(ME, NUMEN, { off: ['roles', 'roles'] })).ok).toBe(false);
    expect((await loose(ME, NUMEN, { off: 'roles' })).ok).toBe(false);
  });

  it('turns the AI agent off and on, logging each flip', async () => {
    const desk = fresh();
    const off = settingsOf(await desk.changeSettings(ME, NUMEN, { aiAgentEnabled: false }));
    expect(off.aiAgent).toEqual({
      enabled: false,
      model: DEFAULT_AI_MODEL,
      trialCapCents: DEFAULT_AI_TRIAL_CAP_CENTS,
    });
    expect(settingsOf(await desk.settings(ME, NUMEN)).aiAgent.enabled).toBe(false);
    const on = settingsOf(await desk.changeSettings(ME, NUMEN, { aiAgentEnabled: true }));
    expect(on.aiAgent.enabled).toBe(true);
    const lines = happened(await desk.happenings(ME, NUMEN)).lines;
    expect(lines.map((line) => line.detail)).toEqual([
      { aiAgentEnabled: 'true' },
      { aiAgentEnabled: 'false' },
    ]);
  });

  it('writes nothing when the AI agent is already in the asked state', async () => {
    const desk = fresh();
    const before = happened(await desk.happenings(ME, NUMEN)).lines.length;
    expect(
      settingsOf(await desk.changeSettings(ME, NUMEN, { aiAgentEnabled: true })).aiAgent.enabled,
    ).toBe(true);
    expect(happened(await desk.happenings(ME, NUMEN)).lines).toHaveLength(before);
  });

  it('lets a plain member read but not change; a stranger neither', async () => {
    const desk = fresh();
    expect(settingsOf(await desk.settings(INSTITUTE_PLAIN, INSTITUTE))).toMatchObject({
      mayEdit: false,
    });
    const refused = await desk.changeSettings(INSTITUTE_PLAIN, INSTITUTE, { off: ['roles'] });
    expect(refused.ok).toBe(false);
    expect(await desk.settings(INSTITUTE_PLAIN, 'acc_nope')).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    expect((await desk.changeSettings(INSTITUTE_PLAIN, 'acc_nope', { off: [] })).ok).toBe(false);
  });

  it('lets the house in as the house, and writes its reads down on the first page only', async () => {
    const desk = fresh();
    const house = `0x${'99'.repeat(20)}`;
    await desk.settings(house, INSTITUTE, true);
    const first = happened(await desk.happenings(house, INSTITUTE, null, true));
    expect(first.lines.map((line) => [line.act, line.asHouse, line.detail])).toEqual([
      ['house-read', true, { what: 'happenings' }],
      ['house-read', true, { what: 'settings' }],
    ]);
    await desk.happenings(house, INSTITUTE, 1_000_000, true);
    expect(happened(await desk.happenings(house, INSTITUTE, null, true)).lines).toHaveLength(3);
  });
});

describe('the fixture desk: «Qué ha pasado»', () => {
  it('pages thirty lines, newest first, from the line given', async () => {
    const desk = fresh();
    for (let i = 0; i < 34; i += 1) {
      await desk.changeSettings(ME, NUMEN, { vocabulary: i % 2 === 0 ? 'simple' : 'numinia' });
    }
    const first = happened(await desk.happenings(ME, NUMEN));
    expect(first.lines).toHaveLength(30);
    expect(first.more).toBe(true);
    const seqs = first.lines.map((line) => line.seq);
    expect([...seqs].sort((a, b) => b - a)).toEqual(seqs);
    const rest = happened(await desk.happenings(ME, NUMEN, seqs.at(-1)));
    expect(rest.lines).toHaveLength(4);
    expect(rest.more).toBe(false);
  });

  it('names the author when they published a name', async () => {
    const desk = createAccountsFixtureDesk(
      { ...seed, profiles: [{ wallet: ME, name: 'Pablo', avatar: null }] },
      () => NOW,
    );
    await desk.changeSettings(ME, NUMEN, { vocabulary: 'simple' });
    expect(happened(await desk.happenings(ME, NUMEN)).lines[0]?.actorName).toBe('Pablo');
    const bare = fresh();
    await bare.changeSettings(ME, NUMEN, { vocabulary: 'simple' });
    expect(happened(await bare.happenings(ME, NUMEN)).lines[0]?.actorName).toBeNull();
  });

  it('refuses a stranger and a cursor that is not a line number', async () => {
    const desk = fresh();
    expect((await desk.happenings(INSTITUTE_PLAIN, 'acc_nope')).ok).toBe(false);
    expect(await desk.happenings(ME, NUMEN, -3)).toEqual({
      ok: false,
      problems: ['before must be the number of a line of the log, or null'],
    });
  });
});

describe('the door: /api/saldo/settings and /api/saldo/happened', () => {
  it('answers settings to a member, 401 to nobody, 400 without an account, 403 to a stranger', async () => {
    const desk = fresh();
    const ok = await answerSettings(desk, asker(), url(`settings?cuenta=${NUMEN}`), quiet);
    expect(ok.status).toBe(200);
    expect((await json(ok))['settings']).toMatchObject({ off: [], mayEdit: true });
    expect((await answerSettings(desk, null, url('settings'), quiet)).status).toBe(401);
    expect((await answerSettings(desk, asker(), url('settings'), quiet)).status).toBe(400);
    expect((await answerSettings(null, asker(), url('settings?cuenta=a'), quiet)).status).toBe(503);
    const stranger = await answerSettings(
      desk,
      asker(INSTITUTE_PLAIN),
      url(`settings?cuenta=acc_nope`),
      quiet,
    );
    expect(stranger.status).toBe(403);
  });

  it('changes settings for whoever may, refuses a body out of shape, and a member who may not', async () => {
    const desk = fresh();
    const changed = await answerChangeSettings(
      desk,
      asker(),
      post({ accountId: NUMEN, off: ['balance'] }),
      quiet,
    );
    expect(changed.status).toBe(200);
    expect((await json(changed))['settings']).toMatchObject({ off: ['balance'] });
    for (const body of [
      { accountId: NUMEN },
      { accountId: NUMEN, off: ['summary'] },
      { accountId: NUMEN, vocabulary: 'x' },
      { accountId: NUMEN, extra: 1, off: [] },
      {},
    ]) {
      expect((await answerChangeSettings(desk, asker(), post(body), quiet)).status).toBe(400);
    }
    expect((await answerChangeSettings(desk, null, post({}), quiet)).status).toBe(401);
    expect(
      (await answerChangeSettings(null, asker(), post({ accountId: NUMEN, off: [] }), quiet))
        .status,
    ).toBe(503);
    const refused = await answerChangeSettings(
      desk,
      asker(INSTITUTE_PLAIN),
      post({ accountId: INSTITUTE, off: ['roles'] }),
      quiet,
    );
    expect(refused.status).toBe(403);
    const notJson = new Request('https://numinia.test/api/saldo/settings', {
      method: 'POST',
      body: 'x',
    });
    expect((await answerChangeSettings(desk, asker(), notJson, quiet)).status).toBe(415);
  });

  it('changes the AI agent’s switch through the door, and refuses a malformed value', async () => {
    const desk = fresh();
    const changed = await answerChangeSettings(
      desk,
      asker(),
      post({ accountId: NUMEN, aiAgentEnabled: false }),
      quiet,
    );
    expect(changed.status).toBe(200);
    expect((await json(changed))['settings']).toMatchObject({
      aiAgent: { enabled: false },
    });
    expect(
      (
        await answerChangeSettings(
          desk,
          asker(),
          post({ accountId: NUMEN, aiAgentEnabled: 'no' }),
          quiet,
        )
      ).status,
    ).toBe(400);
  });

  it('answers a page of «Qué ha pasado» and refuses a cursor that is not a number', async () => {
    const desk = fresh();
    await desk.changeSettings(ME, NUMEN, { vocabulary: 'simple' });
    const page = await answerHappened(desk, asker(), url(`happened?cuenta=${NUMEN}`), quiet);
    expect(page.status).toBe(200);
    const body = (await json(page))['happened'] as { lines: unknown[]; more: boolean };
    expect(body.lines).toHaveLength(1);
    expect(body.more).toBe(false);
    for (const antes of ['x', '0', '-1', '1.5']) {
      const bad = await answerHappened(
        desk,
        asker(),
        url(`happened?cuenta=${NUMEN}&antes=${antes}`),
        quiet,
      );
      expect(bad.status).toBe(400);
    }
    expect(
      (await answerHappened(desk, asker(), url(`happened?cuenta=${NUMEN}&antes=3`), quiet)).status,
    ).toBe(200);
    expect((await answerHappened(desk, null, url('happened'), quiet)).status).toBe(401);
    expect((await answerHappened(desk, asker(), url('happened'), quiet)).status).toBe(400);
    expect((await answerHappened(null, asker(), url('happened?cuenta=a'), quiet)).status).toBe(503);
    const stranger = await answerHappened(
      desk,
      asker(INSTITUTE_PLAIN),
      url(`happened?cuenta=acc_nope`),
      quiet,
    );
    expect(stranger.status).toBe(403);
  });

  it('says 503 — not 502 — for a till older than these methods, and 502 for one that fails', async () => {
    const old = boundAccounts(
      Object.fromEntries(
        Object.keys(fresh()).map((name) => [
          name,
          name === 'settings' || name === 'changeSettings' || name === 'happenings'
            ? undefined
            : () => Promise.resolve({ ok: false, problems: [] }),
        ]),
      ),
    );
    expect(old).not.toBeNull();
    const logged: unknown[] = [];
    const log = (event: unknown) => logged.push(event);
    const asked = await answerSettings(old, asker(), url('settings?cuenta=a'), log);
    expect(asked.status).toBe(503);
    expect((await answerHappened(old, asker(), url('happened?cuenta=a'), log)).status).toBe(503);
    expect(
      (await answerChangeSettings(old, asker(), post({ accountId: 'a', off: [] }), log)).status,
    ).toBe(503);
    const broken = { ...fresh(), settings: () => Promise.reject(new Error('down')) } as AccountDesk;
    expect((await answerSettings(broken, asker(), url('settings?cuenta=a'), log)).status).toBe(502);
    const wrong = {
      ...fresh(),
      happenings: () => Promise.resolve({ nope: 1 }),
    } as unknown as AccountDesk;
    expect((await answerHappened(wrong, asker(), url('happened?cuenta=a'), log)).status).toBe(502);
    expect(logged.length).toBeGreaterThan(0);
  });

  it('is the fixture desk when the build is a fixture', () => {
    expect(accountsFrom({ binding: undefined, dataSource: 'fixture' })).not.toBeNull();
  });
});

describe('reading the answers in the browser', () => {
  const line = {
    seq: 3,
    at: '2026-10-15T12:00:00.000Z',
    actor: ME,
    actorName: null,
    asHouse: false,
    act: 'settings-changed',
    subject: null,
    detail: { off: 'roles' },
  };

  it('reads settings, or null when the body is not that', () => {
    const aiAgent = { enabled: true, model: 'gpt-5-nano', trialCapCents: 150 };
    const settings = {
      accountId: 'a',
      off: ['roles'],
      vocabulary: 'simple',
      mayEdit: false,
      aiAgent,
    };
    expect(readSettings({ settings })).toEqual({ ok: true, ...settings });
    for (const value of [
      null,
      {},
      { settings: null },
      { settings: { ...settings, accountId: 3 } },
      { settings: { ...settings, off: 'roles' } },
      { settings: { ...settings, off: [1] } },
      { settings: { ...settings, vocabulary: 'x' } },
      { settings: { ...settings, mayEdit: 'yes' } },
      { settings: { ...settings, aiAgent: null } },
      { settings: { ...settings, aiAgent: { ...aiAgent, enabled: 'yes' } } },
      { settings: { ...settings, aiAgent: { ...aiAgent, model: 3 } } },
      { settings: { ...settings, aiAgent: { ...aiAgent, trialCapCents: '150' } } },
    ]) {
      expect(readSettings(value)).toBeNull();
    }
  });

  it('reads a page of «Qué ha pasado», or null when the body is not that', () => {
    expect(readHappenings({ happened: { lines: [line], more: true } })).toEqual({
      lines: [line],
      more: true,
    });
    expect(readHappenings({ happened: { lines: [], more: false } })).toEqual({
      lines: [],
      more: false,
    });
    for (const value of [
      null,
      {},
      { happened: null },
      { happened: { lines: [line] } },
      { happened: { lines: 'x', more: false } },
      { happened: { lines: [{ ...line, seq: '3' }], more: false } },
      { happened: { lines: [{ ...line, actorName: 3 }], more: false } },
      { happened: { lines: [{ ...line, asHouse: 1 }], more: false } },
      { happened: { lines: [{ ...line, subject: 4 }], more: false } },
      { happened: { lines: [null], more: false } },
    ]) {
      expect(readHappenings(value)).toBeNull();
    }
  });
});
