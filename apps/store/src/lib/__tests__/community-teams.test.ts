/**
 * «Una comunidad ES una organización» (cut 6) at the store's door: the
 * register as the house's dialogs list it, and the route that has the till
 * open a community's account. The house alone asks (the session decides,
 * never the request); a till older than the store answers 503.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { DESK_METHODS, NOT_IMPLEMENTED, type AccountDesk, type Asker } from '../accounts';
import { boundAccounts } from '../accounts-source';
import type { Community } from '../communities';
import {
  answerCommunities,
  answerCommunityTeam,
  communityAccountId,
  readAllBody,
  readCommunityBody,
  readCommunityId,
} from '../community-teams';

const HOUSE: Asker = {
  wallet: `0x${'99'.repeat(20)}`.toUpperCase().replace('0X', '0x'),
  house: true,
};
const ADMIN: Asker = { wallet: `0x${'ab'.repeat(20)}`, house: false };

const register = [
  { id: 'numen-games', name: 'Numen Games', team: 'acc_team_numen_games' },
  { id: 'reset', name: 'Reset', team: undefined },
] as unknown as readonly Community[];

const quiet = vi.fn();
const json = async (response: Response): Promise<unknown> => response.json();
const post = (body: unknown, type = 'application/json'): Request =>
  new Request('https://numinia.test/api/admin/community-team', {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const opened = {
  ok: true,
  account: { id: 'acc_t_0123456789abcdef0123456789abcdef', name: 'Reset', created: true },
};

function deskThat(answer: () => Promise<unknown>): AccountDesk {
  return { ensureCommunityTeam: vi.fn(answer) } as unknown as AccountDesk;
}

function openAllDesk(answer: () => Promise<unknown>): AccountDesk {
  return { openAllCommunities: vi.fn(answer) } as unknown as AccountDesk;
}

const everyOne = {
  ok: true,
  accounts: [
    { id: 'acc_t_1', name: 'Numen Games', created: false },
    { id: 'acc_t_2', name: 'Reset', created: true },
  ],
};

/** A bound till with every method a desk needs but the new one. */
function oldBinding(): Record<string, unknown> {
  return Object.fromEntries(
    DESK_METHODS.filter(
      (method) => method !== 'ensureCommunityTeam' && method !== 'openAllCommunities',
    ).map((method) => [method, vi.fn(async () => ({ ok: true }))]),
  );
}

describe('the id of a community’s account', () => {
  it('is acc_t_ and 32 hex of the SHA-256 of the till’s own sentence, the same every time', async () => {
    const sha = createHash('sha256').update('numinia-till community reset').digest('hex');
    expect(await communityAccountId('reset')).toBe(`acc_t_${sha.slice(0, 32)}`);
    expect(await communityAccountId('reset')).toBe(await communityAccountId('reset'));
    expect(await communityAccountId('reset')).not.toBe(await communityAccountId('merge'));
    expect(await communityAccountId('reset')).toMatch(/^acc_t_[0-9a-f]{32}$/);
  });
});

describe('reading what a browser sends', () => {
  it('reads a community id as the register writes it', () => {
    expect(readCommunityId('numen-games')).toBe('numen-games');
    expect(readCommunityId('0x')).toBe('0x');
    for (const bad of ['', '-a', 'A', 'a b', 'a'.repeat(64), 3, null, undefined]) {
      expect(readCommunityId(bad)).toBeUndefined();
    }
  });

  it('reads exactly { community }', () => {
    expect(readCommunityBody({ community: 'reset' })).toEqual({ community: 'reset' });
    expect(readCommunityBody({ community: 'reset', house: true })).toBeNull();
    expect(readCommunityBody({ community: 'No' })).toBeNull();
    expect(readCommunityBody({})).toBeNull();
    expect(readCommunityBody(['reset'])).toBeNull();
    expect(readCommunityBody(null)).toBeNull();
    expect(readCommunityBody('reset')).toBeNull();
  });
});

describe('reading { all: true }', () => {
  it('is exactly that and nothing else', () => {
    expect(readAllBody({ all: true })).toBe(true);
    for (const bad of [
      { all: false },
      { all: 'yes' },
      { all: true, x: 1 },
      {},
      [true],
      null,
      'all',
    ]) {
      expect(readAllBody(bad)).toBe(false);
    }
  });
});

