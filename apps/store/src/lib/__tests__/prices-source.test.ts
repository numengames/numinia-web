/**
 * The price room's door to the till (MIS-184): which desk answers, what the
 * browser may send, and what the browser gets back — the till's answers
 * checked for shape, failures as 502 with nothing internal, logs that name
 * rules and never values.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeskCheck, DeskDraft, DeskView, OracleDesk } from '../prices';
import { DEFAULT_RULES } from '../prices-data';
import {
  MAX_BODY_BYTES,
  answerRead,
  answerWrite,
  boundDesk,
  deskFrom,
  fixtureDesk,
  readPricesRequest,
  resetFixtureDeskForTests,
} from '../prices-source';

const WALLET = '0x42E6bd5c8c74F8c7c35f8a1BA3bbf02e7df0cA26';

const DRAFT: DeskDraft = {
  startsOn: '2026-10-14',
  sizes: { '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 } },
  rules: { ...DEFAULT_RULES, quickTopupsCents: [...DEFAULT_RULES.quickTopupsCents] },
  basis: { note: 'why', assumptions: { occupancyPct: 50 } },
};

const VIEW: DeskView = {
  today: '2026-10-13',
  inForceId: 1,
  versions: [
    {
      id: 1,
      startsOn: '2026-10-13',
      createdAt: '2026-10-13T00:00:00.000Z',
      createdBy: 'seed: example figures (DBT-026)',
      sizes: DRAFT.sizes,
      rules: DRAFT.rules,
      basis: null,
    },
  ],
  sizesInUse: [],
};

const CHECK: DeskCheck = {
  today: '2026-10-13',
  nextId: 2,
  replacedId: 1,
  isRise: false,
  noticeDays: 0,
  earliestStart: '2026-10-14',
  problems: [],
};

function fakeDesk(over: Partial<OracleDesk> = {}): OracleDesk {
  return {
    read: async () => VIEW,
    check: async () => CHECK,
    schedule: async () => ({ ok: true, version: { ...VIEW.versions[0]!, id: 2 } }),
    ...over,
  };
}

/** A POST as the route receives it (a plain object: headers and text are all it reads). */
function post(
  body: string,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  return { headers: new Headers(headers), text: async () => body } as unknown as Request;
}

const json = (body: unknown): string => JSON.stringify(body);

afterEach(() => {
  resetFixtureDeskForTests();
  vi.restoreAllMocks();
});

describe('which desk answers', () => {
  it('reads a bound desk, calling its methods on the stub itself', async () => {
    const seen: unknown[] = [];
    const stub = {
      who: 'stub',
      read(this: { who: string }) {
        seen.push(this.who);
        return Promise.resolve(VIEW);
      },
      check(this: { who: string }, draft: DeskDraft) {
        seen.push(this.who, draft.startsOn);
        return Promise.resolve(CHECK);
      },
      schedule(this: { who: string }, _draft: DeskDraft, by: string) {
        seen.push(this.who, by);
        return Promise.resolve({ ok: false as const, problems: [] });
      },
    };
    const desk = boundDesk(stub);
    expect(desk).not.toBeNull();
    await desk?.read();
    await desk?.check(DRAFT);
    await desk?.schedule(DRAFT, '0xabc');
    expect(seen).toEqual(['stub', 'stub', '2026-10-14', 'stub', '0xabc']);
  });

  it('takes a callable stub too, and refuses what is not a desk', () => {
    const callable = Object.assign(() => undefined, fakeDesk());
    expect(boundDesk(callable)).not.toBeNull();
    for (const notADesk of [undefined, null, 'numinia-till', 3, {}, { read() {}, check() {} }]) {
      expect(boundDesk(notADesk)).toBeNull();
    }
  });

  it('the bound till first, the fixture desk under DATA_SOURCE=fixture, else none', async () => {
    const stub = fakeDesk({ read: async () => ({ ...VIEW, today: 'bound' }) });
    expect(await deskFrom({ binding: stub, dataSource: 'fixture' })?.read()).toMatchObject({
      today: 'bound',
    });
    const fixture = deskFrom({ binding: undefined, dataSource: 'fixture' });
    expect((await fixture?.read())?.versions[0]?.createdBy).toBe('seed: example figures (DBT-026)');
    expect(deskFrom({ binding: undefined, dataSource: 'github' })).toBeNull();
    expect(deskFrom({ binding: 'a string', dataSource: undefined })).toBeNull();
  });

  it('one fixture desk per process: what is published stays until reset', async () => {
    const first = fixtureDesk();
    expect(fixtureDesk()).toBe(first);
    resetFixtureDeskForTests();
    expect(fixtureDesk()).not.toBe(first);
  });
});

