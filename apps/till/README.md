# The till — `apps/till`

The first piece of `ADR-070` (numinia-archive, `decisions/`): a world is
paid for by the day from a prepaid balance in euros. The till is a Cloudflare
Worker of its own (`numinia-till`) with its own D1 database (`numinia-till`),
apart from numinia.com. Its first build closed `MIS-177` (the ledger) and
`MIS-178` (the nightly close); this one gives it its first door, the Oracle
desk (`MIS-184`).

## What it does

- **Keeps each account's balance as lines only ever added** — one per top-up,
  per world and UTC day, per adjustment, per refund or chargeback — in
  integer euro cents, tax included as paid. The database refuses to change or delete a
  line; a correction is a new line that names the line it corrects.
- **Spends top-ups oldest first**, so every lot's remainder is known at any
  instant (`lotsAt`).
- **Keeps the tariff as dated versions**; every charged line keeps the version
  it was charged with, and every version keeps who published it and why.
- **Closes each UTC day every night** at 00:30 UTC: one line per world and
  day the meter measured, priced per minute at that day's version for the
  size the world reserves. A day nobody measured stays pending for up to 35
  days and is then reported, never estimated. An account at or below zero
  has its running worlds listed to stop for balance and its worlds kept for
  free with a deletion date; a later top-up ends that from the next day.
- **Opens the Oracle desk** to numinia.com's Prices room: read the tariff,
  check a draft of the next version, schedule it (see below).
- Answers `GET /health` with `{"service":"till","ok":true}` when run locally; anything else is 404. Deployed, nothing reaches it over HTTP: no route, no workers.dev and no preview address (see Deploy). Its one door is the Oracle desk, which no HTTP request reaches.

## The Oracle desk

`OracleDesk` (`src/worker.ts`) is a named RPC entrypoint — a class that
extends `WorkerEntrypoint` — through which the Oracles' Prices room on
numinia.com reads the tariff, checks a draft of the next version and
schedules it, with who published it and why.

**Who can reach it.** Only a Worker that declares a service binding to it.
numinia.com's Worker declares one in the root `wrangler.jsonc`:

```jsonc
"services": [{ "binding": "TILL_ORACLE", "service": "numinia-till", "entrypoint": "OracleDesk" }]
```

An RPC entrypoint answers no HTTP request at all, and this one has no
`fetch`: even when the till gets a route (a Stripe webhook), the desk stays
unreachable from the internet. The till declares nothing for it; a named
entrypoint needs no configuration on the side that serves it.

**Trust.** numinia.com's API route checks the Oracle's session — its own
signed cookie, permission `edit-system-config`, which only the Oracle rank
holds — and passes the session's wallet as `by`. The till trusts its one
bound caller to have done so, and re-validates every field it is sent. The
till never trusts a browser.

**The three methods**, each on the till's own clock (UTC):