describe('GET /api/admin/communities', () => {
  it('lists the register to the house, with the account the till opens for each', async () => {
    const reply = await answerCommunities(register, HOUSE);
    expect(reply.status).toBe(200);
    expect(reply.headers.get('cache-control')).toBe('private, no-store');
    expect(await json(reply)).toEqual({
      communities: [
        {
          id: 'numen-games',
          name: 'Numen Games',
          team: 'acc_team_numen_games',
          account: await communityAccountId('numen-games'),
        },
        { id: 'reset', name: 'Reset', team: null, account: await communityAccountId('reset') },
      ],
    });
  });

  it('lists nothing when the register is empty', async () => {
    expect(await json(await answerCommunities([], HOUSE))).toEqual({ communities: [] });
  });

  it('is 403 for any other session, or none', async () => {
    for (const asker of [ADMIN, null]) {
      const reply = await answerCommunities(register, asker);
      expect(reply.status).toBe(403);
      expect(await json(reply)).toEqual({ error: 'forbidden' });
    }
  });
});

describe('POST /api/admin/community-team', () => {
  it('has the till open the community’s account, as the house, and answers its id and name', async () => {
    const desk = deskThat(async () => opened);
    const reply = await answerCommunityTeam(
      desk,
      HOUSE,
      register,
      post({ community: 'reset' }),
      quiet,
    );
    expect(reply.status).toBe(200);
    expect(await json(reply)).toEqual({
      ok: true,
      account: { id: opened.account.id, name: 'Reset' },
    });
    expect(desk.ensureCommunityTeam).toHaveBeenCalledWith(
      HOUSE.wallet.toLowerCase(),
      true,
      'reset',
      'Reset',
    );
  });

  it('is 403 for any other session before the body is read, and never asks the till', async () => {
    const desk = deskThat(async () => opened);
    for (const asker of [ADMIN, null]) {
      const reply = await answerCommunityTeam(
        desk,
        asker,
        register,
        post('not json', 'text/plain'),
        quiet,
      );
      expect(reply.status).toBe(403);
    }
    expect(desk.ensureCommunityTeam).not.toHaveBeenCalled();
  });

  it('refuses a body that is not JSON, or not { community }', async () => {
    const desk = deskThat(async () => opened);
    const run = (request: Request) => answerCommunityTeam(desk, HOUSE, register, request, quiet);
    expect((await run(post('{}', 'text/plain'))).status).toBe(415);
    expect((await run(post('not json'))).status).toBe(400);
    const bad = await run(post({ community: 'Reset' }));
    expect(bad.status).toBe(400);
    expect(await json(bad)).toEqual({ error: 'body: { community } or { all: true }' });
    expect(desk.ensureCommunityTeam).not.toHaveBeenCalled();
  });

  it('is 404 for a community the register lacks', async () => {
    const desk = deskThat(async () => opened);
    const reply = await answerCommunityTeam(
      desk,
      HOUSE,
      register,
      post({ community: 'nope' }),
      quiet,
    );
    expect(reply.status).toBe(404);
    expect(await json(reply)).toEqual({ error: 'no-community' });
    expect(desk.ensureCommunityTeam).not.toHaveBeenCalled();
  });

  it('is 503 without a till, and with one older than this cut', async () => {
    const run = (desk: AccountDesk | null) =>
      answerCommunityTeam(desk, HOUSE, register, post({ community: 'reset' }), quiet);
    expect((await run(null)).status).toBe(503);
    const older = deskThat(async () => {
      throw new TypeError(`The desk ${NOT_IMPLEMENTED} "ensureCommunityTeam".`);
    });
    const reply = await run(older);
    expect(reply.status).toBe(503);
    expect(await json(reply)).toEqual({ error: 'not-bound' });
  });

  it('is 502 when the till fails or answers something odd', async () => {
    const run = (desk: AccountDesk) =>
      answerCommunityTeam(desk, HOUSE, register, post({ community: 'reset' }), quiet);
    const failing = await run(
      deskThat(async () => {
        throw new Error('boom');
      }),
    );
    expect(failing.status).toBe(502);
    expect((await run(deskThat(async () => ({ ok: true })))).status).toBe(502);
  });

  it('carries the till’s refusal in words: 403 when it is about the house, else 400', async () => {
    const run = (problem: string) =>
      answerCommunityTeam(
        deskThat(async () => ({ ok: false, problems: [problem] })),
        HOUSE,
        register,
        post({ community: 'reset' }),
        quiet,
      );
    const house = await run('only the house opens the organization of a community');
    expect(house.status).toBe(403);
    expect(await json(house)).toEqual({
      error: 'refused',
      problems: ['only the house opens the organization of a community'],
    });
    expect((await run('name must be 1 to 60 characters')).status).toBe(400);
  });
});

