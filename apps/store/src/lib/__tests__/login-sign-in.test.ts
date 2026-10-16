/**
 * «El censo» (cut of 2026-10-16): a verified sign-in is recorded in the
 * till best effort, after the session cookie is decided — and nothing the
 * till does (refuse, throw, hang, be missing, be older than the store)
 * changes the answer: `{ ok: true }` with the cookie, every time. A refused
 * sign-in records nothing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGAL_CORPUS_VERSION } from '../legal';

const WALLET = `0x${'Ab'.repeat(20)}`;

const verdict = vi.hoisted(() => ({ valid: true }));
const desk = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../auth/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('../auth/server')>();
  return {
    ...original,
    authConfigured: () => true,
    getAuth: () => ({
      verifyPayload: async () =>
        verdict.valid ? { valid: true, payload: { address: WALLET } } : { valid: false },
    }),
    issueSession: async () => 'session-token',
  };
});

vi.mock('../accounts-source', async (importOriginal) => {
  const original = await importOriginal<typeof import('../accounts-source')>();
  return { ...original, accountsFrom: () => desk.current };
});

interface Sent {
  readonly response: Response;
  readonly cookies: string[];
  readonly deferred: Promise<unknown>[];
}

async function signIn(locals: unknown = undefined): Promise<Sent> {
  const { POST } = await import('../../pages/api/auth/login');
  const url = new URL('https://numinia.com/api/auth/login');
  const request = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: { address: WALLET },
      signature: '0xdeadbeef',
      terms: LEGAL_CORPUS_VERSION,
    }),
  });
  const cookies: string[] = [];
  const deferred: Promise<unknown>[] = [];
  const context = {
    request,
    url,
    cookies: { set: (name: string, value: string) => cookies.push(`${name}=${value}`) },
    locals: locals ?? { cfContext: { waitUntil: (work: Promise<unknown>) => deferred.push(work) } },
  };
  const response = (await POST(context as never)) as Response;
  return { response, cookies, deferred };
}

function deskWith(signedIn: unknown): unknown {
  return { signedIn };
}

beforeEach(() => {
  verdict.valid = true;
  desk.current = null;
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('a verified sign-in, recorded best effort', () => {
  it('asks the till to note the wallet, lowercased, as work for after the answer', async () => {
    const signedIn = vi.fn(async () => ({ ok: true }));
    desk.current = deskWith(signedIn);
    const { response, cookies, deferred } = await signIn();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(cookies).toHaveLength(1);
    expect(deferred).toHaveLength(1);
    await Promise.all(deferred);
    expect(signedIn).toHaveBeenCalledWith(WALLET.toLowerCase());
  });

  it('signs in all the same when the till throws, rejects, refuses or hangs', async () => {
    for (const signedIn of [
      vi.fn(() => {
        throw new Error('sync');
      }),
      vi.fn(async () => Promise.reject(new Error('async'))),
      vi.fn(async () => ({ ok: false, problems: ['wallet must be a lowercase 0x wallet'] })),
      vi.fn(() => new Promise(() => undefined)),
    ]) {
      desk.current = deskWith(signedIn);
      const { response, cookies, deferred } = await signIn();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(cookies).toEqual(['numinia_session=session-token']);
      expect(deferred).toHaveLength(1);
    }
  });

  it('signs in all the same with no till, a till without the method, or no Worker context', async () => {
    for (const current of [null, {}, deskWith(undefined)]) {
      desk.current = current;
      const { response, cookies } = await signIn();
      expect(response.status).toBe(200);
      expect(cookies).toHaveLength(1);
    }
    desk.current = deskWith(vi.fn(async () => ({ ok: true })));
    const bare = await signIn({});
    expect(bare.response.status).toBe(200);
    const broken = await signIn({
      cfContext: {
        waitUntil: () => {
          throw new Error('closed');
        },
      },
    });
    expect(broken.response.status).toBe(200);
    expect(await broken.response.json()).toEqual({ ok: true });
  });

  it('records nothing when the signature does not verify', async () => {
    verdict.valid = false;
    const signedIn = vi.fn(async () => ({ ok: true }));
    desk.current = deskWith(signedIn);
    const { response, cookies, deferred } = await signIn();
    expect(response.status).toBe(401);
    expect(cookies).toEqual([]);
    expect(deferred).toEqual([]);
    expect(signedIn).not.toHaveBeenCalled();
  });
});
