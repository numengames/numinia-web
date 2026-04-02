import { describe, it, expect } from 'vitest';
import { getAdminSession, getUserSession } from '@/lib/auth/getSession';
import { NextRequest } from 'next/server';

// Helper: create a fake JWT with a given payload (no real signature)
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function createRequest(cookies: Record<string, string> = {}): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

describe('getAdminSession', () => {
  it('returns anonymous when no cookies', () => {
    const req = createRequest();
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
    expect(session.role).toBe('anonymous');
  });

  it('recognizes tw_jwt with admin address', () => {
    const address = '0x42e62e421bedf2469826879ec1a0574d7d3cca26';
    process.env.ADMIN_WALLET_ADDRESSES = address;
    const req = createRequest({
      tw_jwt: fakeJwt({ sub: address }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
    expect(session.role).toBe('admin');
    expect(session.address).toBe(address);
    delete process.env.ADMIN_WALLET_ADDRESSES;
  });

  it('rejects tw_jwt with non-admin address', () => {
    process.env.ADMIN_WALLET_ADDRESSES = '0xADMIN';
    const req = createRequest({
      tw_jwt: fakeJwt({ sub: '0xNOTADMIN' }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
    delete process.env.ADMIN_WALLET_ADDRESSES;
  });

  it('handles malformed JWT gracefully', () => {
    const req = createRequest({
      tw_jwt: 'not-a-jwt',
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
    expect(session.role).toBe('anonymous');
  });
});

describe('getUserSession', () => {
  it('returns unauthenticated when no cookies', () => {
    const req = createRequest();
    const session = getUserSession(req);
    expect(session.authenticated).toBe(false);
  });

  it('recognizes tw_jwt with any address', () => {
    const req = createRequest({
      tw_jwt: fakeJwt({ sub: '0xUSER' }),
    });
    const session = getUserSession(req);
    expect(session.authenticated).toBe(true);
    expect(session.address).toBe('0xUSER');
  });

  it('returns unauthenticated for JWT without sub', () => {
    const req = createRequest({
      tw_jwt: fakeJwt({ iss: 'test' }),
    });
    const session = getUserSession(req);
    expect(session.authenticated).toBe(false);
  });
});
