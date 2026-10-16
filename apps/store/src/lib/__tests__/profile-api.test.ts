/**
 * «Tu nombre y tu cara» (cut of 2026-10-16) at the store's door to the till:
 * GET and POST /api/profile (`answerProfile`, `answerSetProfile`), a till
 * older than the store, and the roles view's avatars turned into faces
 * before any answer reaches a browser — the avatar's id never does.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AccountDesk, Asker } from '../accounts';
import {
  MAX_BODY_BYTES,
  answerAction,
  answerPeople,
  answerProfile,
  answerRoles,
  answerSetProfile,
  boundAccounts,
  fixtureAccounts,
  resetFixtureAccountsForTests,
} from '../accounts-source';
import { PROFILE_AVATARS } from '../profile-avatars';
import { PROFILE_AVATAR_PROBLEM, PROFILE_NAME_PROBLEM } from '../profile-name';

const ME = `0x${'ab'.repeat(20)}`;
const ARLA = 'avatar-arla-mncdhz3l';
const ARLA_FACE = `/thumbs/1x/${ARLA}.webp`;
const LYRA = 'ndg-019d3e6c-129a-701e-95fc-ce1754d5c917';
const ROLE_ID = 'role_00000000000000a1';
const UPDATED = '2026-10-16T09:30:00.000Z';

/** The till's member, as `roles` answers it once people publish (apps/till src/db/roles.ts). */
const tillMember = (wallet: string, extra: object = {}) => ({
  wallet,
  owner: false,
  addedAt: 'a',
  roleIds: [],
  assignable: [ROLE_ID],
  ...extra,
});
const TILL_ROLES = {
  ok: true,
  accountId: 'acc',
  as: 'member',
  roles: [
    {
      id: ROLE_ID,
      name: 'Gente',
      color: null,
      position: 1,
      hoist: false,
      permissions: ['enter-worlds'],
      members: 3,
      mayEdit: false,
    },
  ],
  members: [
    tillMember(ME, { owner: true, name: 'Rima', avatar: ARLA }),
    tillMember(`0x${'cd'.repeat(20)}`, { name: 'María', avatar: null }),
    // An avatar this build did not bake: the person keeps their name, and no face.
    tillMember(`0x${'56'.repeat(20)}`, { name: 'Ana', avatar: 'avatar-not-baked-here' }),
    tillMember(`0x${'12'.repeat(20)}`),
  ],
};

const answering = (value: unknown) => vi.fn(async () => value);