describe('what the browser may send', () => {
  it('an action and a draft shaped like the contract’s', () => {
    expect(readPricesRequest({ action: 'check', draft: DRAFT })).toEqual({
      ok: true,
      action: 'check',
      draft: DRAFT,
    });
    expect(readPricesRequest({ action: 'schedule', draft: { ...DRAFT, basis: null } }).ok).toBe(
      true,
    );
  });

  it('names the first thing wrong, with where it is', () => {
    const cases: Array<[unknown, string]> = [
      [{ action: 'delete', draft: DRAFT }, 'action: '],
      [{ action: 'check' }, 'draft: '],
      [{ action: 'check', draft: { ...DRAFT, extra: 1 } }, 'draft: '],
      [
        { action: 'check', draft: { ...DRAFT, sizes: { 'Big One': DRAFT.sizes['2g'] } } },
        'draft.sizes.Big One: ',
      ],
      [
        {
          action: 'check',
          draft: { ...DRAFT, sizes: { '2g': { runningCentsPerDay: '60', stoppedCentsPerDay: 5 } } },
        },
        'draft.sizes.2g.runningCentsPerDay: ',
      ],
      [
        { action: 'check', draft: { ...DRAFT, rules: { ...DRAFT.rules, more: 1 } } },
        'draft.rules: ',
      ],
      [{ action: 'check', draft: { ...DRAFT, basis: { note: 'x', why: 'y' } } }, 'draft.basis: '],
    ];
    for (const [body, where] of cases) {
      const read = readPricesRequest(body);
      expect(read.ok).toBe(false);
      expect(!read.ok && read.error.startsWith(where)).toBe(true);
    }
    const top = readPricesRequest('not an object');
    expect(top.ok).toBe(false);
    // Nothing to point at: the message alone, with no path in front.
    expect(!top.ok && /^(action|draft)\b/.test(top.error)).toBe(false);
    expect(!top.ok && top.error.length > 0).toBe(true);
  });

  it('refuses more than 32 sizes and more than 32 quick top-ups', () => {
    const sizes = Object.fromEntries(
      Array.from({ length: 33 }, (_, i) => [
        `s${i}`,
        { runningCentsPerDay: 1, stoppedCentsPerDay: 0 },
      ]),
    );
    expect(readPricesRequest({ action: 'check', draft: { ...DRAFT, sizes } }).ok).toBe(false);
    const quick = Array.from({ length: 33 }, (_, i) => 1000 + i);
    expect(
      readPricesRequest({
        action: 'check',
        draft: { ...DRAFT, rules: { ...DRAFT.rules, quickTopupsCents: quick } },
      }).ok,
    ).toBe(false);
  });
});

describe('GET', () => {
  it('answers the desk with the session’s wallet, never cached', async () => {
    const response = await answerRead(fakeDesk(), WALLET, () => undefined);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ wallet: WALLET, desk: VIEW });
  });

  it('drops what the till adds beyond the contract', async () => {
    const extra = { ...VIEW, secret: 'x', versions: [{ ...VIEW.versions[0], internal: 1 }] };
    const response = await answerRead(
      fakeDesk({ read: async () => extra as DeskView }),
      WALLET,
      () => undefined,
    );
    expect(await response.json()).toEqual({ wallet: WALLET, desk: VIEW });
  });

  it('no desk: 503 not-bound', async () => {
    const response = await answerRead(null, WALLET);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'not-bound' });
  });

  it('a desk that throws or answers out of shape: 502, logged by rule, never by value', async () => {
    const log = vi.fn();
    const thrown = await answerRead(
      fakeDesk({ read: async () => Promise.reject(new TypeError('D1 said: secret row')) }),
      WALLET,
      log,
    );
    expect(thrown.status).toBe(502);
    expect(await thrown.json()).toEqual({ error: 'till-failed' });
    const odd = await answerRead(
      fakeDesk({ read: async () => ({ today: 1 }) as never }),
      WALLET,
      log,
    );
    expect(odd.status).toBe(502);
    expect(log.mock.calls).toEqual([
      [{ level: 'error', kind: 'prices-till', action: 'read', rule: 'threw', error: 'TypeError' }],
      [{ level: 'error', kind: 'prices-till', action: 'read', rule: 'answer-shape' }],
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
  });
});

