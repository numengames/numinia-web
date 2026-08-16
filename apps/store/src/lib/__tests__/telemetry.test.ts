/**
 * Telemetry primitives (MISSION-021): truncation never leaks a wallet,
 * messages never flood a log line, events serialize with their timestamp.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { capMessage, logEvent, truncateWallet } from '../telemetry';

afterEach(() => vi.restoreAllMocks());

describe('truncateWallet', () => {
  it('keeps head and tail only', () => {
    expect(truncateWallet('0x42e62e421bEdf2469826879Ec1a0574d7D3ccA26')).toBe('0x42e6…cA26');
  });
  it('never echoes malformed input back', () => {
    expect(truncateWallet('DROP TABLE citizens')).toBe('invalid');
    expect(truncateWallet('')).toBe('invalid');
  });
});

describe('capMessage', () => {
  it('passes short messages through', () => {
    expect(capMessage('ok')).toBe('ok');
  });
  it('caps long messages with an ellipsis', () => {
    const long = 'x'.repeat(600);
    const capped = capMessage(long);
    expect(capped.length).toBe(501);
    expect(capped.endsWith('…')).toBe(true);
  });
});

describe('logEvent', () => {
  it('emits one JSON line with a timestamp and the event fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logEvent({ level: 'info', kind: 'api', path: '/api/x' });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed['kind']).toBe('api');
    expect(typeof parsed['ts']).toBe('string');
    expect(Number.isNaN(Date.parse(parsed['ts'] as string))).toBe(false);
  });
});