function fakeDesk(overrides: Partial<Record<keyof AccountDesk, unknown>> = {}): AccountDesk {
  return {
    overview: answering({ ok: true, accounts: [] }),
    directory: answering({ ok: true, accounts: [] }),
    createTeam: answering({ ok: false, problems: ['x'] }),
    renameTeam: answering({ ok: false, problems: ['x'] }),
    statement: answering({ ok: false, problems: ['x'] }),
    members: answering({ ok: true, members: [] }),
    access: answering({ ok: false, problems: ['x'] }),
    setMember: answering({ ok: true, members: [] }),
    removeMember: answering({ ok: true, members: [] }),
    roles: answering(TILL_ROLES),
    headcount: answering({ ok: true, accountId: 'acc', members: 4 }),
    createRole: answering(TILL_ROLES),
    editRole: answering(TILL_ROLES),
    moveRole: answering(TILL_ROLES),
    deleteRole: answering(TILL_ROLES),
    giveRole: answering(TILL_ROLES),
    takeRole: answering(TILL_ROLES),
    log: answering({ ok: true, accountId: 'acc', lines: [] }),
    startTopup: answering({ ok: false, problems: ['x'] }),
    confirmTopup: answering({ ok: false, problems: ['x'] }),
    profile: answering({ ok: true, profile: null }),
    setProfile: answering({ ok: true, profile: null }),
    ...overrides,
  } as AccountDesk;
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://numinia.com/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const quiet = vi.fn();
const json = async (response: Response): Promise<unknown> => response.json();

afterEach(() => {
  resetFixtureAccountsForTests();
  quiet.mockClear();
});

describe('GET /api/profile: one’s own name and avatar', () => {
  it('needs a session and a desk, and asks for the session’s wallet, lowercased', async () => {
    const desk = fakeDesk();
    const out = await answerProfile(desk, null, quiet);
    expect(out.status).toBe(401);
    expect(await json(out)).toEqual({ error: 'signed-out' });
    expect(desk.profile).not.toHaveBeenCalled();
    const unbound = await answerProfile(null, ME, quiet);
    expect(unbound.status).toBe(503);
    expect(await json(unbound)).toEqual({ error: 'not-bound' });
    const none = await answerProfile(desk, ME.toUpperCase().replace('0X', '0x'), quiet);
    expect(none.status).toBe(200);
    expect(none.headers.get('cache-control')).toBe('no-store');
    expect(await json(none)).toEqual({ ok: true, profile: null });
    expect(desk.profile).toHaveBeenCalledWith(ME);
  });

  it('answers the name, the avatar’s id and its face — never when it was changed', async () => {
    const desk = fakeDesk({
      profile: answering({
        ok: true,
        profile: { name: 'Rima', avatar: ARLA, updatedAt: UPDATED },
      }),
    });
    expect(await json(await answerProfile(desk, ME, quiet))).toEqual({
      ok: true,
      profile: { name: 'Rima', avatar: ARLA, face: ARLA_FACE },
    });
    const bare = fakeDesk({
      profile: answering({ ok: true, profile: { name: 'Rima', avatar: null, updatedAt: UPDATED } }),
    });
    expect(await json(await answerProfile(bare, ME, quiet))).toEqual({
      ok: true,
      profile: { name: 'Rima', avatar: null, face: null },
    });
  });

  it('passes the till’s refusal on as 400 in its words, and a broken till as 502 logged by rule', async () => {
    const refused = fakeDesk({ profile: answering({ ok: false, problems: ['nope'] }) });
    const answer = await answerProfile(refused, ME, quiet);
    expect(answer.status).toBe(400);
    expect(await json(answer)).toEqual({ error: 'refused', problems: ['nope'] });
    const threw = fakeDesk({
      profile: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    expect((await answerProfile(threw, ME, quiet)).status).toBe(502);
    expect(quiet).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'profile', rule: 'threw', error: 'Error' }),
    );
    const shapeless = fakeDesk({ profile: answering({ ok: true, profile: { name: 7 } }) });
    expect((await answerProfile(shapeless, ME, quiet)).status).toBe(502);
    expect(quiet).toHaveBeenLastCalledWith(expect.objectContaining({ rule: 'answer-shape' }));
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(ME);
  });

  it('logs to telemetry by default', async () => {
    expect((await answerProfile(fakeDesk(), ME)).status).toBe(200);
  });
});

describe('a till older than the store (the minutes between two deploys)', () => {
  const older = (): AccountDesk => {
    const { profile: _profile, setProfile: _setProfile, ...rest } = fakeDesk();
    return rest as AccountDesk;
  };

  it('is still a desk: Saldo and the panel keep working', async () => {
    const bound = boundAccounts(older());
    expect(bound).not.toBeNull();
    const { overview: _overview, ...broken } = fakeDesk();
    expect(boundAccounts(broken)).toBeNull();
  });

  it('answers 503 for the profile, whether the binding lacks the method or workerd says so', async () => {
    const bound = boundAccounts(older());
    if (bound === null) throw new Error('not bound');
    const read = await answerProfile(bound, ME, quiet);
    expect(read.status).toBe(503);
    expect(await json(read)).toEqual({ error: 'not-bound' });
    const write = await answerSetProfile(bound, ME, post({ name: 'Rima', avatar: null }), quiet);
    expect(write.status).toBe(503);
    expect(quiet).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'set-profile', rule: 'not-implemented' }),
    );
    // A real RPC stub has every name: the till's entrypoint refuses the call itself.
    const rpc = fakeDesk({
      profile: vi.fn(async () => {
        throw new TypeError('The RPC receiver does not implement the method "profile".');
      }),
    });
    expect((await answerProfile(rpc, ME, quiet)).status).toBe(503);
  });

  it('calls a till that has them as methods, with what the store was given', async () => {
    const stub = fakeDesk();
    const bound = boundAccounts(stub);
    if (bound === null) throw new Error('not bound');
    await bound.profile(ME);
    await bound.setProfile(ME, { name: 'Rima', avatar: null });
    await bound.setProfile(ME, null);
    expect(stub.profile).toHaveBeenCalledWith(ME);
    expect(stub.setProfile).toHaveBeenCalledWith(ME, { name: 'Rima', avatar: null });
    expect(stub.setProfile).toHaveBeenLastCalledWith(ME, null);
  });
});

