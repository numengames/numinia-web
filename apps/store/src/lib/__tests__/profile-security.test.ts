/**
 * «Tu nombre y tu cara» (cut of 2026-10-16), the security of it, through the
 * real routes with real session tokens: /api/profile never reads or writes
 * any wallet's profile but the session's own, whatever the request names;
 * and no answer to someone who is not a member of an organization — signed
 * out, or a stranger to it — carries a name or a face (STD-053: «Only
 * fellow members see who it is»). Nothing of the session code is faked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken } from '@numinia/auth';
import type { AccountDesk } from '../accounts';
import { NOT_MEMBER } from '../accounts';
import { accountsFrom, answerPeople, resetFixtureAccountsForTests } from '../accounts-source';
import { SESSION_COOKIE } from '../auth/server';
import { sessionWallet } from '../auth/session-wallet';
import { primeRuntimeEnv } from '../runtime-env';
import { GET as getProfile, POST as postProfile } from '../../pages/api/profile';
import { GET as getRoles } from '../../pages/api/saldo/roles';

const SECRET = 'w'.repeat(40);
const ME = `0x${'ab'.repeat(20)}`;
const OTHER = `0x${'cd'.repeat(20)}`;
const STRANGER = `0x${'ef'.repeat(20)}`;
const ARLA = 'avatar-arla-mncdhz3l';
const NOW = Math.floor(Date.now() / 1000);
/** The organization the community `numen-games` links (components/communities/register.ts). */
const NUMEN = 'acc_team_numen_games';

/** The desk the routes find bound, per test; undefined leaves the fixture desk. */
let bound: AccountDesk | undefined;
primeRuntimeEnv({
  AUTH_SESSION_SECRET: SECRET,
  THIRDWEB_SECRET_KEY: 'x'.repeat(40),
  get TILL_ACCOUNTS() {
    return bound;
  },
});

const tokenOf = (wallet: string): Promise<string> =>
  createSessionToken(
    {
      sub: wallet,
      rank: 'nomad',
      iat: NOW - 60,
      exp: NOW + 3_600,
      terms: 'terms@1.0.0+privacy@1.0.0',
    },
    SECRET,
  );

/** What a route is handed: the request, its URL and the session cookie, if any. */
async function context(wallet: string | null, url: string, init?: RequestInit) {
  const token = wallet === null ? undefined : await tokenOf(wallet);
  const request = new Request(url, init);
  return {
    request,
    url: new URL(request.url),
    cookies: {
      get: (name: string) => (name === SESSION_COOKIE && token ? { value: token } : undefined),
    },
  } as never;
}

const posting = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * GET /api/people?comunidad=numen-games, as its route answers it: the desk
 * the route finds, the wallet of the real session cookie, and the
 * organization the community's file links. (The route itself imports the
 * community register, Markdown only the build reads.)
 */
async function getPeople(wallet: string | null): Promise<Response> {
  const token = wallet === null ? undefined : await tokenOf(wallet);
  return answerPeople(
    accountsFrom({ binding: bound, dataSource: 'fixture' }),
    await sessionWallet(token),
    NUMEN,
  );
}

/** The till's members of Numen Games, published names and avatars included, for ME and OTHER only. */
const TILL_VIEW = {
  ok: true,
  accountId: NUMEN,
  as: 'member',
  roles: [],
  members: [
    {
      wallet: ME,
      owner: true,
      addedAt: 'a',
      roleIds: [],
      assignable: [],
      name: 'Rima',
      avatar: ARLA,
    },
    {
      wallet: OTHER,
      owner: false,
      addedAt: 'a',
      roleIds: [],
      assignable: [],
      name: 'María',
      avatar: null,
    },
  ],
};

/** A desk that answers like the till: names to members only, a number to anyone. */
function tillLike(): AccountDesk {
  const members = new Set([ME, OTHER]);
  const roles = vi.fn(async (wallet: string) =>
    members.has(wallet) ? TILL_VIEW : { ok: false, problems: [NOT_MEMBER] },
  );
  return {
    overview: vi.fn(),
    directory: vi.fn(),
    createTeam: vi.fn(),
    renameTeam: vi.fn(),
    statement: vi.fn(),
    members: vi.fn(),
    access: vi.fn(),
    setMember: vi.fn(),
    removeMember: vi.fn(),
    roles,
    headcount: vi.fn(async () => ({ ok: true, accountId: NUMEN, members: 2 })),
    createRole: vi.fn(),
    editRole: vi.fn(),
    moveRole: vi.fn(),
    deleteRole: vi.fn(),
    giveRole: vi.fn(),
    takeRole: vi.fn(),
    log: vi.fn(),
    startTopup: vi.fn(),
    confirmTopup: vi.fn(),
    profile: vi.fn(async () => ({ ok: true, profile: null })),
    setProfile: vi.fn(async () => ({ ok: true, profile: null })),
  } as unknown as AccountDesk;
}

