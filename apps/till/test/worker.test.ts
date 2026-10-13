import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { daysFrom } from '../src/lib/utc-day';
import { FakeMeter, NoMeter } from '../src/meter';
import worker, { handleFetch, handleScheduled, meterFor, type Env } from '../src/worker';
import { migratedTill } from './sqlite-d1';

/** A JSONC file (wrangler's): comments and trailing commas removed, then JSON. */
function readJsonc(relative: string): Record<string, unknown> {
  const text = readFileSync(fileURLToPath(new URL(relative, import.meta.url).href), 'utf8');
  let json = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text.charAt(i);
    if (inString) {
      json += char;
      if (char === '\\') {
        json += text.charAt(i + 1);
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
      json += char;
    } else if (char === '/' && text.charAt(i + 1) === '/') {
      while (i < text.length && text.charAt(i) !== '\n') i += 1;
      json += '\n';
    } else if (char === '/' && text.charAt(i + 1) === '*') {
      i = text.indexOf('*/', i + 2) + 1;
    } else {
      json += char;
    }
  }
  const parsed: unknown = JSON.parse(json.replace(/,(\s*[}\]])/g, '$1'));
  if (typeof parsed !== 'object' || parsed === null)
    throw new Error(`${relative} is not an object`);
  return parsed as Record<string, unknown>;
}

/** The till's one cron: 00:30 UTC every night (Cloudflare crons are UTC). */
const NIGHTLY = '30 0 * * *';

/** The instant a daily cron `M H * * *` fires on a UTC date. */
function firing(cron: string, utcDay: string): Date {
  const [minute, hour] = cron.split(' ').map(Number);
  return new Date(
    `${utcDay}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`,
  );
}

function controller(scheduledTime: Date, cron = NIGHTLY): ScheduledController {
  return { scheduledTime: scheduledTime.getTime(), cron, noRetry: () => undefined };
}

function fleetEnv(meter: string | undefined): {
  env: Env;
  sqlite: ReturnType<typeof migratedTill>['sqlite'];
} {
  const { db, sqlite } = migratedTill();
  const created = '2026-10-13T08:00:00.000Z';
  sqlite.exec(`
    INSERT INTO accounts (id, kind, created_at) VALUES ('acc-lumen', 'team', '${created}'), ('acc-leo', 'personal', '${created}');
    INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, vat_cents)
      VALUES ('T-lumen', 'acc-lumen', 'topup', 1000, '2026-10-20T10:00:00.000Z', 210),
             ('T-leo', 'acc-leo', 'topup', 1000, '2026-10-20T11:00:00.000Z', 210);
    INSERT INTO worlds (id, account_id, first_seen_on)
      VALUES ('w-lumen-plaza', 'acc-lumen', '2026-10-24'), ('w-leo-friends', 'acc-leo', '2026-10-24');
  `);
  const env: Env = meter === undefined ? { TILL_DB: db } : { TILL_DB: db, TILL_METER: meter };
  return { env, sqlite };
}

function worldDays(sqlite: ReturnType<typeof migratedTill>['sqlite']): [string, string, number][] {
  return sqlite
    .prepare(
      "SELECT world_id, day, amount_cents FROM ledger_lines WHERE kind = 'world_day' ORDER BY day, world_id",
    )
    .all()
    .map((row) => [String(row['world_id']), String(row['day']), Number(row['amount_cents'])]);
}

/** The fixture's lines: what the pretend meter measured, each written once. */
const FIXTURE_LINES: [string, string, number][] = [
  ['w-leo-friends', '2026-10-24', -5],
  ['w-lumen-plaza', '2026-10-24', -60],
  ['w-leo-friends', '2026-10-25', -5],
  ['w-lumen-plaza', '2026-10-25', -60],
  ['w-lumen-plaza', '2026-10-26', -33],
];