describe('POST /api/profile: publish, replace or stop showing them', () => {
  it('needs a session first, then JSON in a small body', async () => {
    const desk = fakeDesk();
    expect((await answerSetProfile(desk, null, post({ remove: true }), quiet)).status).toBe(401);
    const form = await answerSetProfile(
      desk,
      ME,
      post('name=Rima', { 'content-type': 'application/x-www-form-urlencoded' }),
      quiet,
    );
    expect(form.status).toBe(415);
    const plain = await answerSetProfile(
      desk,
      ME,
      post('{"remove":true}', { 'content-type': 'text/plain' }),
      quiet,
    );
    expect(plain.status).toBe(415);
    const big = post({ name: 'x'.repeat(MAX_BODY_BYTES), avatar: null });
    expect((await answerSetProfile(desk, ME, big, quiet)).status).toBe(413);
    expect((await answerSetProfile(desk, ME, post('{nope'), quiet)).status).toBe(400);
    expect(desk.setProfile).not.toHaveBeenCalled();
  });

  it('reads only `{ name, avatar }` or `{ remove: true }` — nothing else, no other wallet', async () => {
    const desk = fakeDesk();
    for (const body of [
      {},
      { name: 'Rima' },
      { avatar: null },
      { name: 1, avatar: null },
      { name: 'Rima', avatar: 1 },
      { name: 'Rima', avatar: null, wallet: `0x${'cd'.repeat(20)}` },
      { name: 'Rima', avatar: null, house: true },
      { remove: false },
      { remove: 'yes' },
      { remove: true, name: 'Rima' },
      { remove: true, wallet: `0x${'cd'.repeat(20)}` },
      null,
      [],
      'Rima',
    ]) {
      const answer = await answerSetProfile(desk, ME, post(body), quiet);
      expect(answer.status, JSON.stringify(body)).toBe(400);
      expect(await json(answer)).toEqual({ error: 'body: { name, avatar } or { remove: true }' });
    }
    expect(desk.setProfile).not.toHaveBeenCalled();
  });

  it('takes only one of the Bazar’s avatars with a baked thumbnail, refused in the till’s words', async () => {
    const desk = fakeDesk();
    for (const avatar of ['starter-chair-01', 'avatar-not-baked-here', '../x', 'Avatar-Arla']) {
      const answer = await answerSetProfile(desk, ME, post({ name: 'Rima', avatar }), quiet);
      expect(answer.status, avatar).toBe(400);
      expect(await json(answer)).toEqual({ error: 'refused', problems: [PROFILE_AVATAR_PROBLEM] });
    }
    expect(desk.setProfile).not.toHaveBeenCalled();
    expect(PROFILE_AVATARS.map((avatar) => avatar.id)).toContain(ARLA);
  });

  it('checks the body before it looks for the desk', async () => {
    expect((await answerSetProfile(null, ME, post({ remove: 1 }), quiet)).status).toBe(400);
    expect((await answerSetProfile(null, ME, post({ remove: true }), quiet)).status).toBe(503);
  });

  it('publishes as the session’s wallet, the name as written: the till trims and decides', async () => {
    const desk = fakeDesk({
      setProfile: answering({
        ok: true,
        profile: { name: 'Rima', avatar: LYRA, updatedAt: UPDATED },
      }),
    });
    const answer = await answerSetProfile(
      desk,
      ME.toUpperCase().replace('0X', '0x'),
      post({ name: '  Rima ', avatar: LYRA }),
      quiet,
    );
    expect(answer.status).toBe(200);
    expect(answer.headers.get('cache-control')).toBe('no-store');
    expect(await json(answer)).toEqual({
      ok: true,
      profile: { name: 'Rima', avatar: LYRA, face: `/thumbs/1x/${LYRA}.webp` },
    });
    expect(desk.setProfile).toHaveBeenCalledWith(ME, { name: '  Rima ', avatar: LYRA });
  });

  it('stops showing them with `{ remove: true }`: the till is asked to delete, and nothing is left', async () => {
    const desk = fakeDesk();
    const answer = await answerSetProfile(desk, ME, post({ remove: true }), quiet);
    expect(answer.status).toBe(200);
    expect(await json(answer)).toEqual({ ok: true, profile: null });
    expect(desk.setProfile).toHaveBeenCalledWith(ME, null);
  });

  it('passes the till’s refusal on as 400 in its words, and a broken till as 502', async () => {
    const refused = fakeDesk({
      setProfile: answering({ ok: false, problems: [PROFILE_NAME_PROBLEM] }),
    });
    const answer = await answerSetProfile(
      refused,
      ME,
      post({ name: '\u200b', avatar: null }),
      quiet,
    );
    expect(answer.status).toBe(400);
    expect(await json(answer)).toEqual({ error: 'refused', problems: [PROFILE_NAME_PROBLEM] });
    const threw = fakeDesk({
      setProfile: vi.fn(async () => {
        throw new RangeError('boom');
      }),
    });
    expect((await answerSetProfile(threw, ME, post({ remove: true }), quiet)).status).toBe(502);
    expect(quiet).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'set-profile', rule: 'threw', error: 'RangeError' }),
    );
    const shapeless = fakeDesk({ setProfile: answering({ ok: 'yes' }) });
    expect((await answerSetProfile(shapeless, ME, post({ remove: true }), quiet)).status).toBe(502);
  });

  it('logs to telemetry by default', async () => {
    expect((await answerSetProfile(fakeDesk(), ME, post({ remove: true }))).status).toBe(200);
  });
});

