import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock cookies
const mockCookies = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = mockCookies.get(name);
      return value ? { name, value } : undefined;
    },
    set: (opts: { name: string; value: string }) => {
      mockCookies.set(opts.name, opts.value);
    },
    delete: (name: string) => {
      mockCookies.delete(name);
    },
  })),
}));

import { GET } from '@/app/api/auth/session/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';

beforeEach(() => {
  mockCookies.clear();
});

describe('GET /api/auth/session', () => {
  it('returns null user when no session cookie', async () => {
    const req = new NextRequest('http://localhost/api/auth/session');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeNull();
  });

  it('returns user data from valid session cookie', async () => {
    mockCookies.set('session', JSON.stringify({
      userId: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin',
    }));

    const req = new NextRequest('http://localhost/api/auth/session');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).not.toBeNull();
    expect(data.user.userId).toBe('user-1');
    expect(data.user.username).toBe('testuser');
    expect(data.user.role).toBe('admin');
  });

  it('returns null user for malformed cookie', async () => {
    mockCookies.set('session', 'not-valid-json!!!');

    const req = new NextRequest('http://localhost/api/auth/session');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeNull();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears session cookie', async () => {
    mockCookies.set('session', JSON.stringify({ userId: 'user-1' }));

    const res = await logoutPost();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCookies.has('session')).toBe(false);
  });

  it('succeeds even without existing session', async () => {
    const res = await logoutPost();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
