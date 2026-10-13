import { describe, expect, it } from 'vitest';
import {
  LINE_KINDS,
  balanceCents,
  compareLines,
  isLot,
  lineId,
  lineProblems,
  lotsAt,
  type AdjustmentLine,
  type LedgerLine,
  type RefundLine,
  type TopupLine,
  type WorldDayLine,
} from '../src/lib/ledger';
import { addDays, daysFrom } from '../src/lib/utc-day';

const ACCOUNT = 'acc-lumen';

function topup(id: string, amountCents: number, at: string): TopupLine {
  return {
    id,
    accountId: ACCOUNT,
    kind: 'topup',
    amountCents,
    at,
    vatCents: Math.round(amountCents * 0.21),
    stripePaymentId: `pi_${id}`,
    stripeInvoiceId: `in_${id}`,
  };
}

/** The instant the nightly close writes a day's line: 00:30 UTC on the next day. */
function closedAt(day: string): string {
  return `${addDays(day, 1)}T00:30:00.000Z`;
}

function worldDay(day: string, amountCents = -60): WorldDayLine {
  return {
    id: `wd-${day}`,
    accountId: ACCOUNT,
    kind: 'world_day',
    amountCents,
    at: closedAt(day),
    worldId: 'w-lumen-plaza',
    machine: 'vps-2-a',
    day,
    minutesRunning: 1440,
    minutesStopped: 0,
    size: '2g',
    tariffVersionId: 1,
  };
}

function week(first: string): WorldDayLine[] {
  return daysFrom(first, addDays(first, 6)).map((day) => worldDay(day));
}

function adjustment(id: string, amountCents: number, at: string): AdjustmentLine {
  return {
    id,
    accountId: ACCOUNT,
    kind: 'adjustment',
    amountCents,
    at,
    by: 'oracle:pablo',
    reason: 'a charging error, corrected by hand',
    correctsLineId: null,
  };
}

function refund(
  id: string,
  lotLineId: string,
  amountCents: number,
  at: string,
  kind: RefundLine['kind'] = 'refund',
): RefundLine {
  return { id, accountId: ACCOUNT, kind, amountCents, at, lotLineId, stripeEventId: `evt_${id}` };
}

function remainders(
  lines: readonly LedgerLine[],
  instant: string,
): { lots: Record<string, number>; overshoot: number } {
  const state = lotsAt(lines, instant);
  return {
    lots: Object.fromEntries(state.lots.map((lot) => [lot.lineId, lot.remainderCents])),
    overshoot: state.overshootCents,
  };
}

function balanceAt(lines: readonly LedgerLine[], instant: string): number {
  return balanceCents(lines.filter((line) => Date.parse(line.at) <= Date.parse(instant)));
}

