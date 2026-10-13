# The till — `apps/till`

The first piece of `ADR-070` (numinia-archive, `decisions/`): a world is
paid for by the day from a prepaid balance in euros. The till is a Cloudflare
Worker of its own (`numinia-till`) with its own D1 database (`numinia-till`),
apart from numinia.com. This build closes `MIS-177` (the ledger) and `MIS-178`
(the nightly close).

## What it does

- **Keeps each account's balance as lines only ever added** — one per top-up,
  per world and UTC day, per adjustment, per refund or chargeback — in
  integer euro cents, net of VAT. The database refuses to change or delete a
  line; a correction is a new line that names the line it corrects.
- **Spends top-ups oldest first**, so every lot's remainder is known at any
  instant (`lotsAt`).
- **Keeps the tariff as dated versions**; every charged line keeps the version
  it was charged with.
- **Closes each UTC day every night** at 00:30 UTC: one line per world and
  day the meter measured, priced per minute at that day's version for the
  size the world reserves. A day nobody measured stays pending for up to 35
  days and is then reported, never estimated. An account at or below zero
  has its running worlds listed to stop for balance and its worlds kept for
  free with a deletion date; a later top-up ends that from the next day.
- Answers `GET /health` with `{"service":"till","ok":true}` when run locally; anything else is 404. Deployed, nothing reaches it: no route, no workers.dev and no preview address (see Deploy).

## What it is not yet

No people, roles, invitations or authenticated API (`MIS-179`); no Stripe
(`MIS-180`); no signatures (`MIS-181`): the close **lists** the worlds to stop
and the deletion dates, nothing acts on them yet (`MIS-186`); no mail
(`MIS-182`); no screens (`MIS-183`, `MIS-184`); no machine meter (`MIS-185`).
The seams are `Meter` (`src/meter.ts`), the pure `closeDays`
(`src/lib/close.ts`) and the repository (`src/db/repository.ts`). The worlds
registry (`worlds`) is read by the close but written by nobody in this build:
creating a world is `MIS-179`/`MIS-185`.

## Files

| Path                         | What                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| `src/lib/money.ts`           | cents, half-up rounding in integers, VAT split and add           |
| `src/lib/utc-day.ts`         | UTC dates and day starts: every day 1440 minutes, no time zone   |
| `src/lib/tariff.ts`          | versions, `versionFor`, `isRise`, `earliestStart`, the seed      |
| `src/lib/ledger.ts`          | line kinds, balance, lots oldest first, line ids                 |
| `src/lib/close.ts`           | the nightly close, a pure function                               |
| `src/meter.ts`               | `Meter`, `NoMeter`, `FakeMeter` and the fixture reader           |
| `src/db/repository.ts`       | D1: one read batch, one write batch                              |
| `src/worker.ts`              | `fetch` (health) and `scheduled` (the close)                     |
| `migrations/0001_ledger.sql` | tables, append-only triggers, the seed tariff                    |
| `fixtures/meter.json`        | the pretend meter's readings (`TILL_METER=fake`)                 |
| `test/sqlite-d1.ts`          | a D1-shaped shim over `node:sqlite` that runs the real migration |

## The rules

- **Money** is integer euro cents; no float is stored (STRICT tables). The
  ledger counts NET money. For screens: a VAT-inclusive 10.00 € at 21 % is
  8.26 € of balance and 1.74 € of VAT (`net = round_half_up(gross × 100 /
(100 + rate))`); 10.00 € net carries 2.10 € of VAT.
- **A day** is a UTC date, `YYYY-MM-DD`, from 00:00 UTC to the next 00:00
  UTC: always 1440 minutes. UTC is the till's reference time (`ADR-070`);
  screens compute local times from it, and the till stores none.