describe('POST', () => {
  it('JSON only: anything else is 415', async () => {
    for (const type of ['text/plain', '', 'application/jsonp', 'multipart/form-data']) {
      const response = await answerWrite(
        fakeDesk(),
        post(json({}), { 'content-type': type }),
        WALLET,
      );
      expect(response.status).toBe(415);
    }
    expect((await answerWrite(fakeDesk(), post(json({}), {}), WALLET)).status).toBe(415);
    const ok = await answerWrite(
      fakeDesk(),
      post(json({ action: 'check', draft: DRAFT }), {
        'content-type': 'Application/JSON; charset=utf-8',
      }),
      WALLET,
    );
    expect(ok.status).toBe(200);
  });

  it('refuses a body too large, declared or measured: 413', async () => {
    const declared = await answerWrite(
      fakeDesk(),
      post('{}', {
        'content-type': 'application/json',
        'content-length': String(MAX_BODY_BYTES + 1),
      }),
      WALLET,
    );
    expect(declared.status).toBe(413);
    const measured = await answerWrite(
      fakeDesk(),
      post(`"${'é'.repeat(MAX_BODY_BYTES / 2)}"`),
      WALLET,
    );
    expect(measured.status).toBe(413);
  });

  it('refuses what is not JSON, or not a request: 400 with the first issue', async () => {
    const broken = await answerWrite(fakeDesk(), post('{'), WALLET);
    expect(broken.status).toBe(400);
    expect(await broken.json()).toEqual({ error: 'body must be JSON' });
    const wrong = await answerWrite(
      fakeDesk(),
      post(json({ action: 'check', draft: { ...DRAFT, startsOn: 3 } })),
      WALLET,
    );
    expect(wrong.status).toBe(400);
    expect(((await wrong.json()) as { error: string }).error).toMatch(/^draft\.startsOn: /);
  });

  it('no desk: 503 not-bound, after the request read well', async () => {
    const response = await answerWrite(null, post(json({ action: 'check', draft: DRAFT })), WALLET);
    expect(response.status).toBe(503);
  });

  it('check: the desk’s check of the draft, as sent', async () => {
    const check = vi.fn(async () => CHECK);
    const response = await answerWrite(
      fakeDesk({ check }),
      post(json({ action: 'check', draft: DRAFT })),
      WALLET,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ check: CHECK });
    expect(check).toHaveBeenCalledWith(DRAFT);
  });

  it('schedule: passes the session’s wallet lowercased as by, and logs only the outcome', async () => {
    const log = vi.fn();
    const schedule = vi.fn(async () => ({
      ok: true as const,
      version: { ...VIEW.versions[0]!, id: 2 },
    }));
    const response = await answerWrite(
      fakeDesk({ schedule }),
      post(json({ action: 'schedule', draft: DRAFT })),
      WALLET,
      log,
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as { schedule: { ok: boolean } }).schedule.ok).toBe(true);
    expect(schedule).toHaveBeenCalledWith(DRAFT, WALLET.toLowerCase());
    expect(log.mock.calls).toEqual([
      [{ level: 'info', kind: 'prices-schedule', outcome: 'scheduled', problems: 0 }],
    ]);
  });

  it('schedule refused: the till’s problems reach the room', async () => {
    const log = vi.fn();
    const problems = ['size 2g is still charged to worlds: a version must keep pricing it'];
    const response = await answerWrite(
      fakeDesk({ schedule: async () => ({ ok: false, problems }) }),
      post(json({ action: 'schedule', draft: DRAFT })),
      WALLET,
      log,
    );
    expect(await response.json()).toEqual({ schedule: { ok: false, problems } });
    expect(log.mock.calls).toEqual([
      [{ level: 'info', kind: 'prices-schedule', outcome: 'refused', problems: 1 }],
    ]);
  });

  it('a desk that fails a check or a schedule: 502 with nothing internal', async () => {
    const log = vi.fn();
    const cases: Array<[Partial<OracleDesk>, string]> = [
      [{ check: async () => Promise.reject('a string thrown') }, 'check'],
      [{ check: async () => ({ ...CHECK, problems: 'none' }) as never }, 'check'],
      [{ schedule: async () => Promise.reject(new Error('boom')) }, 'schedule'],
      [{ schedule: async () => ({ ok: true }) as never }, 'schedule'],
    ];
    for (const [over, action] of cases) {
      const response = await answerWrite(
        fakeDesk(over),
        post(json({ action, draft: DRAFT })),
        WALLET,
        log,
      );
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: 'till-failed' });
    }
    expect(log.mock.calls.map(([event]) => [event.action, event.rule, event.error])).toEqual([
      ['check', 'threw', 'string'],
      ['check', 'answer-shape', undefined],
      ['schedule', 'threw', 'Error'],
      ['schedule', 'answer-shape', undefined],
    ]);
  });

  it('runs end to end on the fixture desk: check, then schedule as the Oracle', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-13T10:00:00.000Z'), toFake: ['Date'] });
    try {
      resetFixtureDeskForTests();
      const desk = deskFrom({ binding: undefined, dataSource: 'fixture' });
      const checked = await answerWrite(
        desk,
        post(json({ action: 'check', draft: DRAFT })),
        WALLET,
        () => undefined,
      );
      expect(((await checked.json()) as { check: DeskCheck }).check.problems).toEqual([]);
      const done = await answerWrite(
        desk,
        post(json({ action: 'schedule', draft: DRAFT })),
        WALLET,
        () => undefined,
      );
      const body = (await done.json()) as {
        schedule: { ok: true; version: { id: number; createdBy: string } };
      };
      expect(body.schedule.version).toMatchObject({ id: 2, createdBy: WALLET.toLowerCase() });
      const read = await answerRead(desk, WALLET, () => undefined);
      expect(((await read.json()) as { desk: DeskView }).desk.versions).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