describe('lots, oldest first (MIS-177)', () => {
  // Three top-ups of 10, 20 and 50 €, a week of 0.60 € world-days between
  // each, a refund of the middle lot, another week, and a fourth top-up.
  const lines: LedgerLine[] = [
    topup('A', 1000, '2026-10-14T09:00:00.000Z'),
    ...week('2026-10-14'),
    topup('B', 2000, '2026-10-21T10:00:00.000Z'),
    ...week('2026-10-21'),
    topup('C', 5000, '2026-10-28T10:00:00.000Z'),
    ...week('2026-10-28'),
    refund('R', 'B', -2000, '2026-11-04T12:00:00.000Z'),
    ...week('2026-11-04'),
    topup('D', 1000, '2026-11-12T10:00:00.000Z'),
  ];

  it('spends the oldest lot first and knows every remainder to the cent at any instant', () => {
    expect(remainders(lines, '2026-10-21T09:59:59.999Z')).toEqual({
      lots: { A: 580 },
      overshoot: 0,
    });
    expect(remainders(lines, '2026-10-28T09:00:00.000Z')).toEqual({
      lots: { A: 160, B: 2000 },
      overshoot: 0,
    });
    // The third week takes A's last 1.60 € and 2.60 € of B.
    expect(remainders(lines, '2026-11-04T11:59:59.999Z')).toEqual({
      lots: { A: 0, B: 1740, C: 5000 },
      overshoot: 0,
    });
    // Refunding the whole of B takes its 17.40 € left; the 2.60 € already
    // spent from it were paid by money now returned, so they are spent again
    // from C, the oldest lot that still holds money: no debt while C has some.
    expect(remainders(lines, '2026-11-04T12:00:00.000Z')).toEqual({
      lots: { A: 0, B: 0, C: 4740 },
      overshoot: 0,
    });
    expect(remainders(lines, '2026-11-11T12:00:00.000Z')).toEqual({
      lots: { A: 0, B: 0, C: 4320 },
      overshoot: 0,
    });
    expect(remainders(lines, '2026-11-12T10:00:00.000Z')).toEqual({
      lots: { A: 0, B: 0, C: 4320, D: 1000 },
      overshoot: 0,
    });
  });

  it('keeps balance = remainders − overshoot at every line', () => {
    for (const line of lines) {
      const state = lotsAt(lines, line.at);
      const left = state.lots.reduce((sum, lot) => sum + lot.remainderCents, 0);
      expect(left - state.overshootCents).toBe(balanceAt(lines, line.at));
    }
    expect(balanceCents(lines)).toBe(1000 + 2000 + 5000 + 1000 - 4 * 420 - 2000);
  });

  it('lists lots oldest first with what they were and what is left', () => {
    const { lots } = lotsAt(lines, '2026-11-30T00:00:00.000Z');
    expect(lots.map((lot) => [lot.lineId, lot.at, lot.amountCents, lot.remainderCents])).toEqual([
      ['A', '2026-10-14T09:00:00.000Z', 1000, 0],
      ['B', '2026-10-21T10:00:00.000Z', 2000, 0],
      ['C', '2026-10-28T10:00:00.000Z', 5000, 4320],
      ['D', '2026-11-12T10:00:00.000Z', 1000, 1000],
    ]);
  });

  it('reads the lines in ledger order whatever order they come in', () => {
    const shuffled = [...lines].reverse();
    expect(lotsAt(shuffled, '2026-11-30T00:00:00.000Z')).toEqual(
      lotsAt(lines, '2026-11-30T00:00:00.000Z'),
    );
  });
});

describe('overshoot, adjustments and chargebacks', () => {
  it('turns what no lot covers into a debt, paid first by the next lot', () => {
    const lines = [
      topup('A', 1000, '2026-10-14T09:00:00.000Z'),
      worldDay('2026-10-14', -1030),
      topup('B', 2000, '2026-10-16T09:00:00.000Z'),
    ];
    expect(remainders(lines, '2026-10-15T12:00:00.000Z')).toEqual({
      lots: { A: 0 },
      overshoot: 30,
    });
    expect(remainders(lines, '2026-10-16T09:00:00.000Z')).toEqual({
      lots: { A: 0, B: 1970 },
      overshoot: 0,
    });
  });

  it('lets a lot smaller than the debt pay part of it', () => {
    const lines = [worldDay('2026-10-14', -500), adjustment('G', 200, '2026-10-16T09:00:00.000Z')];
    expect(remainders(lines, '2026-10-16T09:00:00.000Z')).toEqual({
      lots: { G: 0 },
      overshoot: 300,
    });
  });

  it('draws a negative adjustment from the oldest lot; a positive one is a lot', () => {
    const lines = [
      topup('A', 1000, '2026-10-14T09:00:00.000Z'),
      adjustment('G', 500, '2026-10-15T09:00:00.000Z'),
      adjustment('N', -1200, '2026-10-16T09:00:00.000Z'),
    ];
    expect(remainders(lines, '2026-10-17T00:00:00.000Z')).toEqual({
      lots: { A: 0, G: 300 },
      overshoot: 0,
    });
  });

  it('takes a chargeback from its lot, and what was spent from it becomes debt when no lot is left', () => {
    const lines = [
      topup('A', 1000, '2026-10-14T09:00:00.000Z'),
      topup('B', 1000, '2026-10-14T10:00:00.000Z'),
      worldDay('2026-10-14', -1100),
      refund('X', 'B', -1000, '2026-10-16T09:00:00.000Z', 'chargeback'),
    ];
    expect(remainders(lines, '2026-10-17T00:00:00.000Z')).toEqual({
      lots: { A: 0, B: 0 },
      overshoot: 100,
    });
  });

  it('spends what a refunded lot had paid again from the oldest lot that still holds money', () => {
    const lines = [
      topup('A', 1000, '2026-10-14T09:00:00.000Z'),
      topup('B', 1000, '2026-10-14T10:00:00.000Z'),
      topup('C', 1000, '2026-10-14T11:00:00.000Z'),
      worldDay('2026-10-14', -1100),
      refund('X', 'B', -1000, '2026-10-16T09:00:00.000Z', 'chargeback'),
    ];
    expect(remainders(lines, '2026-10-17T00:00:00.000Z')).toEqual({
      lots: { A: 0, B: 0, C: 900 },
      overshoot: 0,
    });
    expect(balanceCents(lines)).toBe(900);
  });

  it('takes a partial refund from the lot it names, leaving the rest', () => {
    const lines = [
      topup('A', 1000, '2026-10-14T09:00:00.000Z'),
      topup('B', 2000, '2026-10-14T10:00:00.000Z'),
      refund('R', 'B', -500, '2026-10-15T09:00:00.000Z'),
    ];
    expect(remainders(lines, '2026-10-16T00:00:00.000Z')).toEqual({
      lots: { A: 1000, B: 1500 },
      overshoot: 0,
    });
  });

  it('moves nothing for a world-day that cost nothing', () => {
    const lines = [topup('A', 1000, '2026-10-14T09:00:00.000Z'), worldDay('2026-10-14', 0)];
    expect(remainders(lines, '2026-10-16T00:00:00.000Z')).toEqual({
      lots: { A: 1000 },
      overshoot: 0,
    });
    expect(remainders([], '2026-10-16T00:00:00.000Z')).toEqual({ lots: {}, overshoot: 0 });
  });

  it('refuses lines it cannot walk', () => {
    const a = topup('A', 1000, '2026-10-14T09:00:00.000Z');
    expect(() => lotsAt([a], '2026-10-16')).toThrow(/not an ISO instant/);
    expect(() =>
      lotsAt([a, { ...a, id: 'B', accountId: 'acc-other' }], '2026-10-16T00:00:00.000Z'),
    ).toThrow(/more than one account/);
    expect(() => lotsAt([{ ...a, amountCents: -1 }], '2026-10-16T00:00:00.000Z')).toThrow(
      /a top-up is positive/,
    );
    const early = refund('R', 'A', -100, '2026-10-13T09:00:00.000Z');
    expect(() => lotsAt([a, early], '2026-10-16T00:00:00.000Z')).toThrow(
      /names A, not an earlier lot/,
    );
    const onADay = refund('R', 'wd-2026-10-14', -100, '2026-10-16T09:00:00.000Z');
    expect(() => lotsAt([a, worldDay('2026-10-14'), onADay], '2026-10-17T00:00:00.000Z')).toThrow(
      /not an earlier lot/,
    );
  });
});