describe('fetch', () => {
  it('answers GET /health with the service and nothing else', async () => {
    const response = handleFetch(new Request('https://numinia-till.example/health'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await response.text()).toBe('{"service":"till","ok":true}');
  });

  it('answers 404 to anything else: no data leaves the till in this build', async () => {
    for (const request of [
      new Request('https://numinia-till.example/'),
      new Request('https://numinia-till.example/health/'),
      new Request('https://numinia-till.example/balance?account=acc-lumen'),
      new Request('https://numinia-till.example/health', { method: 'POST' }),
      new Request('https://numinia-till.example/health', { method: 'HEAD' }),
    ]) {
      expect(worker.fetch(request).status).toBe(404);
    }
  });

  it('is the module’s default export, as the Workers runtime calls it', async () => {
    expect(Object.keys(worker).sort()).toEqual(['fetch', 'scheduled']);
    expect(await worker.fetch(new Request('https://numinia-till.example/health')).text()).toBe(
      '{"service":"till","ok":true}',
    );
  });
});

describe('the meter TILL_METER names', () => {
  it('is no meter by default or for "none", the pretend meter for "fake", and an error otherwise', () => {
    expect(meterFor(undefined)).toBeInstanceOf(NoMeter);
    expect(meterFor('none')).toBeInstanceOf(NoMeter);
    expect(meterFor('fake')).toBeInstanceOf(FakeMeter);
    expect(() => meterFor('machine')).toThrow('TILL_METER must be "none" or "fake", not "machine"');
  });
});

describe('scheduled: the nightly close', () => {
  it('closes the days before the UTC date of the event, with the pretend meter', async () => {
    const { env, sqlite } = fleetEnv('fake');
    // 00:30 UTC on 27 October: the run closes every day before the 27th.
    const run = await handleScheduled(controller(new Date('2026-10-27T00:30:00.000Z')), env);
    expect(run.today).toBe('2026-10-27');
    expect(worldDays(sqlite)).toEqual(FIXTURE_LINES);
    expect(run.output.pending).toEqual([{ worldId: 'w-leo-friends', day: '2026-10-26' }]);
  });

  it('writes nothing with no meter: every day stays pending', async () => {
    const { env, sqlite } = fleetEnv(undefined);
    await worker.scheduled(controller(new Date('2026-10-27T00:30:00.000Z')), env);
    expect(worldDays(sqlite)).toEqual([]);
    const run = await handleScheduled(controller(new Date('2026-10-27T00:30:00.000Z')), env);
    expect(run.output.pending).toHaveLength(6);
  });

  it('fails the run on a meter it does not know', async () => {
    const { env } = fleetEnv('machine');
    await expect(
      worker.scheduled(controller(new Date('2026-10-27T00:30:00.000Z')), env),
    ).rejects.toThrow(/TILL_METER/);
  });
});

describe('the schedule (MIS-178)', () => {
  const config = readJsonc('../wrangler.jsonc');
  const crons = (config['triggers'] as { crons: string[] }).crons;

  it('binds the till’s own database, names no route and no secret, and fires one cron: 00:30 UTC', () => {
    const root = readJsonc('../../../wrangler.jsonc');
    expect(config['name']).toBe('numinia-till');
    expect(config['main']).toBe('src/worker.ts');
    expect(config['compatibility_date']).toBe(root['compatibility_date']);
    expect(config['d1_databases']).toEqual([
      {
        binding: 'TILL_DB',
        database_name: 'numinia-till',
        database_id: '00000000-0000-0000-0000-000000000000',
        migrations_dir: 'migrations',
      },
    ]);
    expect(config['vars']).toEqual({ TILL_METER: 'none' });
    expect(config['routes']).toBeUndefined();
    expect(config['route']).toBeUndefined();
    expect(crons).toEqual([NIGHTLY]);
    expect(firing(NIGHTLY, '2026-10-25').toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('closes each UTC day once, 25 October 2026 included', async () => {
    const { env, sqlite } = fleetEnv('fake');
    const fire = async (at: Date): Promise<[string, string, number, number]> => {
      const run = await handleScheduled(controller(at), env);
      return [at.toISOString(), run.today, run.linesWritten, run.rowsChanged];
    };
    const nights: [string, string, number, number][] = [];
    for (const day of daysFrom('2026-10-25', '2026-10-28')) {
      nights.push(await fire(firing(NIGHTLY, day)));
    }
    expect(nights).toEqual([
      ['2026-10-25T00:30:00.000Z', '2026-10-25', 2, 2], // closes the 24th
      ['2026-10-26T00:30:00.000Z', '2026-10-26', 2, 2], // closes the 25th, a whole 1440-minute day
      ['2026-10-27T00:30:00.000Z', '2026-10-27', 1, 1], // the 26th; w-leo-friends stays pending
      ['2026-10-28T00:30:00.000Z', '2026-10-28', 0, 0], // nothing measured for the 27th
    ]);
    expect(worldDays(sqlite)).toEqual(FIXTURE_LINES);

    // A repeated firing writes nothing.
    expect(await fire(firing(NIGHTLY, '2026-10-26'))).toEqual([
      '2026-10-26T00:30:00.000Z',
      '2026-10-26',
      0,
      0,
    ]);
    // A manual trigger at another hour of a UTC date already closed writes nothing new.
    expect(await fire(new Date('2026-10-27T15:45:00.000Z'))).toEqual([
      '2026-10-27T15:45:00.000Z',
      '2026-10-27',
      0,
      0,
    ]);
    expect(worldDays(sqlite)).toEqual(FIXTURE_LINES);
  });

  it('closes 28 March 2027, the day Spain moves its clock forward, as a whole day', async () => {
    const { db, sqlite } = migratedTill();
    sqlite.exec(`
      INSERT INTO accounts (id, kind, created_at) VALUES ('acc-lumen', 'team', '2026-10-13T08:00:00.000Z');
      INSERT INTO worlds (id, account_id, first_seen_on) VALUES ('w-lumen-plaza', 'acc-lumen', '2027-03-28');
    `);
    const env: Env = { TILL_DB: db, TILL_METER: 'fake' };
    const night = await handleScheduled(controller(firing(NIGHTLY, '2027-03-29')), env);
    expect(night).toMatchObject({ today: '2027-03-29', linesWritten: 1 });
    const manual = await handleScheduled(controller(new Date('2027-03-29T12:00:00.000Z')), env);
    expect(manual).toMatchObject({ today: '2027-03-29', linesWritten: 0 });
    expect(worldDays(sqlite)).toEqual([['w-lumen-plaza', '2027-03-28', -60]]);
  });
});
