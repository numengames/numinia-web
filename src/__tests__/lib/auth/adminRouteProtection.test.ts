import { describe, it, expect, afterEach } from 'vitest';
import { getAdminSession } from '@/lib/auth/getSession';
import { NextRequest } from 'next/server';

// Helper: create a fake JWT with a given payload (no real signature)
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function unauthenticatedRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`);
}

function authenticatedRequest(url: string): NextRequest {
  const address = '0xtest';
  process.env.ADMIN_WALLET_ADDRESSES = address;
  const req = new NextRequest(`http://localhost:3000${url}`);
  req.cookies.set('tw_jwt', fakeJwt({ sub: address }));
  return req;
}

describe('Admin route protection', () => {
  afterEach(() => {
    delete process.env.ADMIN_WALLET_ADDRESSES;
  });

  it('getAdminSession returns false for unauthenticated requests', () => {
    const req = unauthenticatedRequest('/api/admin/upload');
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });

  it('getAdminSession returns true for authenticated admin requests', () => {
    const req = authenticatedRequest('/api/admin/upload');
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
    expect(session.address).toBe('0xtest');
  });

  it('rejects empty tw_jwt cookie value', () => {
    const req = new NextRequest('http://localhost:3000/api/test');
    req.cookies.set('tw_jwt', '');
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });

  it('rejects tw_jwt with non-admin address', () => {
    process.env.ADMIN_WALLET_ADDRESSES = '0xADMIN';
    const req = new NextRequest('http://localhost:3000/api/test');
    req.cookies.set('tw_jwt', fakeJwt({ sub: '0xNOTADMIN' }));
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });
});