describe('a line', () => {
  const a = topup('A', 1000, '2026-10-14T09:00:00.000Z');
  const day = worldDay('2026-10-14');
  const fix = adjustment('G', -60, '2026-10-16T09:00:00.000Z');
  const back = refund('R', 'A', -100, '2026-10-16T09:00:00.000Z');

  it('has five kinds', () => {
    expect(LINE_KINDS).toEqual(['topup', 'world_day', 'adjustment', 'refund', 'chargeback']);
  });

  it('is well formed by kind', () => {
    for (const line of [
      a,
      { ...a, stripePaymentId: null, stripeInvoiceId: null },
      day,
      fix,
      back,
    ]) {
      expect(lineProblems(line)).toEqual([]);
    }
    expect(lineProblems({ ...back, kind: 'chargeback', stripeEventId: null })).toEqual([]);
    expect(lineProblems({ ...fix, correctsLineId: 'wd-2026-10-14' })).toEqual([]);
    expect(lineProblems({ ...day, amountCents: 0 })).toEqual([]);
  });

  it('names what is wrong with it', () => {
    expect(
      lineProblems({ ...a, id: '', accountId: ' ', amountCents: 10.5, at: '2026-10-14' }),
    ).toEqual([
      'id is required',
      'accountId is required',
      'amountCents must be whole cents',
      'at must be an ISO instant',
    ]);
    expect(
      lineProblems({
        ...a,
        amountCents: 0,
        vatCents: -1,
        stripePaymentId: '',
        stripeInvoiceId: ' ',
      }),
    ).toEqual([
      'a top-up is positive',
      'vatCents must be whole cents ≥ 0',
      'stripePaymentId is null or an id',
      'stripeInvoiceId is null or an id',
    ]);
    expect(lineProblems({ ...a, vatCents: 1.5 })).toEqual(['vatCents must be whole cents ≥ 0']);
    expect(
      lineProblems({
        ...day,
        amountCents: 1,
        machine: '',
        day: '2026-02-30',
        minutesRunning: -1,
        tariffVersionId: 0,
      }),
    ).toEqual([
      'a world-day is zero or negative',
      'worldId, machine and size are required',
      'day must be a YYYY-MM-DD day',
      'minutes must be whole and ≥ 0',
      'tariffVersionId is required',
    ]);
    expect(lineProblems({ ...day, worldId: '' })).toEqual([
      'worldId, machine and size are required',
    ]);
    expect(lineProblems({ ...day, size: '' })).toEqual(['worldId, machine and size are required']);
    expect(lineProblems({ ...day, minutesRunning: 1.5 })).toEqual([
      'minutes must be whole and ≥ 0',
    ]);
    expect(lineProblems({ ...day, minutesStopped: 0.5 })).toEqual([
      'minutes must be whole and ≥ 0',
    ]);
    expect(lineProblems({ ...day, minutesStopped: -1 })).toEqual(['minutes must be whole and ≥ 0']);
    expect(lineProblems({ ...day, tariffVersionId: 1.5 })).toEqual(['tariffVersionId is required']);
    expect(lineProblems({ ...fix, amountCents: 0, by: '', reason: 'x' })).toEqual([
      'an adjustment is not zero',
      'by and reason are required',
    ]);
    expect(lineProblems({ ...fix, reason: ' ' })).toEqual(['by and reason are required']);
    expect(lineProblems({ ...back, amountCents: 100, lotLineId: '', stripeEventId: '' })).toEqual([
      'a refund is negative',
      'lotLineId is required',
      'stripeEventId is null or an id',
    ]);
    expect(lineProblems({ ...back, kind: 'chargeback', amountCents: 0 })).toEqual([
      'a chargeback is negative',
    ]);
  });

  it('adds up to a balance', () => {
    expect(balanceCents([a, day, fix, back])).toBe(1000 - 60 - 60 - 100);
    expect(balanceCents([])).toBe(0);
  });

  it('is a lot when it is a top-up or a positive adjustment', () => {
    expect(isLot(a)).toBe(true);
    expect(isLot(adjustment('G', 300, a.at))).toBe(true);
    expect(isLot(fix)).toBe(false);
    expect(isLot(day)).toBe(false);
    expect(isLot(back)).toBe(false);
  });

  it('sorts by instant, then by id', () => {
    const early = { ...a, id: 'Z', at: '2026-10-14T08:00:00.000Z' };
    const same1 = { ...a, id: 'A' };
    const same2 = { ...a, id: 'B' };
    expect([same2, same1, early].sort(compareLines).map((line) => line.id)).toEqual([
      'Z',
      'A',
      'B',
    ]);
    expect(compareLines(same1, { ...same1 })).toBe(0);
  });
});

