import { describe, expect, it, vi } from 'vitest';
import { answerPaymentsHealth, boundPayments, readPaymentsHealth } from '../payments-health';

const AT = '2026-10-12T09:00:00.000Z';

describe('the till’s poll, watched from the Prices room', () => {
  it('finds payments() on a bound desk, called as a method', async () => {
    expect(boundPayments(null)).toBeNull();
    expect(boundPayments('numinia-till')).toBeNull();
    expect(boundPayments({ read: () => 1 })).toBeNull();
    const desk = { payments: vi.fn(async () => ({ readThrough: AT, lagging: true })) };
    await boundPayments(desk)?.();
    expect(desk.payments).toHaveBeenCalledOnce();
    expect(boundPayments(Object.assign(() => 0, { payments: () => 1 }))).not.toBeNull();
  });

  it('reads only answers shaped as the till’s', () => {
    expect(readPaymentsHealth({ readThrough: AT, lagging: true })).toEqual({
      readThrough: AT,
      lagging: true,
    });
    expect(readPaymentsHealth({ readThrough: null, lagging: false })).toEqual({
      readThrough: null,
      lagging: false,
    });
    expect(readPaymentsHealth({ readThrough: 'yesterday-ish', lagging: false })).toBeNull();
    expect(readPaymentsHealth({ readThrough: AT })).toBeNull();
    expect(readPaymentsHealth('x')).toBeNull();
    expect(readPaymentsHealth(null)).toBeNull();
  });

  it('answers the till, a quiet fixture, or why not — logged by rule only', async () => {
    const log = vi.fn();
    const ok = await answerPaymentsHealth(
      { payments: async () => ({ readThrough: AT, lagging: true }) },
      undefined,
      log,
    );
    expect(ok.headers.get('cache-control')).toBe('no-store');
    expect(await ok.json()).toEqual({ readThrough: AT, lagging: true });
    expect(await (await answerPaymentsHealth(undefined, 'fixture', log)).json()).toEqual({
      readThrough: null,
      lagging: false,
    });
    expect((await answerPaymentsHealth(undefined, 'live', log)).status).toBe(503);
    const threw = await answerPaymentsHealth(
      {
        payments: async () => {
          throw new TypeError('boom');
        },
      },
      undefined,
      log,
    );
    expect(threw.status).toBe(502);
    expect(log).toHaveBeenLastCalledWith(
      expect.objectContaining({ rule: 'threw', error: 'TypeError' }),
    );
    const plain = await answerPaymentsHealth(
      {
        payments: async () => {
          throw 'plain';
        },
      },
      undefined,
      log,
    );
    expect(plain.status).toBe(502);
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ error: 'string' }));
    const shapeless = await answerPaymentsHealth({ payments: async () => 7 }, undefined, log);
    expect(shapeless.status).toBe(502);
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ rule: 'answer-shape' }));
  });

  it('logs to telemetry by default', async () => {
    expect((await answerPaymentsHealth(undefined, 'fixture')).status).toBe(200);
  });
});