const body = async (response: Response): Promise<string> => response.text();

/** Every trace of a published name or face: the names, the thumbnails, the avatar's id or key. */
const NAMES_OR_FACES = /Rima|María|\/thumbs\/|"avatar"|"face"|"name"/;

beforeEach(() => {
  vi.stubEnv('DATA_SOURCE', 'fixture');
});
afterEach(() => {
  bound = undefined;
  resetFixtureAccountsForTests();
  vi.unstubAllEnvs();
});

describe('/api/profile reads and writes the session’s own profile, and no other', () => {
  it('asks the till for the session’s wallet alone, whatever the address names', async () => {
    const desk = tillLike();
    bound = desk;
    const signedOut = await getProfile(await context(null, `https://numinia.com/api/profile`));
    expect(signedOut.status).toBe(401);
    const answer = await getProfile(
      await context(ME, `https://numinia.com/api/profile?wallet=${OTHER}&cartera=${OTHER}`),
    );
    expect(answer.status).toBe(200);
    expect(desk.profile).toHaveBeenCalledTimes(1);
    expect(desk.profile).toHaveBeenCalledWith(ME);
  });

  it('refuses a body that names a wallet, and writes only the session’s own row', async () => {
    const desk = tillLike();
    bound = desk;
    const url = 'https://numinia.com/api/profile';
    for (const sent of [
      { name: 'Rima', avatar: null, wallet: OTHER },
      { remove: true, wallet: OTHER },
      { name: 'Rima', avatar: null, owner: OTHER },
    ]) {
      const refused = await postProfile(await context(ME, url, posting(sent)));
      expect(refused.status, JSON.stringify(sent)).toBe(400);
    }
    expect(desk.setProfile).not.toHaveBeenCalled();
    expect((await postProfile(await context(null, url, posting({ remove: true })))).status).toBe(
      401,
    );
    await postProfile(await context(ME, `${url}?wallet=${OTHER}`, posting({ remove: true })));
    await postProfile(await context(ME, url, posting({ name: 'Rima', avatar: ARLA })));
    expect(vi.mocked(desk.setProfile).mock.calls).toEqual([
      [ME, null],
      [ME, { name: 'Rima', avatar: ARLA }],
    ]);
  });

  it('against the fixture desk, one wallet’s name is never another’s to read or to remove', async () => {
    const url = 'https://numinia.com/api/profile';
    const published = await postProfile(
      await context(ME, url, posting({ name: 'Rima', avatar: ARLA })),
    );
    expect(published.status).toBe(200);
    const theirs = await getProfile(await context(OTHER, `${url}?wallet=${ME}`));
    expect(JSON.parse(await body(theirs))).toEqual({ ok: true, profile: null });
    const removed = await postProfile(await context(OTHER, url, posting({ remove: true })));
    expect(JSON.parse(await body(removed))).toEqual({ ok: true, profile: null });
    const mine = await getProfile(await context(ME, url));
    expect(JSON.parse(await body(mine))).toMatchObject({ profile: { name: 'Rima' } });
  });
});

describe('no answer to someone who is not a member carries a name or a face', () => {
  it('shows a member the names; a stranger or a visitor only how many', async () => {
    const desk = tillLike();
    bound = desk;
    const member = await body(await getPeople(OTHER));
    expect(member).toMatch(/Rima/);
    for (const who of [STRANGER, null]) {
      const answer = await getPeople(who);
      expect(answer.status).toBe(200);
      const text = await body(answer);
      expect(JSON.parse(text)).toEqual({ view: 'count', members: 2 });
      expect(text).not.toMatch(NAMES_OR_FACES);
    }
  });

  it('refuses a stranger the roles view, and says nothing of anyone in the refusal', async () => {
    bound = tillLike();
    const url = `https://numinia.com/api/saldo/roles?cuenta=${NUMEN}`;
    const stranger = await getRoles(await context(STRANGER, url));
    expect(stranger.status).toBe(403);
    expect(await body(stranger)).not.toMatch(NAMES_OR_FACES);
    const visitor = await getRoles(await context(null, url));
    expect(visitor.status).toBe(401);
    expect(await body(visitor)).not.toMatch(NAMES_OR_FACES);
  });

  it('against the fixture desk, a name published in one organization never reaches a stranger to it', async () => {
    const profile = 'https://numinia.com/api/profile';
    await postProfile(await context(ME, profile, posting({ name: 'Rima', avatar: ARLA })));
    // OTHER's own world of the fixture is a separate set of organizations: ME is in none of them.
    const people = await body(await getPeople(OTHER));
    expect(people).toMatch(/Lucía Vidal/);
    expect(people).not.toMatch(/Rima/);
    const roles = await body(
      await getRoles(await context(OTHER, `https://numinia.com/api/saldo/roles?cuenta=${NUMEN}`)),
    );
    expect(roles).not.toMatch(/Rima/);
  });
});
