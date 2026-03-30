import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as nonceHandler } from '@/app/api/auth/wallet/nonce/route';
import { GET as sessionGet, DELETE as sessionDelete } from '@/app/api/auth/wallet/session/route';

// Mock next/headers cookies
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

beforeEach(() => {
  mockCookies.clear();
});

describe('GET /api/auth/wallet/nonce', () => {
  it('returns a nonce string', async () => {
    const res = await nonceHandler();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nonce).toBeDefined();
    expect(typeof data.nonce).toBe('string');
    expect(data.nonce.length).toBeGreaterThan(0);
  });

  it('stores nonce in cookie', async () => {
    await nonceHandler();
    expect(mockCookies.has('siwe_nonce')).toBe(true);
  });
});

describe('GET /api/auth/wallet/session', () => {
  it('returns unauthenticated when no session cookie', async () => {
    const res = await sessionGet();
    const data = await res.json();

    expect(data.authenticated).toBe(false);
  });

  it('returns authenticated with valid admin_session cookie', async () => {
    mockCookies.set('admin_session', JSON.stringify({
      address: '0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26',
      role: 'admin',
      authenticatedAt: new Date().toISOString(),
    }));

    const res = await sessionGet();
    const data = await res.json();

    expect(data.authenticated).toBe(true);
    expect(data.address).toBe('0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26');
    expect(data.role).toBe('admin');
  });

  it('returns unauthenticated with malformed cookie', async () => {
    mockCookies.set('admin_session', 'not-json');

    const res = await sessionGet();
    const data = await res.json();

    expect(data.authenticated).toBe(false);
  });
});

describe('DELETE /api/auth/wallet/session', () => {
  it('clears the admin_session cookie', async () => {
    mockCookies.set('admin_session', JSON.stringify({ role: 'admin' }));

    const res = await sessionDelete();
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockCookies.has('admin_session')).toBe(false);
  });
});