describe('POST /api/admin/community-team with { all: true }', () => {
  const run = (
    desk: AccountDesk | null,
    asker: Asker | null = HOUSE,
    body: unknown = { all: true },
  ) => answerCommunityTeam(desk, asker, register, post(body), quiet);

  it('has the till open the whole register as the house and says how many are open', async () => {
    const desk = openAllDesk(async () => everyOne);
    const reply = await run(desk);
    expect(reply.status).toBe(200);
    expect(await json(reply)).toEqual({ ok: true, opened: 2, accounts: everyOne.accounts });
    expect(desk.openAllCommunities).toHaveBeenCalledWith(HOUSE.wallet.toLowerCase(), true, [
      { id: 'numen-games', name: 'Numen Games' },
      { id: 'reset', name: 'Reset' },
    ]);
  });

  it('is 403 for any other session and never asks the till', async () => {
    const desk = openAllDesk(async () => everyOne);
    for (const asker of [ADMIN, null]) expect((await run(desk, asker)).status).toBe(403);
    expect(desk.openAllCommunities).not.toHaveBeenCalled();
  });

  it('is 503 without a till or with one older than this cut, 502 when it fails or answers oddly', async () => {
    expect((await run(null)).status).toBe(503);
    const older = openAllDesk(async () => {
      throw new TypeError(`The desk ${NOT_IMPLEMENTED} "openAllCommunities".`);
    });
    expect((await run(older)).status).toBe(503);
    const failing = openAllDesk(async () => {
      throw new Error('boom');
    });
    expect((await run(failing)).status).toBe(502);
    expect((await run(openAllDesk(async () => ({ ok: true })))).status).toBe(502);
  });

  it('carries the till’s refusal: 403 when it is about the house, else 400', async () => {
    const refuse = (problem: string) =>
      run(openAllDesk(async () => ({ ok: false, problems: [problem] })));
    expect((await refuse('only the house opens the organization of a community')).status).toBe(403);
    const bad = await refuse('communities must be 1 to 50 communities');
    expect(bad.status).toBe(400);
    expect(await json(bad)).toEqual({
      error: 'refused',
      problems: ['communities must be 1 to 50 communities'],
    });
  });
});

describe('a till older than the store (boundAccounts)', () => {
  it('is still a desk without the method, and says it does not implement it', async () => {
    const desk = boundAccounts(oldBinding());
    expect(desk).not.toBeNull();
    await expect(desk?.ensureCommunityTeam(HOUSE.wallet, true, 'reset', 'Reset')).rejects.toThrow(
      /does not implement/,
    );
  });

  it('passes the call through to a till that has it, as a method of the stub', async () => {
    const ensureCommunityTeam = vi.fn(async () => opened);
    const desk = boundAccounts({ ...oldBinding(), ensureCommunityTeam });
    expect(await desk?.ensureCommunityTeam(HOUSE.wallet, true, 'reset', 'Reset')).toEqual(opened);
    expect(ensureCommunityTeam).toHaveBeenCalledWith(HOUSE.wallet, true, 'reset', 'Reset');
  });

  it('is still a desk without openAllCommunities, and passes the call through to one that has it', async () => {
    const old = boundAccounts(oldBinding());
    await expect(old?.openAllCommunities(HOUSE.wallet, true, [])).rejects.toThrow(
      /does not implement/,
    );
    const openAllCommunities = vi.fn(async () => everyOne);
    const desk = boundAccounts({ ...oldBinding(), openAllCommunities });
    const asked = [{ id: 'reset', name: 'Reset' }];
    expect(await desk?.openAllCommunities(HOUSE.wallet, true, asked)).toEqual(everyOne);
    expect(openAllCommunities).toHaveBeenCalledWith(HOUSE.wallet, true, asked);
  });
});
