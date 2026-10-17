/**
 * The counters of your rail (cut I): how many encounters you are going to
 * that are still ahead, how many worlds your communities have — read by
 * hand from the two answers, never a «0», and a failure of any kind leaves
 * the figures hidden.
 */

import { describe, expect, it } from 'vitest';
import {
  FOLLOW_PATH,
  MY_WORLDS_API_PATH,
  RSVP_PATH,
  communitiesCount,
  communityAccountId,
  loadYouCounts,
  readFollowMine,
  readMyTeamIds,
  onceSignedIn,
  paintCount,
  readEnds,
  readMyWorldsCount,
  readRsvpMine,
  upcomingCount,
  type SessionWindowLike,
} from '../you-counts';

const NOW = Date.UTC(2026, 9, 17, 12);
const ENDS = { trg26: NOW + 86_400_000, merge: NOW + 10 * 86_400_000 };

describe('reading /api/rsvp', () => {
  it('takes the ids the wallet is going to, and only text', () => {
    expect(readRsvpMine({ mine: ['trg26', 7, 'merge'], counts: {} })).toEqual(['trg26', 'merge']);
  });
  it('anything that is not that reads as nothing', () => {
    expect(readRsvpMine(null)).toBeNull();
    expect(readRsvpMine([])).toBeNull();
    expect(readRsvpMine({ error: 'signed-out' })).toBeNull();
  });
});

describe('upcomingCount', () => {
  it('counts the ids whose end is ahead, each once; unknown or over ones are left out', () => {
    expect(upcomingCount(['trg26', 'trg26', 'merge', 'held-one'], ENDS, NOW)).toBe(2);
    expect(upcomingCount(['trg26'], ENDS, NOW + 2 * 86_400_000)).toBe(0);
    expect(upcomingCount([], ENDS, NOW)).toBe(0);
  });
});

describe('readEnds', () => {
  it('reads the map the markup carries, keeping only the numbers', () => {
    expect(readEnds(JSON.stringify({ a: 1, b: 'x', c: 3 }))).toEqual({ a: 1, c: 3 });
  });
  it('an absent, empty, broken or non-object attribute reads as none', () => {
    expect(readEnds(undefined)).toEqual({});
    expect(readEnds('')).toEqual({});
    expect(readEnds('{')).toEqual({});
    expect(readEnds('[1]')).toEqual({});
  });
});

describe('reading /api/mundos/mine', () => {
  it('takes a whole, non-negative count', () => {
    expect(readMyWorldsCount({ ok: true, count: 3, communities: [] })).toBe(3);
    expect(readMyWorldsCount({ ok: true, count: 0 })).toBe(0);
  });
  it('anything else reads as nothing', () => {
    expect(readMyWorldsCount({ ok: false, problems: [] })).toBeNull();
    expect(readMyWorldsCount({ ok: true, count: -1 })).toBeNull();
    expect(readMyWorldsCount({ ok: true, count: 1.5 })).toBeNull();
    expect(readMyWorldsCount({ ok: true })).toBeNull();
    expect(readMyWorldsCount('3')).toBeNull();
  });
});

const answering =
  (bodies: Readonly<Record<string, unknown>>) =>
  async (path: string, _init?: RequestInit): Promise<Response> =>
    path in bodies
      ? new Response(JSON.stringify(bodies[path]), { status: 200 })
      : new Response('{"error":"signed-out"}', { status: 401 });

describe('onceSignedIn', () => {
  type Listener = (session: { status: string }) => void;
  const window = (
    published: boolean,
  ): { win: SessionWindowLike; emit: (status: string) => void; publish: () => void } => {
    const listeners: Listener[] = [];
    const client = {
      subscribe: (listener: Listener) => {
        listeners.push(listener);
      },
    };
    const target = new EventTarget() as SessionWindowLike;
    if (published) target.numiniaSession = client;
    return {
      win: target,
      emit: (status) => listeners.forEach((listener) => listener({ status })),
      publish: () => {
        target.numiniaSession = client;
        target.dispatchEvent(new Event('numinia:session-ready'));
      },
    };
  };
  it('calls once, the first time the session is in, with the client already published', () => {
    const { win, emit } = window(true);
    let calls = 0;
    onceSignedIn(win, () => (calls += 1));
    emit('out');
    expect(calls).toBe(0);
    emit('in');
    emit('in');
    expect(calls).toBe(1);
  });
  it('waits for the chrome to publish its client', () => {
    const { win, emit, publish } = window(false);
    let calls = 0;
    onceSignedIn(win, () => (calls += 1));
    emit('in');
    expect(calls).toBe(0);
    publish();
    emit('in');
    expect(calls).toBe(1);
  });
  it('a ready event with no client published calls nothing', () => {
    const { win, emit } = window(false);
    let calls = 0;
    onceSignedIn(win, () => (calls += 1));
    win.dispatchEvent(new Event('numinia:session-ready'));
    emit('in');
    expect(calls).toBe(0);
  });
});