| Method                | Answers                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments()`          | `{ readThrough, lagging }`: where the minute's poll has read Stripe up to, and whether that is more than two days behind                                                                                                        |
| `read()`              | `DeskView`: the till's date, the version in force, every version (prices, rules, from when, by whom, why) and the sizes charged to worlds in the last 35 days                                                                   |
| `check(draft)`        | `DeskCheck`: the next id, the version the draft would replace from its start, whether it is a rise against it, the notice and the first day it may start, and exactly the problems `schedule` would refuse with. Writes nothing |
| `schedule(draft, by)` | `{ ok: true, version }`, the version written (the next id, created now by `by`), or `{ ok: false, problems }` with nothing written                                                                                              |

A draft is `{ startsOn, sizes, rules, basis }`: the UTC date it starts, the
prices per size and the rules as a version holds them, and why — `null`, or
`{ note, assumptions? }`: a note of at most 500 characters and, optionally,
the calculator's assumptions as plain JSON, 16 KB in all. The till stores the
basis as given (`migrations/0002_tariff_basis.sql`) and charges nothing from
it.

The desk refuses, in English sentences, what `scheduleProblems` refuses (a
start before tomorrow; a rise before its notice, the strictest of the
version in force today and the one replaced; a malformed price or rule),
plus a size still charged to worlds that the draft stops pricing, a basis
out of bounds, anything not shaped as a draft (missing or unknown keys,
wrong types), an author that is not a lowercase 0x wallet, and a version
published by someone else between its read and its write (`another version
was published meanwhile: read the desk again`). A refusal is an answer,
never a throw; only a failing database throws, so the caller can tell a
failure from a refusal.

## The account desk

`AccountDesk` (`src/worker.ts`, cut «Saldo»: `MIS-179` in its first form,
`MIS-180`) is the till's second named RPC entrypoint. numinia.com binds it as
`TILL_ACCOUNTS`; like the Oracle desk it has no `fetch` and no address.

**Trust.** numinia.com's API route checks the session (its signed cookie, any
rank) and passes the session's wallet, lowercase, as the first argument of
every method. The till trusts its bound caller for WHO is asking — and, with
the optional last argument `house`, for its word that the session is the
house's staff — and decides itself, from its own tables, WHAT that wallet may
do: its own account, and in each organization (an account of kind `team`)
what that organization's own roles allow (see «Roles in an organization»).
Every other argument is re-validated; a refusal is an answer, never a throw.

| Method                                                                     | Answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overview(wallet)`                                                         | the wallet's own account (created the first time, id derived from the wallet without holding it) and its organizations, with role and balance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `directory(wallet, house)`                                                 | the house only (`house === true`; a missing flag refuses): every organization the house may enter, by name, as `{ id, kind: 'team', name }` and nothing else — no money, no roles, no people, no log line. A list of doors: entering one is `access`, `statement`, … which log the house's reads                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `createTeam(wallet, name)` / `renameTeam(wallet, accountId, name, house?)` | a new organization with the wallet as its owner and the Team template's roles (at most 20 per founder) / a new name, for whoever holds `manage-organization`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `access(wallet, accountId, house?)`                                        | what the wallet may do there: on whose behalf it acts (`owner`, `house`, `member`), every act it may do, the roles it holds, and for every act the roles that hold it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `statement(wallet, accountId, range, house?)`                              | balance, low-balance flag (< 10 €), lots, spend per UTC day or month over `7d`/`30d`/`12m` split into `runningCents`/`stoppedCents` (each world's day at its version's prices, the rounding's remainder with running), each world over the range (`worldId`, `size`, `daysRunning`, `cents`), the pace whatever the range (`sevenDaysCents` of the 7 complete UTC days before today, `monthCents` and `monthWorlds` of the month so far), the tariff in force today for the sizes in use (`startsOn`, `sizes`, `keepDaysAtZero`, `noticeDaysForRise`; absent before the first version), the last 100 lines (a world's day with its minutes running and stopped), members of an organization; in an organization, for whoever holds `view-balance` |
| `members` / `setMember` / `removeMember`                                   | any member may list them; adding needs `invite-members`, «admin» and «member» need `manage-roles`, removing needs `remove-members`; only below one's own highest role, never oneself or an owner, never the last owner                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `roles(wallet, accountId, house?)`                                         | the organization's roles top down with their permissions, how many members hold each and whether the asker may edit it; its members (owners first) with the roles they hold and the ones the asker may give or take from each. To any member                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `createRole` / `editRole` / `moveRole` / `deleteRole`                      | `manage-roles`, and only below one's own highest role: a new role goes just below the asker's highest, carrying only permissions the asker holds; an edit changes name, colour, shown-apart and permissions (every one that changes must be the asker's); a move makes room for the roles it passes; a delete takes the role from its holders. The base role keeps its name and place                                                                                                                                                                                                                                                                                                                                                             |
| `giveRole` / `takeRole`                                                    | a role to a member or back, below one's own highest role, never to oneself or an owner, never the base role; giving what is held, or taking what is not, writes nothing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `headcount(accountId)`                                                     | how many people the organization has, asked with no wallet (what a stranger to it is shown): a number and nothing else; an id that is no organization is refused                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `log(wallet, accountId, house?)`                                           | the last hundred lines of the organization's log, newest first, for whoever holds `view-organization-log`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `startTopup(wallet, accountId, amountKey, returnBase, house?)`             | opens a Stripe Checkout Session (`mode=payment`, `managed_payments[enabled]=true`) for 10, 50 or 100 € and keeps who opened it for which account (`checkouts`); in an organization, for whoever holds `top-up` (every member by default)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `confirmTopup(wallet, sessionId)`                                          | when the buyer comes back: reads the session from Stripe and, paid, writes one `topup` line (net = total − the tax Stripe collected, the tax in `vat_cents`, the payment intent as `stripe_payment_id`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Stripe.** Stripe Managed Payments is the seller (merchant of record); the
till only keeps the balance. The till reaches OUT to api.stripe.com
(`src/lib/stripe.ts`, pinned `Stripe-Version`); nothing of Stripe's reaches
in — no webhook route. A paid session is credited when the buyer returns,
and by the minute cron (`* * * * *`), which lists Stripe's events since its
cursor less five minutes and applies them oldest first:

| Event                                                                           | What the till writes                                                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `checkout.session.completed` (paid), `checkout.session.async_payment_succeeded` | the top-up, once (keep-first on `stripe_payment_id`)                                             |
| `checkout.session.async_payment_failed`                                         | the checkout ends `expired`; nothing credited                                                    |
| `charge.refunded`                                                               | a `refund` line of what the charge's cumulative refunded total adds (partial refunds one by one) |
| `charge.dispute.created`                                                        | a `chargeback` line of the disputed amount                                                       |
| `charge.dispute.closed`, won                                                    | an `adjustment` by `stripe` giving that chargeback back, naming it                               |

Only events about the till's own checkouts and top-ups are applied; other
products of the same Stripe account are skipped. Every line is keyed by its
event, so an event read twice writes once. A refund of a balance already
spent takes the account below zero (Pablo, 2026-10-14): the at-zero rules
apply and the next top-up pays the debt first.

**The poll's lag.** Stripe keeps events 30 days. A run that finds the cursor
more than two days behind fails loudly in Workers Logs, and the Oracle desk's
`payments()` answers `{ readThrough, lagging }`, which numinia.com's Prices
room shows to the Oracle.

**Configuration.** Secret `STRIPE_KEY`: a restricted key with Checkout
Sessions write and Events read (TEST mode in this cut). Var
`TILL_TOPUP_PRICES`: `{"10":"price_…","50":"price_…","100":"price_…"}`. Without
both, the desk answers `payments are not configured` and the minute's run
does nothing.

## Roles in an organization

Each organization runs its own roles, as a Discord server does
(numinia-archive `ADR-071`; the rules are `STD-051`, what a role can carry is
the register `STD-052`). `migrations/0004_organization_roles.sql` keeps them:

- **`team_roles`**: the organization's ordered list. The base role sits at
  position 0 and every member holds it without a row; the higher a role, the
  more it may manage. Each carries some of the sixteen permissions of
  `STD-052`, as a JSON array.
- **`team_member_roles`**: who holds which role besides the base one.
- **`team_members.owner`**: owners are a mark on the member, not a role. They
  hold everything, the owners' acts included, and an organization keeps one
  at least (the desk refuses; triggers back it up).
- **`team_profiles.house_access`**: how the house's staff may enter. Every
  organization is at `alpha` during the alpha: the house enters with an
  administrator's reach, below the owners, and no organization changes it.
- **`team_log`**: who, on whose behalf (their own or the house's), what and
  when. It keeps every change to members and roles, every top-up started and
  every act of the house's staff, reads included. Lines are only ever added.

What anyone may do is worked out by `@numinia/domain`
(`resolvers/organization-access`) from these tables, read again at every
request (`src/db/organizations.ts`). The desk never keeps a role in the
session or trusts one from the browser. Roles add up. Nobody acts on a role
or a member at or above their own highest role, or on their own roles.
Every write is guarded by the organization's `revision` and raises it last,
in one batch: when someone else changed the organization in between, nothing
is written and the desk answers «the organization changed meanwhile».

Managing roles is the desk's own (`src/db/roles.ts`): `roles` reads them with
who holds each and which the asker may edit; `createRole`, `editRole`,
`moveRole` and `deleteRole` change the list; `giveRole` and `takeRole`
change who holds what; `log` reads the log. Each change writes its line in
the log (`migrations/0005_role_log_acts.sql` adds `role-created`,
`role-edited`, `role-moved` and `role-deleted`). Roles keep their places by
`UNIQUE (account_id, position)`, so a move lifts the roles it changes out of
the way and sets them down again in one batch. Giving `administrator` or
`manage-roles` asks, in STD-051 ORG-008, for a fresh wallet signature: that
belongs to numinia.com, which asks for it before it calls the desk.

A refusal for want of a permission names it and the roles that hold it
(`MIS-179`): «this needs create-worlds, which the owners hold, and the role
Administration». Topping up is the permission `top-up`, which every template gives to the base role. A new organization is born with the Team
template, named in the site's default language: Administration
(`administrator`), Finance (`manage-balance`), Member (`enter-worlds`,
`start-stop-worlds`, `build-in-worlds`) and the base role @everyone
(`view-balance`, `top-up`). Its founder is its owner, holding no role.

The Saldo screen still speaks of `admin` and `member`. `admin` is an owner or
whoever holds `administrator`. «make admin» gives the highest role carrying
`administrator` below the one who asks, so only an owner or the house makes
an administrator. «member» takes every such role away. 0004 gave every
organization founded before it the Team template: its founder became its
owner (or every admin did, where the founder had left), its admins hold
Administration and its members hold Member. `team_members.role` is no longer
read; it is still written, for the Worker that runs between the migration
and the deploy, and a later migration drops it. An organization that Worker
founds in between gets its owner, the Team template and its log line from a
trigger (`team_members_founded_as_before`), which goes with that column.

## What it is not yet

The desks serve the Prices room and the Saldo screen. Still missing: the
panel that edits roles themselves (create, name, colour, order), bans with
their reasons, a new signature for what is dangerous, invitations by email,
and people with an id of their own apart from their wallet (the rest of
`MIS-179` and `STD-051`); refunds and
chargebacks from Stripe's events, and the open books' nightly file (after
`MIS-180`); no signatures (`MIS-181`): the close **lists** the worlds
to stop and the deletion dates, nothing acts on them yet (`MIS-186`); no
mail (`MIS-182`): a rise is scheduled with its notice, but nobody is told by
mail yet; no account screens (`MIS-183`); no machine meter (`MIS-185`).
The seams are `Meter` (`src/meter.ts`), the pure `closeDays`
(`src/lib/close.ts`) and the repository (`src/db/repository.ts`). The worlds
registry (`worlds`) is read by the close but written by nobody in this build:
creating a world is `MIS-179`/`MIS-185`.

## Files

| Path                                         | What                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/money.ts`                           | cents, half-up rounding in integers, VAT split and add                                                                                     |
| `src/lib/utc-day.ts`                         | UTC dates and day starts: every day 1440 minutes, no time zone                                                                             |
| `src/lib/tariff.ts`                          | versions, `versionFor`, `isRise`, `earliestStart`, the seed; the desk's drafts: `readDraft`, `draftCheck`, `basisProblems`, `missingSizes` |
| `src/lib/ledger.ts`                          | line kinds, balance, lots oldest first, line ids                                                                                           |
| `src/lib/close.ts`                           | the nightly close, a pure function                                                                                                         |
| `src/meter.ts`                               | `Meter`, `NoMeter`, `FakeMeter` and the fixture reader                                                                                     |
| `src/db/repository.ts`                       | D1 for the close: one read batch, one write batch; the whole-version reader the desk uses                                                  |
| `src/db/desk.ts`                             | D1 for the desk: one read batch per call, one guarded insert to schedule                                                                   |
| `src/worker.ts`                              | `fetch` (health), `scheduled` (the close, the minute's poll), `OracleDesk` and `AccountDesk`                                               |
| `src/lib/accounts.ts`                        | what numinia.com sends the account desk, read; the top-up prices; spend buckets                                                            |
| `src/lib/stripe.ts`                          | the few Stripe calls the till makes, over `fetch`                                                                                          |
| `src/db/accounts.ts`                         | D1 for the account desk and the minute's poll                                                                                              |
| `src/db/organizations.ts`                    | an organization read in one batch, who is acting (owner, house, member), its log lines, the guarded writes                                 |
| `src/db/roles.ts`                            | the roles desk: read, create, edit, move and delete a role, give or take one, read the log — each change one guarded batch                 |
| `src/lib/roles.ts`                           | what numinia.com sends the roles desk, read: a role id, a draft, a change, a place                                                         |
| `migrations/0005_role_log_acts.sql`          | the log learns the acts of roles (the table is rebuilt: a CHECK cannot be altered)                                                         |
| `src/lib/organizations.ts`                   | the house flag, the words of refusals and who holds each act, the Saldo screen's «admin»                                                   |
| `migrations/0004_organization_roles.sql`     | owners, roles and who holds them, the house's access, each organization's log; the Team template for those founded before                  |
| `migrations/0003_accounts_and_checkouts.sql` | wallets' accounts, organizations and members, checkouts, the poll's cursor                                                                 |
| `migrations/0001_ledger.sql`                 | tables, append-only triggers, the seed tariff                                                                                              |
| `migrations/0002_tariff_basis.sql`           | why each version was published: `tariff_versions.basis`                                                                                    |
| `fixtures/meter.json`                        | the pretend meter's readings (`TILL_METER=fake`)                                                                                           |
| `test/sqlite-d1.ts`                          | a D1-shaped shim over `node:sqlite` that runs every migration                                                                              |
| `test/cloudflare-workers.ts`                 | the `WorkerEntrypoint` the tests use: vitest cannot resolve `cloudflare:workers`                                                           |

## The rules

- **Money** is integer euro cents; no float is stored (STRICT tables). The
  balance counts what the buyer PAID, tax included (Pablo, 2026-10-14): a
  10.00 € top-up is 10.00 € of balance in every country, and a Stripe refund
  of it takes back exactly 10.00 €. The VAT Stripe Managed Payments collected
  is kept on the top-up line (`vat_cents`) for the books; the tariff's prices
  are balance euros, VAT included. (`ADR-070` still says «net of VAT»: its
  amendment goes to the archive.)
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
  earliest; a rise only after the notice (30 days in the seed). Each keeps
  who published it (`created_by`: the seed's text or the Oracle's wallet) and
  why (`basis`, NULL for the seed), which the close never reads: no note can
  stop a night's close. Through the desk, a new version may not stop pricing
  a size charged to worlds in the last 35 days.
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

The tests run every migration, in order, on `node:sqlite` (Node ≥ 22.13). Where
`node:sqlite` supports runtime limits (Node 26), the shim also holds the
database to D1's documented limits — a LIKE/GLOB pattern of 50 bytes, 100
bound parameters — which is why the schema checks dates with `date(x) IS x`
and instants with `strftime(…) IS x` instead of GLOB. `cloudflare:workers`
exists only in workerd: `vitest.config.ts` points it to
`test/cloudflare-workers.ts`, a `WorkerEntrypoint` that keeps `ctx` and `env`.

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
| Build watch paths                  | include `apps/till/*` and `packages/domain/*`: the till decides with `@numinia/domain`, so a change there must deploy it too        |
| API token                          | the account's Workers Builds token with **Account → D1 → Edit** added: its default permissions leave D1 out, and migrations need it |

`npm run deploy` builds `@numinia/domain` first (Workers Builds runs no build
command, and the package ships as `dist/`), applies the pending migrations to
the remote database through its binding
(`TILL_DB`), then deploys. Wrangler records each applied migration in the database's
`d1_migrations` table, so each runs once: a change to the schema is a new numbered file in
`migrations/`, never an edit to an applied one. `0002_tariff_basis.sql` only adds a nullable
column, so the Worker already running keeps working on it (it names the columns it reads) and
the new one never runs without it (the migration is applied before the deploy). `0004` keeps
`team_members.role` for the same reason.

Deployed, the till is reachable from nowhere over HTTP (`workers_dev` and `preview_urls` are
off and it has no route): its entry points are the cron, whose runs show in Workers Logs
(`observability`), and the Oracle desk, which only numinia.com's service binding reaches.

**Deploy order.** Cloudflare says to deploy the bound Worker first — here the till, whose
`OracleDesk` must be live before numinia.com calls it — and each Worker deploys separately. On
a merge both Workers Builds run: the till's finishes in about a minute, the site's takes
several, so the desk is live before the room that calls it.

The cron is UTC, the till's reference time: `30 0 * * *` fires at 00:30 UTC
every night (01:30 in Madrid in winter, 02:30 in summer), and each run closes
the UTC day that has just ended.
