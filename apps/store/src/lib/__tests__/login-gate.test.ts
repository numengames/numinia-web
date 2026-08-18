/**
 * The legal gate is server-side, not decorative (MIS-086): the checkbox lives
 * in a React island a client can simply not run, so the endpoint refuses to
 * create a session unless the request names the current corpus.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGAL_CORPUS_VERSION } from '../legal';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('THIRDWEB_SECRET_KEY', 'x'.repeat(40));
  vi.stubEnv('AUTH_SESSION_SECRET', 'y'.repeat(40));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function postLogin(body: unknown): Promise<Response> {
  const { POST } = await import('../../pages/api/auth/login');
  const url = new URL('https://numinia.com/api/auth/login');
  const request = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // Astro hands the route a context; only these three are read here.
  return (await POST({
    request,
    url,
    cookies: { set: () => undefined },
  } as never)) as Response;
}

const signed = { payload: { address: '0xabc' }, signature: '0xdeadbeef' };

describe('login endpoint legal gate', () => {
  it('refuses a login that names no acceptance', async () => {
    const response = await postLogin(signed);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; required: string };
    expect(body.error).toBe('Legal acceptance is required');
    // The answer names what the client must show and send back.
    expect(body.required).toBe(LEGAL_CORPUS_VERSION);
  });

  it('refuses a stale or malformed acceptance', async () => {
    for (const terms of ['terms@0.9.0+privacy@1.1.0', '', true, null, { v: 1 }]) {
      const response = await postLogin({ ...signed, terms });
      expect(response.status, JSON.stringify(terms)).toBe(400);
    }
  });

  it('checks the acceptance before the signature — no wallet work is wasted', async () => {
    // A missing signature is a 400 too, but the acceptance answer must come
    // first: the ordering is what keeps an unaccepted login from ever
    // reaching the vendor.
    const response = await postLogin({ payload: {}, signature: '0x1', terms: undefined });
    expect((await response.json()).error).toBe('Legal acceptance is required');
  });
});
