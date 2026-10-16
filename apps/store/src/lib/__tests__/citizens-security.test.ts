/**
 * «El censo» (cut of 2026-10-16), the security of it, through the real
 * route with real session tokens: only an Oracle's session — the house — is
 * answered the list of who has signed in; every other rank, and no session,
 * gets 403, whatever the request says of itself; no answer carries an
 * avatar's id; and the panel's «Add member» never asks for the list unless
 * the session is the house (STD-053: «Only fellow members see who it is»).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken } from '@numinia/auth';
import type { Rank } from '@numinia/domain';
import { resetFixtureAccountsForTests } from '../accounts-source';
import { SESSION_COOKIE } from '../auth/server';
import { CITIZENS_API, isHouseSession, suggestCitizens } from '../census-list';
import { primeRuntimeEnv } from '../runtime-env';
import { GET as getCitizens } from '../../pages/api/admin/citizens';

const SECRET = 'w'.repeat(40);
const HOUSE = `0x${'99'.repeat(20)}`;
const ADMIN = `0x${'ab'.repeat(20)}`;
const NOW = Math.floor(Date.now() / 1000);

primeRuntimeEnv({ AUTH_SESSION_SECRET: SECRET, THIRDWEB_SECRET_KEY: 'x'.repeat(40) });

const tokenOf = (wallet: string, rank: Rank): Promise<string> =>
  createSessionToken(
    { sub: wallet, rank, iat: NOW - 60, exp: NOW + 3_600, terms: 'terms@1.0.0+privacy@1.0.0' },
    SECRET,
  );

async function ask(
  session: { wallet: string; rank: Rank } | null,
  query = '',
  forged: Record<string, string> = {},
): Promise<Response> {
  const token = session === null ? undefined : await tokenOf(session.wallet, session.rank);
  const request = new Request(`https://numinia.com/api/admin/citizens${query}`, {
    headers: forged,
  });
  return (await getCitizens({
    request,
    url: new URL(request.url),
    cookies: {
      get: (name: string) => (name === SESSION_COOKIE && token ? { value: token } : undefined),
    },
    locals: {},
  } as never)) as Response;
}

beforeEach(() => {
  vi.stubEnv('DATA_SOURCE', 'fixture');
});
afterEach(() => {
  vi.unstubAllEnvs();
  resetFixtureAccountsForTests();
});

describe('GET /api/admin/citizens through the real route', () => {
  it('answers an Oracle’s session the list, private and never stored', async () => {
    const out = await ask({ wallet: HOUSE, rank: 'oracle' });
    expect(out.status).toBe(200);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    const body = (await out.json()) as { people: unknown[]; total: number };
    expect(body.people.length).toBe(6);
    expect(body.total).toBe(6);
  });

  it('refuses every other rank, and no session, with 403 — an organization’s admin included', async () => {
    const ranks: Rank[] = ['nomad', 'citizen', 'archon'];
    for (const rank of ranks) {
      const out = await ask({ wallet: ADMIN, rank });
      expect(out.status, rank).toBe(403);
      expect(await out.text()).not.toContain('0x');
    }
    expect((await ask(null)).status).toBe(403);
  });

  it('never takes the house’s flag from the request', async () => {
    const forged = await ask({ wallet: ADMIN, rank: 'nomad' }, '?house=true&rank=oracle', {
      'x-house': 'true',
      'x-rank': 'oracle',
      cookie: 'rank=oracle',
    });
    expect(forged.status).toBe(403);
  });

  it('lets no avatar id leave: a face path or nothing', async () => {
    const out = await ask({ wallet: HOUSE, rank: 'oracle' }, '?q=luc');
    const text = await out.text();
    expect(text).not.toContain('"avatar"');
    expect(text).not.toMatch(/"avatar-arla-mncdhz3l"/);
    expect(text).toContain('/thumbs/1x/avatar-arla-mncdhz3l.webp');
  });
});

describe('the panel’s «Add member» asks for the list for the house alone', () => {
  it('knows the house by the session’s Oracle rank, and by nothing else', () => {
    expect(isHouseSession({ status: 'in', rank: 'oracle' })).toBe(true);
    for (const rank of ['nomad', 'citizen', 'archon', 'ORACLE', '']) {
      expect(isHouseSession({ status: 'in', rank }), rank).toBe(false);
    }
    expect(isHouseSession({ status: 'out' })).toBe(false);
  });

  it('sends no request at all for a session that is not the house', async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    expect(await suggestCitizens(false, 'lucía', fetcher)).toEqual([]);
    expect(await suggestCitizens(false, '0x00000000', fetcher)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('names the list’s address in one place: no panel component writes it', () => {
    const folder = new URL('../../components/panel/', import.meta.url);
    for (const file of readdirSync(folder)) {
      const source = readFileSync(new URL(file, folder), 'utf8');
      expect(source, file).not.toContain(CITIZENS_API);
    }
  });
});
