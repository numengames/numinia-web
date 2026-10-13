/**
 * The fixture desk (MIS-184): a small, documented fake of the till's Oracle
 * desk, for CI, the acceptance run and screenshots (DATA_SOURCE=fixture).
 *
 * It lives in memory, seeded with the till's own seed (version 1, the 2 GB
 * example size), and answers the three calls of the contract the way the
 * till does — the version in force (`versionFor`), a rise (`isRise`) and
 * its notice (the strictest of the version in force today and the one
 * replaced), the earliest start (tomorrow, or the notice's day for a
 * rise), the sizes still charged to worlds, the basis limits and the
 * wallet that publishes — in the till's own words. It is a fake: the till
 * holds the real rules (apps/till), and nothing here decides a real tariff.
 * Its versions last as long as the server process.
 */

import {
  BASIS_PROBLEM,
  BY_PROBLEM,
  NOTE_MAX,
  addDays,
  isDay,
  isRise,
  utcDay,
  versionFor,
  type DeskBasis,
  type DeskCheck,
  type DeskDraft,
  type DeskSchedule,
  type DeskVersion,
  type DeskView,
  type OracleDesk,
} from './prices';

/** What the fixture desk starts with. */
export interface FixtureSeed {
  readonly versions: readonly DeskVersion[];
  readonly sizesInUse: readonly string[];
}

const SIZE_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;
const WALLET = /^0x[0-9a-f]{40}$/;
const BASIS_MAX_BYTES = 16_384;

const WHOLE_RULES = [
  ['eventBoostCentsPerDay', 0],
  ['minTopupCents', 0],
  ['minBalanceDaysRunning', 0],
  ['keepDaysAtZero', 1],
  ['noticeDaysForRise', 0],
  ['lowBalanceDaysDefault', 0],
] as const;

function isWholeAtLeast(value: unknown, minimum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

function isPlainObject(value: unknown): boolean {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

/** The contract's basis limits: a note of at most 500 characters, plain assumptions, 16 KB in all. */
export function basisProblem(basis: DeskBasis | null): string | null {
  if (basis === null) return null;
  const extra = Object.keys(basis).some((key) => key !== 'note' && key !== 'assumptions');
  if (
    !isPlainObject(basis) ||
    extra ||
    typeof basis.note !== 'string' ||
    basis.note.length > NOTE_MAX ||
    (basis.assumptions !== undefined && !isPlainObject(basis.assumptions)) ||
    new TextEncoder().encode(JSON.stringify(basis)).length > BASIS_MAX_BYTES
  ) {
    return BASIS_PROBLEM;
  }
  return null;
}

/** What is wrong with a draft as a tariff, before any date rule: the till's words. */
function draftProblems(draft: DeskDraft, sizesInUse: readonly string[]): string[] {
  const problems: string[] = [];
  if (!isDay(draft.startsOn)) problems.push('startsOn must be a YYYY-MM-DD day');
  const names = Object.keys(draft.sizes);
  if (names.length === 0) problems.push('sizes must price at least one size');
  for (const [name, price] of Object.entries(draft.sizes)) {
    if (!SIZE_NAME.test(name)) problems.push(`${JSON.stringify(name)} is not a size name`);
    if (
      !isWholeAtLeast(price.runningCentsPerDay, 0) ||
      !isWholeAtLeast(price.stoppedCentsPerDay, 0)
    ) {
      problems.push(
        `size ${name}: needs runningCentsPerDay and stoppedCentsPerDay, whole cents ≥ 0`,
      );
    }
  }
  for (const [key, minimum] of WHOLE_RULES) {
    if (!isWholeAtLeast(draft.rules[key], minimum)) {
      problems.push(`${key} must be a whole number ≥ ${minimum}`);
    }
  }
  const quick = draft.rules.quickTopupsCents;
  if (
    quick.length === 0 ||
    !quick.every(
      (amount, i) =>
        isWholeAtLeast(amount, draft.rules.minTopupCents) &&
        (i === 0 || amount > (quick[i - 1] as number)),
    )
  ) {
    problems.push('quickTopupsCents must be ascending whole cents, none below minTopupCents');
  }
  const basis = basisProblem(draft.basis);
  if (basis !== null) problems.push(basis);
  for (const size of sizesInUse) {
    if (!names.includes(size)) {
      problems.push(`size ${size} is still charged to worlds: a version must keep pricing it`);
    }
  }
  return problems;
}

/** The desk's check of a draft on `today`, against the versions it holds. */
export function checkDraft(
  versions: readonly DeskVersion[],
  draft: DeskDraft,
  today: string,
  sizesInUse: readonly string[],
): DeskCheck {
  const nextId = versions.reduce((max, version) => Math.max(max, version.id), 0) + 1;
  const tomorrow = addDays(today, 1);
  const replaced = isDay(draft.startsOn) ? versionFor(versions, draft.startsOn) : undefined;
  let rise = false;
  let noticeDays = 0;
  if (replaced !== undefined && isRise(draft, replaced)) {
    rise = true;
    const inForce = versionFor(versions, today) ?? replaced;
    noticeDays = Math.max(inForce.rules.noticeDaysForRise, replaced.rules.noticeDaysForRise);
  }
  const atNotice = addDays(today, noticeDays);
  const problems = draftProblems(draft, sizesInUse);
  if (problems.length === 0) {
    if (draft.startsOn <= today) {
      problems.push(`a version scheduled on ${today} starts on ${tomorrow} at the earliest`);
    }
    if (rise && draft.startsOn < atNotice) {
      problems.push(
        `a rise needs ${noticeDays} days' notice: it starts on ${atNotice} at the earliest`,
      );
    }
  }
  return {
    today,
    nextId,
    replacedId: replaced?.id ?? null,
    isRise: rise,
    noticeDays,
    earliestStart: rise && atNotice > tomorrow ? atNotice : tomorrow,
    problems,
  };
}

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** A desk in memory, seeded as given, on the clock given (the real one by default). */
export function createFixtureDesk(
  seed: FixtureSeed,
  now: () => Date = () => new Date(),
): OracleDesk {
  const versions: DeskVersion[] = copy([...seed.versions]);
  const sizesInUse = [...seed.sizesInUse].sort();
  return {
    read: async (): Promise<DeskView> => {
      const today = utcDay(now());
      return {
        today,
        inForceId: versionFor(versions, today)?.id ?? null,
        versions: copy([...versions].sort((a, b) => a.id - b.id)),
        sizesInUse: [...sizesInUse],
      };
    },
    check: async (draft: DeskDraft): Promise<DeskCheck> =>
      checkDraft(versions, draft, utcDay(now()), sizesInUse),
    schedule: async (draft: DeskDraft, by: string): Promise<DeskSchedule> => {
      const at = now();
      const check = checkDraft(versions, draft, utcDay(at), sizesInUse);
      const problems = [...check.problems];
      if (!WALLET.test(by)) problems.push(BY_PROBLEM);
      if (problems.length > 0) return { ok: false, problems };
      const version: DeskVersion = {
        id: check.nextId,
        startsOn: draft.startsOn,
        createdAt: at.toISOString(),
        createdBy: by,
        sizes: copy(draft.sizes),
        rules: copy(draft.rules),
        basis: draft.basis === null ? null : copy(draft.basis),
      };
      versions.push(version);
      return { ok: true, version: copy(version) };
    },
  };
}
