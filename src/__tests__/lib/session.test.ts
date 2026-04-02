import { describe, it, expect } from 'vitest';
import { generateCsrfToken, verifyCsrf } from '@/lib/session';
import { NextRequest } from 'next/server';

describe('CSRF utilities', () => {
  it('generates a UUID token', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates unique tokens', () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    expect(a).not.toBe(b);
  });

  it('verifies matching token', () => {
    const token = generateCsrfToken();
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'X-CSRF-Token': token },
    });
    req.cookies.set('csrf_token', token);
    expect(verifyCsrf(req)).toBe(true);
  });

  it('rejects mismatched token', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'X-CSRF-Token': 'wrong-token' },
    });
    req.cookies.set('csrf_token', generateCsrfToken());
    expect(verifyCsrf(req)).toBe(false);
  });

  it('rejects missing header', () => {
    const req = new NextRequest('http://localhost/api/test');
    req.cookies.set('csrf_token', generateCsrfToken());
    expect(verifyCsrf(req)).toBe(false);
  });

  it('rejects missing cookie', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'X-CSRF-Token': generateCsrfToken() },
    });
    expect(verifyCsrf(req)).toBe(false);
  });
});
