import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from '@/lib/session';

describe('session signing', () => {
  it('signs and verifies a payload', () => {
    const payload = { address: '0x123', role: 'admin' };
    const signed = signSession(payload);
    const verified = verifySession(signed);
    expect(verified).toEqual(payload);
  });

  it('rejects tampered cookie', () => {
    const signed = signSession({ address: '0x123', role: 'admin' });
    const tampered = signed.slice(0, -2) + 'xx';
    expect(verifySession(tampered)).toBeNull();
  });

  it('rejects empty string', () => {
    expect(verifySession('')).toBeNull();
  });

  it('accepts legacy plain JSON (migration fallback)', () => {
    const legacy = JSON.stringify({ address: '0x456', role: 'user' });
    const result = verifySession(legacy);
    expect(result).toEqual({ address: '0x456', role: 'user' });
  });

  it('rejects garbage string', () => {
    expect(verifySession('not-a-cookie-at-all')).toBeNull();
  });

  it('signed cookie contains a dot separator', () => {
    const signed = signSession({ test: true });
    expect(signed).toContain('.');
    expect(signed.split('.').length).toBe(2);
  });
});
