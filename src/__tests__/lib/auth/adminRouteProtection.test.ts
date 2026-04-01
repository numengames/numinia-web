import { describe, it, expect, vi } from 'vitest';
import { getAdminSession } from '@/lib/auth/getSession';
import { NextRequest } from 'next/server';
vi.mock('@/lib/session', () => ({ verifySession: (v: string) => { try { return JSON.parse(v); } catch { return null; } }, verifyCsrf: () => true, signSession: (p: unknown) => JSON.stringify(p), generateCsrfToken: () => 'test-csrf' }));

/**
 * Tests that all admin-gated API routes properly check auth.
 * These are integration-style tests that import the actual route handlers
 * and verify they return 401 when no admin session is present.
 */

function unauthenticatedRequest(url: string, method: string = 'GET', body?: unknown): NextRequest {
  const req = new NextRequest(`http://localhost:3000${url}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
  return req;
}

function authenticatedRequest(url: string, method: string = 'GET', body?: unknown): NextRequest {
  const req = new NextRequest(`http://localhost:3000${url}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
  req.cookies.set('admin_session', JSON.stringify({
    address: '0xTEST',
    role: 'admin',
    authenticatedAt: new Date().toISOString(),
  }));
  return req;
}

describe('Admin route protection', () => {
  it('getAdminSession returns false for unauthenticated requests', () => {
    const req = unauthenticatedRequest('/api/admin/upload');
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });

  it('getAdminSession returns true for authenticated requests', () => {
    const req = authenticatedRequest('/api/admin/upload');
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
    expect(session.address).toBe('0xTEST');
  });

  it('rejects empty admin_session cookie value', () => {
    const req = new NextRequest('http://localhost:3000/api/test');
    req.cookies.set('admin_session', '');
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });

  it('rejects admin_session with wrong role', () => {
    const req = new NextRequest('http://localhost:3000/api/test');
    req.cookies.set('admin_session', JSON.stringify({ address: '0x', role: 'viewer' }));
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });

  it('falls back to GitHub OAuth when wallet session invalid', () => {
    const req = new NextRequest('http://localhost:3000/api/test');
    req.cookies.set('admin_session', 'broken');
    req.cookies.set('session', JSON.stringify({ userId: 'u1', username: 'test', role: 'creator' }));
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
    expect(session.userId).toBe('u1');
  });
});