describe('the roles view: a face instead of the avatar’s id, wherever it is answered', () => {
  const member = (body: unknown, index: number) =>
    (body as { members: Record<string, unknown>[] }).members[index] ?? {};

  it('GET /api/saldo/roles shows each name, and the face of a baked avatar or none', async () => {
    const asker: Asker = { wallet: ME, house: false };
    const answer = await answerRoles(
      fakeDesk(),
      asker,
      new URL('https://numinia.com/api/saldo/roles?cuenta=acc'),
      quiet,
    );
    const { roles } = (await json(answer)) as { roles: unknown };
    expect(member(roles, 0)).toMatchObject({ name: 'Rima', face: ARLA_FACE });
    expect(member(roles, 1)).toMatchObject({ name: 'María', face: null });
    expect(member(roles, 2)).toMatchObject({ name: 'Ana', face: null });
    expect(Object.keys(member(roles, 3)).sort()).toEqual([
      'addedAt',
      'assignable',
      'owner',
      'roleIds',
      'wallet',
    ]);
    const text = JSON.stringify(roles);
    expect(text).not.toContain(ARLA.concat('"'));
    expect(text).not.toContain('"avatar"');
  });

  it('POST /api/saldo’s role acts answer the organization with faces too', async () => {
    const answer = await answerAction(
      fakeDesk(),
      { wallet: ME, house: false },
      new Request('https://numinia.com/api/saldo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'take-role',
          accountId: 'acc',
          wallet: ME,
          roleId: ROLE_ID,
        }),
      }),
      quiet,
    );
    const { result } = (await json(answer)) as { result: unknown };
    expect(member(result, 0)).toMatchObject({ name: 'Rima', face: ARLA_FACE });
    expect(JSON.stringify(result)).not.toContain('"avatar"');
  });

  it('GET /api/people shows a member each name and face, and never the avatar’s id', async () => {
    const answer = await answerPeople(fakeDesk(), ME, 'acc', quiet);
    const body = (await json(answer)) as { groups: { people: Record<string, unknown>[] }[] };
    const people = body.groups.flatMap((group) => group.people);
    expect(people.map((person) => [person['name'], person['face']])).toEqual([
      ['Rima', ARLA_FACE],
      ['María', null],
      ['Ana', null],
      [undefined, undefined],
    ]);
    expect(JSON.stringify(body)).not.toContain('"avatar"');
    expect(JSON.stringify(body)).not.toContain(ARLA.concat('"'));
  });

  it('works end to end against the fixture desk: what you publish your organization sees', async () => {
    const desk = fixtureAccounts();
    const asker: Asker = { wallet: ME, house: false };
    expect(await json(await answerProfile(desk, ME, quiet))).toEqual({ ok: true, profile: null });
    const published = await answerSetProfile(
      desk,
      ME,
      post({ name: ' Rima ', avatar: ARLA }),
      quiet,
    );
    expect(await json(published)).toEqual({
      ok: true,
      profile: { name: 'Rima', avatar: ARLA, face: ARLA_FACE },
    });
    const url = new URL('https://numinia.com/api/saldo/roles?cuenta=acc_team_numen_games');
    const seen = (await json(await answerRoles(desk, asker, url, quiet))) as {
      roles: { members: Record<string, unknown>[] };
    };
    const me = seen.roles.members.find((one) => one['wallet'] === ME);
    expect(me).toMatchObject({ name: 'Rima', face: ARLA_FACE });
    expect(await json(await answerSetProfile(desk, ME, post({ remove: true }), quiet))).toEqual({
      ok: true,
      profile: null,
    });
    const after = (await json(await answerRoles(desk, asker, url, quiet))) as {
      roles: { members: Record<string, unknown>[] };
    };
    expect(after.roles.members.find((one) => one['wallet'] === ME)).not.toHaveProperty('name');
    expect(await json(await answerProfile(desk, ME, quiet))).toEqual({ ok: true, profile: null });
  });
});