- **A world's day** costs `round_half_up((running × runningPerDay + stopped ×
stoppedPerDay) / 1440)`: 23 hours running at 60 c/day cost 58 c, 11 hours
  cost 28 c. While its account is kept at zero a stopped minute costs nothing.
- **Lines**: `topup` (> 0, a lot), `world_day` (≤ 0, one per world and day),
  `adjustment` (≠ 0, by whom and why; positive, a lot), `refund` and
  `chargeback` (< 0, from a named lot of the same account).
- **Append-only, enforced by the database**: UPDATE and DELETE abort with
  `append-only`; an insert that collides with a line (same id, same world and
  day, same Stripe id) is dropped, so `INSERT OR REPLACE` cannot overwrite one.
- **Balance** = the sum of an account's lines. **Lots**: walking lines by
  (`at`, `id`), a positive line opens a lot and first pays any overshoot; a
  consumption draws from the oldest lot with a remainder, the rest becomes
  overshoot; a refund or chargeback takes what is left of its lot, and what
  that lot had already paid is drawn again from the oldest lots that still
  hold money: only what none covers becomes overshoot.
- **Tariff versions**: the one in force on a day is the greatest `starts_on` ≤
  day, ties by the greatest id. A version starts the next day at the
  earliest; a rise only after the notice (30 days in the seed).
- **The close** runs for the UTC date of the cron's scheduled time and
  writes everything in one D1 batch; running it again writes nothing.

## Test

```bash
cd apps/till
npx tsc --noEmit
npx eslint src test
npx vitest run --coverage   # per file on src/lib/**: 100 % lines/functions/statements, 95 % branches
npm run build               # wrangler deploy --dry-run --outdir dist (offline)
```

The tests run the real migration on `node:sqlite` (Node ≥ 22.13). Where
`node:sqlite` supports runtime limits (Node 26), the shim also holds the
database to D1's documented limits — a LIKE/GLOB pattern of 50 bytes, 100
bound parameters — which is why the schema checks dates with `date(x) IS x`
and instants with `strftime(…) IS x` instead of GLOB.

On workerd, locally:

```bash
npx wrangler d1 migrations apply numinia-till --local
npx wrangler dev --var TILL_METER:fake
curl "http://localhost:8787/health"
curl "http://localhost:8787/cdn-cgi/local/scheduled?cron=30+0+*+*+*&time=1793061000000"
```

`time` is the firing's instant in ms: 1793061000000 is 2026-10-27T00:30:00.000Z,
the run that closes 26 October.

## Deploy

The database `numinia-till` exists: an Oracle created it in the Cloudflare panel on
2026-10-13, and its id is in `wrangler.jsonc`. The till deploys through Workers Builds as a
second Worker connected to this repository, with these settings:

| Setting                            | Value                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Worker name                        | `numinia-till`, the `name` in `wrangler.jsonc`                                                                                      |
| Root directory                     | the repository root (empty), so `npm ci` installs from the root lockfile, as for the site                                           |
| Build command                      | empty                                                                                                                               |
| Deploy command                     | `npm run deploy --workspace apps/till`                                                                                              |
| Builds for non-production branches | off: from the root, a preview's default command would read the site's `wrangler.jsonc`                                              |
| Build watch paths                  | include `apps/till/*`                                                                                                               |
| API token                          | the account's Workers Builds token with **Account → D1 → Edit** added: its default permissions leave D1 out, and migrations need it |

`npm run deploy` applies the pending migrations to the remote database through its binding
(`TILL_DB`), then deploys. Wrangler records each applied migration in the database's
`d1_migrations` table, so each runs once: a change to the schema is a new numbered file in
`migrations/`, never an edit to an applied one.

Deployed, the till is reachable from nowhere (`workers_dev` and `preview_urls` are off and it
has no route): its only entry point is the cron, and each run shows in Workers Logs
(`observability`).

The cron is UTC, the till's reference time: `30 0 * * *` fires at 00:30 UTC
every night (01:30 in Madrid in winter, 02:30 in summer), and each run closes
the UTC day that has just ended.