describe('reading /api/follow and the organizations of /api/mundos/mine', () => {
  it('takes the ids followed, and the account ids of the teams, only text', () => {
    expect(readFollowMine({ mine: ['la-tarugo', 7], counts: {} })).toEqual(['la-tarugo']);
    expect(readFollowMine({ error: 'signed-out' })).toBeNull();
    expect(
      readMyTeamIds({
        ok: true,
        count: 0,
        communities: [{ accountId: 'acc_t_1', name: 'A', worldIds: [] }, { name: 'B' }, 7],
      }),
    ).toEqual(['acc_t_1']);
    expect(readMyTeamIds({ ok: false })).toBeNull();
    expect(readMyTeamIds({ ok: true, count: 0 })).toBeNull();
    expect(readMyTeamIds(null)).toBeNull();
  });
});

describe('communitiesCount', () => {
  it('derives the till’s account id for a community, as lib/community-teams.ts does', async () => {
    const id = await communityAccountId('la-tarugo');
    expect(id).toMatch(/^acc_t_[0-9a-f]{32}$/);
    expect(await communityAccountId('la-tarugo')).toBe(id);
    expect(await communityAccountId('merge')).not.toBe(id);
  });
  it('counts the organizations you are in and the communities you follow, each once', async () => {
    const tarugo = await communityAccountId('la-tarugo');
    expect(await communitiesCount([], [])).toBe(0);
    expect(
      await communitiesCount([tarugo, 'acc_t_other'], ['la-tarugo', 'la-tarugo', 'merge']),
    ).toBe(3);
    expect(await communitiesCount([], ['merge'])).toBe(1);
  });
});

const NONE = { agenda: null, worlds: null, communities: null };

describe('loadYouCounts', () => {
  it('asks the three once and answers the counts, 0 as nothing', async () => {
    const asked: string[] = [];
    const counts = await loadYouCounts(
      (path, init) => {
        asked.push(path);
        return answering({
          [RSVP_PATH]: { mine: ['trg26', 'old'], counts: {} },
          [MY_WORLDS_API_PATH]: {
            ok: true,
            count: 3,
            communities: [{ accountId: 'acc_t_one', name: 'One', worldIds: ['w'] }],
          },
          [FOLLOW_PATH]: { mine: ['la-tarugo', 'merge'], counts: {} },
        })(path, init);
      },
      ENDS,
      NOW,
    );
    expect(asked.sort()).toEqual([FOLLOW_PATH, MY_WORLDS_API_PATH, RSVP_PATH].sort());
    expect(counts).toEqual({ agenda: 1, worlds: 3, communities: 3 });
  });
  it('a refusal, a failure or an empty answer leaves each figure hidden', async () => {
    expect(await loadYouCounts(answering({}), ENDS, NOW)).toEqual(NONE);
    expect(
      await loadYouCounts(
        answering({
          [RSVP_PATH]: { mine: [] },
          [MY_WORLDS_API_PATH]: { ok: true, count: 0, communities: [] },
          [FOLLOW_PATH]: { mine: [] },
        }),
        ENDS,
        NOW,
      ),
    ).toEqual(NONE);
    expect(
      await loadYouCounts(
        async () => {
          throw new Error('offline');
        },
        ENDS,
        NOW,
      ),
    ).toEqual(NONE);
  });
});

describe('paintCount', () => {
  const figure = (): HTMLElement => {
    const made = { hidden: true, textContent: '' };
    return made as unknown as HTMLElement;
  };
  it('writes the number and shows it, or clears and hides it', () => {
    const [a, b] = [figure(), figure()];
    paintCount([a, b], 4);
    expect([a.hidden, a.textContent, b.hidden, b.textContent]).toEqual([false, '4', false, '4']);
    paintCount([a], null);
    expect([a.hidden, a.textContent]).toEqual([true, '']);
  });
});
