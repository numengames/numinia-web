import { describe, it, expect, vi } from 'vitest';
import { getAdminSession } from '@/lib/auth/getSession';
import { NextRequest } from 'next/server';
vi.mock('@/lib/session', () => ({ verifySession: (v: string) => { try { return JSON.parse(v); } catch { return null; } }, verifyCsrf: () => true, signSession: (p: unknown) => JSON.stringify(p), generateCsrfToken: () => 'test-csrf' }));

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

  it('recognizes wallet admin_session cookie', () => {
    const req = createRequest({
      admin_session: JSON.stringify({
        address: '0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26',
        role: 'admin',
        authenticatedAt: new Date().toISOString(),
      }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
    expect(session.role).toBe('admin');
    expect(session.address).toBe('0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26');
  });

  it('recognizes GitHub OAuth session cookie with admin role', () => {
    const req = createRequest({
      session: JSON.stringify({
        userId: 'user-123',
        username: 'PabloFMM',
        role: 'admin',
      }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
    expect(session.userId).toBe('user-123');
  });

  it('recognizes GitHub OAuth session cookie with creator role', () => {
    const req = createRequest({
      session: JSON.stringify({
        userId: 'user-456',
        username: 'creator1',
        role: 'creator',
      }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
  });

  it('rejects GitHub OAuth session with user role', () => {
    const req = createRequest({
      session: JSON.stringify({
        userId: 'user-789',
        username: 'normaluser',
        role: 'user',
      }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });

  it('wallet session takes priority over GitHub OAuth', () => {
    const req = createRequest({
      admin_session: JSON.stringify({
        address: '0xWALLET',
        role: 'admin',
      }),
      session: JSON.stringify({
        userId: 'github-user',
        role: 'admin',
      }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(true);
    expect(session.address).toBe('0xWALLET');
    expect(session.userId).toBeUndefined();
  });

  it('handles malformed cookies gracefully', () => {
    const req = createRequest({
      admin_session: 'not-json',
      session: '{broken',
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
    expect(session.role).toBe('anonymous');
  });

  it('rejects wallet session without admin role', () => {
    const req = createRequest({
      admin_session: JSON.stringify({
        address: '0xSOME',
        role: 'user',
      }),
    });
    const session = getAdminSession(req);
    expect(session.isAdmin).toBe(false);
  });
});