describe('line ids', () => {
  const CROCKFORD_26 = /^[0-9A-HJKMNP-TV-Z]{26}$/;

  it('are 26 Crockford base-32 characters, ULID-shaped', () => {
    const id = lineId(
      Date.parse('2026-10-15T00:30:00.000Z'),
      'world_day|w-lumen-plaza|2026-10-14',
      20_740,
    );
    expect(id).toMatch(CROCKFORD_26);
    expect(lineId(0, 'k')).toMatch(/^0{14}/);
    expect(lineId(2 ** 48 - 1, 'k', 32 ** 4 - 1)).toMatch(/^7Z{9}Z{4}/);
  });

  it('sort by instant, then by order, and repeat for the same fact', () => {
    const t = Date.parse('2026-10-15T00:30:00.000Z');
    expect(lineId(t, 'a') < lineId(t + 1, 'a')).toBe(true);
    expect(lineId(t, 'z', 1) < lineId(t, 'a', 2)).toBe(true);
    expect(lineId(t, 'same', 3)).toBe(lineId(t, 'same', 3));
    expect(lineId(t, 'one')).not.toBe(lineId(t, 'two'));
  });

  it('refuse an instant or an order out of range', () => {
    expect(() => lineId(-1, 'k')).toThrow(RangeError);
    expect(() => lineId(1.5, 'k')).toThrow(RangeError);
    expect(() => lineId(2 ** 48, 'k')).toThrow(RangeError);
    expect(() => lineId(0, 'k', -1)).toThrow(RangeError);
    expect(() => lineId(0, 'k', 0.5)).toThrow(RangeError);
    expect(() => lineId(0, 'k', 32 ** 4)).toThrow(RangeError);
  });
});
