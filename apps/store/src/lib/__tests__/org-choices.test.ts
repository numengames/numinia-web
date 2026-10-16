/**
 * «Una comunidad ES una organización» in the browser (cut 6): the list the
 * two house dialogs show — the register's communities first, then the till
 * teams no community owns — and the account a choice resolves to.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  COMMUNITIES_API,
  COMMUNITY_TEAM_API,
  accountOf,
  choicesToJoin,
  loadCommunities,
  openAllCommunities,
  orgChoices,
  readCommunities,
  type CommunityEntry,
  type OrgChoice,
} from '../org-choices';

const numen: CommunityEntry = {
  id: 'numen-games',
  name: 'Numen Games',
  team: 'acc_team_numen_games',
  account: 'acc_t_aaaa',
};
const reset: CommunityEntry = { id: 'reset', name: 'Reset', team: null, account: 'acc_t_bbbb' };
const answer = (status: number, body: unknown): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('addresses', () => {
  it('keeps the two house API addresses in one place', () => {
    expect(COMMUNITIES_API).toBe('/api/admin/communities');
    expect(COMMUNITY_TEAM_API).toBe('/api/admin/community-team');
  });
});

describe('reading the register', () => {
  it('reads what the API answers', () => {
    expect(readCommunities({ communities: [numen, reset] })).toEqual([numen, reset]);
    expect(readCommunities({ communities: [] })).toEqual([]);
  });

  it('refuses a body that is not that', () => {
    for (const bad of [
      null,
      [],
      {},
      { communities: 'x' },
      { communities: [null] },
      { communities: [{ ...reset, id: '' }] },
      { communities: [{ ...reset, name: 3 }] },
      { communities: [{ ...reset, account: undefined }] },
      { communities: [{ ...reset, team: 3 }] },
      { communities: [{ ...reset, team: '' }] },
    ]) {
      expect(readCommunities(bad)).toBeNull();
    }
  });
});

describe('the list of a dialog', () => {
  it('puts the communities first by name, then the teams no community owns', () => {
    const list = orgChoices(
      [reset, numen],
      [
        { id: 'acc_team_zeta', name: 'Zeta' },
        { id: 'acc_team_numen_games', name: 'Numen Games' },
        { id: 'acc_team_alfa', name: 'Alfa' },
      ],
    );
    expect(list).toEqual<OrgChoice[]>([
      {
        key: 'c:numen-games',
        label: 'Numen Games',
        accountId: 'acc_team_numen_games',
        community: 'numen-games',
      },
      { key: 'c:reset', label: 'Reset', accountId: null, community: 'reset' },
      { key: 't:acc_team_alfa', label: 'Alfa', accountId: 'acc_team_alfa', community: null },
      { key: 't:acc_team_zeta', label: 'Zeta', accountId: 'acc_team_zeta', community: null },
    ]);
  });

  it('knows the account the house opened for a community with no link, and hides it from the others', () => {
    const list = orgChoices([reset], [{ id: 'acc_t_bbbb', name: 'Reset' }]);
    expect(list).toEqual([
      { key: 'c:reset', label: 'Reset', accountId: 'acc_t_bbbb', community: 'reset' },
    ]);
  });

  it('keeps a linked account that the till does not list as a community still to open', () => {
    const list = orgChoices([numen], []);
    expect(list).toEqual([
      { key: 'c:numen-games', label: 'Numen Games', accountId: null, community: 'numen-games' },
    ]);
  });

  it('is empty only when the register and the till both are', () => {
    expect(orgChoices([], [])).toEqual([]);
    expect(orgChoices([], [{ id: 'acc_team_x', name: 'X' }])).toHaveLength(1);
    expect(orgChoices([reset], [])).toHaveLength(1);
  });
});

describe('loading the register', () => {
  it('reads it', async () => {
    const fetcher = vi.fn(async () => answer(200, { communities: [reset] }));
    expect(await loadCommunities(fetcher)).toEqual([reset]);
    expect(fetcher).toHaveBeenCalledWith(COMMUNITIES_API, {
      headers: { accept: 'application/json' },
    });
  });

  it('is null when it cannot: a refusal, a body out of shape, a throw', async () => {
    expect(await loadCommunities(async () => answer(403, {}))).toBeNull();
    expect(await loadCommunities(async () => answer(200, 'not json'))).toBeNull();
    expect(await loadCommunities(async () => answer(200, { communities: 3 }))).toBeNull();
    expect(
      await loadCommunities(async () => {
        throw new Error('offline');
      }),
    ).toBeNull();
  });
});

describe('the account of a choice', () => {
  const owned: OrgChoice = {
    key: 'c:reset',
    label: 'Reset',
    accountId: 'acc_t_bbbb',
    community: 'reset',
  };
  const toOpen: OrgChoice = { ...owned, accountId: null };

  it('is the one it has, without asking anyone', async () => {
    const fetcher = vi.fn();
    expect(await accountOf(fetcher, owned)).toEqual({ ok: true, accountId: 'acc_t_bbbb' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('is the one the house has the till open, for a community that has none', async () => {
    const fetcher = vi.fn(async () =>
      answer(200, { ok: true, account: { id: 'acc_t_bbbb', name: 'Reset' } }),
    );
    expect(await accountOf(fetcher, toOpen)).toEqual({ ok: true, accountId: 'acc_t_bbbb' });
    expect(fetcher).toHaveBeenCalledWith(COMMUNITY_TEAM_API, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ community: 'reset' }),
    });
  });

  it('says why it could not: forbidden, or failed for everything else', async () => {
    expect(await accountOf(async () => answer(403, {}), toOpen)).toEqual({
      ok: false,
      why: 'forbidden',
    });
    for (const reply of [
      answer(502, {}),
      answer(404, {}),
      answer(200, 'not json'),
      answer(200, { ok: true }),
      answer(200, { account: 'x' }),
      answer(200, { account: { id: '' } }),
    ]) {
      expect(await accountOf(async () => reply, toOpen)).toEqual({ ok: false, why: 'failed' });
    }
    expect(
      await accountOf(async () => {
        throw new Error('offline');
      }, toOpen),
    ).toEqual({ ok: false, why: 'failed' });
  });
});

describe('opening every community at once', () => {
  it('posts { all: true } and reads how many are open', async () => {
    const fetcher = vi.fn(async () => answer(200, { ok: true, opened: 16, accounts: [] }));
    expect(await openAllCommunities(fetcher)).toEqual({ ok: true, opened: 16 });
    expect(fetcher).toHaveBeenCalledWith(COMMUNITY_TEAM_API, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: '{"all":true}',
    });
  });

  it('says forbidden for 403, and failed for anything else that goes wrong, never throwing', async () => {
    expect(await openAllCommunities(async () => answer(403, {}))).toEqual({
      ok: false,
      why: 'forbidden',
    });
    for (const reply of [answer(502, {}), answer(200, 'nope'), answer(200, { ok: true })]) {
      expect(await openAllCommunities(async () => reply)).toEqual({ ok: false, why: 'failed' });
    }
    expect(
      await openAllCommunities(async () => {
        throw new Error('offline');
      }),
    ).toEqual({ ok: false, why: 'failed' });
  });
});

describe('leaving out the organizations a person is already in', () => {
  const WHO = `0x${'ab'.repeat(20)}`;
  const choice = (key: string, accountId: string | null): OrgChoice => ({
    key,
    label: key,
    accountId,
    community: null,
  });
  const roles = (wallets: string[]): Response =>
    answer(200, {
      roles: {
        ok: true,
        accountId: 'x',
        as: 'house',
        roles: [],
        members: wallets.map((wallet) => ({
          wallet,
          owner: false,
          addedAt: '2026-10-16T00:00:00.000Z',
          roleIds: [],
          assignable: [],
        })),
      },
    });

  it('drops the ones that list the wallet (any letter case), keeps the rest', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes('mine') ? roles([WHO.toUpperCase().replace('0X', '0x')]) : roles([]),
    );
    const left = await choicesToJoin(
      fetcher,
      [choice('a', 'mine'), choice('b', 'other'), choice('c', null)],
      WHO,
    );
    expect(left.map((c) => c.key)).toEqual(['b', 'c']);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith('/api/saldo/roles?cuenta=mine', {
      headers: { accept: 'application/json' },
    });
  });

  it('keeps an organization the till would not read — it decides on save', async () => {
    const left = await choicesToJoin(
      async (url) => {
        if (url.includes('down')) throw new Error('offline');
        if (url.includes('bad')) return answer(500, {});
        return url.includes('odd') ? answer(200, { nope: true }) : answer(200, 'not json');
      },
      [choice('a', 'down'), choice('b', 'bad'), choice('c', 'odd'), choice('d', 'text')],
      WHO,
    );
    expect(left.map((c) => c.key)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('is empty when the person is in every one', async () => {
    expect(await choicesToJoin(async () => roles([WHO]), [choice('a', 'x')], WHO)).toEqual([]);
  });
});
