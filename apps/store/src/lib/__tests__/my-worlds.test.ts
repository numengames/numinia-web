/**
 * «Tus mundos» (cut I): the organizations the wallet is in — never the
 * personal account, never one the house entered as the house — and, for
 * each, the worlds the till placed in it; any refusal or failure reads as
 * «unavailable», never a wrong list.
 */

import { describe, expect, it } from 'vitest';
import type { AccountDesk } from '../accounts';
import {
  answerMyWorlds,
  myWorlds,
  orderCommunities,
  readMyTeams,
  readWorldIdsOf,
} from '../my-worlds';

const PERSONAL = {
  id: 'acc_personal',
  kind: 'personal',
  name: null,
  role: 'owner',
  balanceCents: 420,
};
const GAMES = {
  id: 'acc_team_numen_games',
  kind: 'team',
  name: 'Numen Games',
  role: 'member',
  balanceCents: 88,
};
const RESET = {
  id: 'acc_team_reset',
  kind: 'team',
  name: 'Reset',
  role: 'member',
  balanceCents: 0,
};
const HOUSE = { ...RESET, id: 'acc_team_other', name: 'Otra', as: 'house' };

describe('readMyTeams', () => {
  it('keeps the teams the wallet is in, by id and name; the house entries and the personal account out', () => {
    expect(readMyTeams({ accounts: [PERSONAL, GAMES, HOUSE, { ...RESET, name: '' }] })).toEqual([
      { id: 'acc_team_numen_games', name: 'Numen Games' },
      { id: 'acc_team_reset', name: 'acc_team_reset' },
    ]);
    expect(readMyTeams({ accounts: [PERSONAL] })).toEqual([]);
  });
  it('a refusal, a wrong shape or a team without an id reads as nothing', () => {
    expect(readMyTeams({ ok: false, problems: ['x'] })).toBeNull();
    expect(readMyTeams(null)).toBeNull();
    expect(readMyTeams({ accounts: [{ kind: 'team', name: 'No id' }] })).toBeNull();
    expect(readMyTeams({ accounts: ['x'] })).toEqual([]);
  });
});

describe('readWorldIdsOf', () => {
  it('sorts the ids and keeps each once', () => {
    expect(
      readWorldIdsOf({
        ok: true,
        worlds: [{ worldId: 'b' }, { worldId: 'a', accountId: 'x' }, { worldId: 'b' }],
      }),
    ).toEqual(['a', 'b']);
    expect(readWorldIdsOf({ ok: true, worlds: [] })).toEqual([]);
  });
  it('a refusal or a wrong shape reads as nothing', () => {
    expect(readWorldIdsOf({ ok: false, problems: ['not a member'] })).toBeNull();
    expect(readWorldIdsOf({ ok: true, worlds: [{ id: 'a' }] })).toBeNull();
    expect(readWorldIdsOf({ ok: true, worlds: ['a'] })).toBeNull();
    expect(readWorldIdsOf(undefined)).toBeNull();
  });
});

describe('orderCommunities', () => {
  it('the ones with worlds first, then by name', () => {
    const ordered = orderCommunities([
      { accountId: 'z', name: 'Zeta', worldIds: [] },
      { accountId: 'r', name: 'Reset', worldIds: ['x'] },
      { accountId: 'a', name: 'Alfa', worldIds: [] },
      { accountId: 'n', name: 'Numen Games', worldIds: ['y', 'z'] },
    ]).map((community) => community.name);
    expect(ordered).toEqual(['Numen Games', 'Reset', 'Alfa', 'Zeta']);
  });
});

const deskWith = (
  overview: unknown,
  worldsOf: (accountId: string) => unknown,
  asked: string[] = [],
): AccountDesk =>
  ({
    overview: async (wallet: string) => {
      asked.push(`overview:${wallet}`);
      return overview;
    },
    worldsOf: async (wallet: string, house: boolean, accountId: string) => {
      asked.push(`worldsOf:${wallet}:${String(house)}:${accountId}`);
      return worldsOf(accountId);
    },
  }) as unknown as AccountDesk;

const WORLDS: Record<string, string[]> = {
  acc_team_numen_games: ['atlantis-library', 'agora-plaza'],
  acc_team_reset: [],
};

describe('myWorlds', () => {
  it('asks the overview and each team, lowercase, never as the house, and counts every world once', async () => {
    const asked: string[] = [];
    const mine = await myWorlds(
      deskWith(
        { accounts: [PERSONAL, GAMES, RESET, HOUSE] },
        (id) => ({ ok: true, worlds: (WORLDS[id] ?? []).map((worldId) => ({ worldId })) }),
        asked,
      ),
      '0xABC',
    );
    expect(asked).toEqual([
      'overview:0xabc',
      'worldsOf:0xabc:false:acc_team_numen_games',
      'worldsOf:0xabc:false:acc_team_reset',
    ]);
    expect(mine).toEqual({
      count: 2,
      communities: [
        {
          accountId: 'acc_team_numen_games',
          name: 'Numen Games',
          worldIds: ['agora-plaza', 'atlantis-library'],
        },
        { accountId: 'acc_team_reset', name: 'Reset', worldIds: [] },
      ],
    });
  });
  it('no community at all is an empty, readable answer', async () => {
    expect(
      await myWorlds(
        deskWith({ accounts: [PERSONAL] }, () => null),
        '0xabc',
      ),
    ).toEqual({
      communities: [],
      count: 0,
    });
  });
  it('a refusal or a failure anywhere reads as unavailable', async () => {
    expect(
      await myWorlds(
        deskWith({ ok: false, problems: [] }, () => null),
        '0xabc',
      ),
    ).toBeNull();
    expect(
      await myWorlds(
        deskWith({ accounts: [GAMES] }, () => ({ ok: false, problems: ['not a member'] })),
        '0xabc',
      ),
    ).toBeNull();
    const throwing = {
      overview: async () => {
        throw new Error('down');
      },
    } as unknown as AccountDesk;
    expect(await myWorlds(throwing, '0xabc')).toBeNull();
    const throwingWorlds = {
      overview: async () => ({ accounts: [GAMES] }),
      worldsOf: async () => {
        throw new Error('down');
      },
    } as unknown as AccountDesk;
    expect(await myWorlds(throwingWorlds, '0xabc')).toBeNull();
  });
});

describe('answerMyWorlds', () => {
  const asker = { wallet: '0xabc', house: false };
  it('401 without a session, 503 without a till, 502 when it could not be read', async () => {
    expect((await answerMyWorlds(null, null)).status).toBe(401);
    expect((await answerMyWorlds(null, asker)).status).toBe(503);
    expect(
      (
        await answerMyWorlds(
          deskWith({ ok: false, problems: [] }, () => null),
          asker,
        )
      ).status,
    ).toBe(502);
  });
  it('answers the count and the communities, private to the browser', async () => {
    const response = await answerMyWorlds(
      deskWith({ accounts: [PERSONAL, GAMES] }, () => ({ ok: true, worlds: [{ worldId: 'a' }] })),
      asker,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      ok: true,
      count: 1,
      communities: [{ accountId: 'acc_team_numen_games', name: 'Numen Games', worldIds: ['a'] }],
    });
  });
});
