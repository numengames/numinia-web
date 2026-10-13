-- The till's ledger (ADR-070, MIS-177, MIS-178): the house's first database.
--
-- Lines are only ever added: a correction is a new line. Money is integer
-- euro cents, net of VAT; STRICT tables refuse anything but an integer in a
-- cents column. Days are UTC calendar dates, YYYY-MM-DD — UTC is the till's
-- reference time (ADR-070), so every day has 1440 minutes — checked with
-- `date(x) IS x`. Instants are written as Date#toISOString writes them
-- (so their text order is their time order), checked with
-- `strftime('%Y-%m-%dT%H:%M:%fZ', x) IS x` — not with GLOB: D1 caps a GLOB
-- pattern at 50 bytes.

-- The least the ledger needs of an account: people, roles and invitations
-- arrive with MIS-179.
CREATE TABLE accounts (
  id TEXT NOT NULL PRIMARY KEY CHECK (id <> ''),
  kind TEXT NOT NULL CHECK (kind IN ('personal', 'team')),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- The tariff as data with a date. `versionFor(day)` is the greatest
-- starts_on <= day, ties broken by the greatest id; sizes and rules are JSON
-- (see src/lib/tariff.ts).
CREATE TABLE tariff_versions (
  id INTEGER PRIMARY KEY CHECK (id >= 1),
  starts_on TEXT NOT NULL CHECK (date(starts_on) IS starts_on),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  created_by TEXT NOT NULL CHECK (trim(created_by) <> ''),
  sizes TEXT NOT NULL CHECK (json_valid(sizes) AND json_type(sizes) = 'object'),
  rules TEXT NOT NULL CHECK (json_valid(rules) AND json_type(rules) = 'object')
) STRICT;

-- The worlds the till knows, each with its account and the first UTC day
-- it was seen. A world's day is charged to the world's own account.
CREATE TABLE worlds (
  id TEXT NOT NULL PRIMARY KEY CHECK (id <> ''),
  account_id TEXT NOT NULL REFERENCES accounts (id),
  first_seen_on TEXT NOT NULL CHECK (date(first_seen_on) IS first_seen_on)
) STRICT;

CREATE INDEX worlds_by_account ON worlds (account_id);

-- The ledger. Each kind carries its own fields and no other's:
--   topup       > 0  a lot: vat_cents, stripe_payment_id, stripe_invoice_id
--                    (nullable until MIS-180; unique when present)
--   world_day  <= 0  world_id, machine, day, minutes_running, minutes_stopped,
--                    size, tariff_version_id; one line per world and day, its
--                    minutes no more than the 1440 of a UTC day
--   adjustment <> 0  by, reason (both required), corrects_line_id; positive,
--                    it is a lot with no Stripe ids
--   refund,
--   chargeback  < 0  lot_line_id (required), stripe_event_id (unique when present)
-- coalesce(..., 0) makes a NULL where a value is required fail the check.
CREATE TABLE ledger_lines (
  id TEXT NOT NULL PRIMARY KEY CHECK (id <> ''),
  account_id TEXT NOT NULL REFERENCES accounts (id),
  kind TEXT NOT NULL CHECK (kind IN ('topup', 'world_day', 'adjustment', 'refund', 'chargeback')),
  amount_cents INTEGER NOT NULL,
  at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', at) IS at),
  vat_cents INTEGER,
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,
  world_id TEXT REFERENCES worlds (id),
  machine TEXT,
  day TEXT,
  minutes_running INTEGER,
  minutes_stopped INTEGER,
  size TEXT,
  tariff_version_id INTEGER REFERENCES tariff_versions (id),
  "by" TEXT,
  reason TEXT,
  corrects_line_id TEXT REFERENCES ledger_lines (id),
  lot_line_id TEXT REFERENCES ledger_lines (id),
  stripe_event_id TEXT,
  CHECK (coalesce(
    CASE kind
      WHEN 'topup' THEN
        amount_cents > 0 AND vat_cents >= 0
        AND (stripe_payment_id IS NULL OR stripe_payment_id <> '')
        AND (stripe_invoice_id IS NULL OR stripe_invoice_id <> '')
        AND world_id IS NULL AND machine IS NULL AND day IS NULL
        AND minutes_running IS NULL AND minutes_stopped IS NULL
        AND size IS NULL AND tariff_version_id IS NULL
        AND "by" IS NULL AND reason IS NULL AND corrects_line_id IS NULL
        AND lot_line_id IS NULL AND stripe_event_id IS NULL
      WHEN 'world_day' THEN
        amount_cents <= 0
        AND world_id <> '' AND machine <> '' AND size <> '' AND date(day) IS day
        AND minutes_running >= 0 AND minutes_stopped >= 0
        AND minutes_running + minutes_stopped <= 1440
        AND tariff_version_id IS NOT NULL
        AND vat_cents IS NULL AND stripe_payment_id IS NULL AND stripe_invoice_id IS NULL
        AND "by" IS NULL AND reason IS NULL AND corrects_line_id IS NULL
        AND lot_line_id IS NULL AND stripe_event_id IS NULL
      WHEN 'adjustment' THEN
        amount_cents <> 0 AND trim("by") <> '' AND trim(reason) <> ''
        AND vat_cents IS NULL AND stripe_payment_id IS NULL AND stripe_invoice_id IS NULL
        AND world_id IS NULL AND machine IS NULL AND day IS NULL
        AND minutes_running IS NULL AND minutes_stopped IS NULL
        AND size IS NULL AND tariff_version_id IS NULL
        AND lot_line_id IS NULL AND stripe_event_id IS NULL
      ELSE
        amount_cents < 0 AND lot_line_id IS NOT NULL
        AND (stripe_event_id IS NULL OR stripe_event_id <> '')
        AND vat_cents IS NULL AND stripe_payment_id IS NULL AND stripe_invoice_id IS NULL
        AND world_id IS NULL AND machine IS NULL AND day IS NULL
        AND minutes_running IS NULL AND minutes_stopped IS NULL
        AND size IS NULL AND tariff_version_id IS NULL
        AND "by" IS NULL AND reason IS NULL AND corrects_line_id IS NULL
    END, 0))
) STRICT;

CREATE INDEX ledger_lines_by_account ON ledger_lines (account_id, at, id);
CREATE UNIQUE INDEX ledger_lines_one_per_world_day ON ledger_lines (world_id, day)
  WHERE kind = 'world_day';
CREATE UNIQUE INDEX ledger_lines_one_per_stripe_payment ON ledger_lines (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;
CREATE UNIQUE INDEX ledger_lines_one_per_stripe_invoice ON ledger_lines (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX ledger_lines_one_per_stripe_event ON ledger_lines (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- Append-only, enforced here and not only in code.
CREATE TRIGGER ledger_lines_no_update BEFORE UPDATE ON ledger_lines
BEGIN
  SELECT RAISE(ABORT, 'append-only');
END;

CREATE TRIGGER ledger_lines_no_delete BEFORE DELETE ON ledger_lines
BEGIN
  SELECT RAISE(ABORT, 'append-only');
END;

-- INSERT OR REPLACE would delete the line it collides with, and SQLite fires
-- no DELETE trigger for that while recursive triggers are off. So an insert
-- that collides with a line on any of its unique keys is dropped and the
-- line stays as it was: writing the same fact twice writes nothing.
CREATE TRIGGER ledger_lines_keep_first BEFORE INSERT ON ledger_lines
WHEN EXISTS (
  SELECT 1 FROM ledger_lines AS line
  WHERE line.id = NEW.id
    OR (NEW.kind = 'world_day' AND line.kind = 'world_day'
        AND line.world_id = NEW.world_id AND line.day = NEW.day)
    OR line.stripe_payment_id = NEW.stripe_payment_id
    OR line.stripe_invoice_id = NEW.stripe_invoice_id
    OR line.stripe_event_id = NEW.stripe_event_id
)
BEGIN
  SELECT RAISE(IGNORE);
END;

-- A world's day is charged to the account the world belongs to.
CREATE TRIGGER ledger_lines_world_day_own_account BEFORE INSERT ON ledger_lines
WHEN NEW.kind = 'world_day' AND NOT EXISTS (
  SELECT 1 FROM worlds WHERE worlds.id = NEW.world_id AND worlds.account_id = NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'a world day is charged to the world''s own account');
END;

-- A refund or a chargeback takes money back from a lot of its own account.
CREATE TRIGGER ledger_lines_refund_names_a_lot BEFORE INSERT ON ledger_lines
WHEN NEW.kind IN ('refund', 'chargeback') AND NOT EXISTS (
  SELECT 1 FROM ledger_lines AS lot
  WHERE lot.id = NEW.lot_line_id AND lot.account_id = NEW.account_id
    AND lot.kind IN ('topup', 'adjustment') AND lot.amount_cents > 0
)
BEGIN
  SELECT RAISE(ABORT, 'a refund or a chargeback names a lot of its own account');
END;

-- A correction names a line of its own account.
CREATE TRIGGER ledger_lines_correction_own_account BEFORE INSERT ON ledger_lines
WHEN NEW.corrects_line_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM ledger_lines AS corrected
  WHERE corrected.id = NEW.corrects_line_id AND corrected.account_id = NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'a correction names a line of its own account');
END;

CREATE TRIGGER tariff_versions_no_update BEFORE UPDATE ON tariff_versions
BEGIN
  SELECT RAISE(ABORT, 'append-only');
END;

CREATE TRIGGER tariff_versions_no_delete BEFORE DELETE ON tariff_versions
BEGIN
  SELECT RAISE(ABORT, 'append-only');
END;

-- REPLACE on an existing id would overwrite a version without a DELETE trigger.
CREATE TRIGGER tariff_versions_no_replace BEFORE INSERT ON tariff_versions
WHEN EXISTS (SELECT 1 FROM tariff_versions WHERE id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'append-only');
END;

-- Ids only grow: the greatest id wins a tie on the start date.
CREATE TRIGGER tariff_versions_ids_grow AFTER INSERT ON tariff_versions
WHEN NEW.id < (SELECT max(id) FROM tariff_versions)
BEGIN
  SELECT RAISE(ABORT, 'tariff version ids only grow');
END;

-- The at-zero state, derived by the nightly close (this table and the next
-- may change; the ledger may not). A stretch starts on the date of the run
-- that found the balance at or below zero, at that run's instant, and ends on
-- the UTC date of the first lot written after it. One open stretch per
-- account.
CREATE TABLE at_zero_periods (
  account_id TEXT NOT NULL REFERENCES accounts (id),
  starts_on TEXT NOT NULL CHECK (date(starts_on) IS starts_on),
  started_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', started_at) IS started_at),
  ends_on TEXT CHECK (ends_on IS NULL OR (date(ends_on) IS ends_on AND ends_on >= starts_on)),
  ended_by_line_id TEXT REFERENCES ledger_lines (id),
  CHECK ((ends_on IS NULL) = (ended_by_line_id IS NULL)),
  PRIMARY KEY (account_id, started_at)
) STRICT;

CREATE UNIQUE INDEX at_zero_periods_one_open ON at_zero_periods (account_id)
  WHERE ends_on IS NULL;

-- The deletion date of each world kept for free while its account is at zero.
CREATE TABLE keep_marks (
  world_id TEXT NOT NULL PRIMARY KEY REFERENCES worlds (id),
  account_id TEXT NOT NULL REFERENCES accounts (id),
  delete_on TEXT NOT NULL CHECK (date(delete_on) IS delete_on),
  marked_on TEXT NOT NULL CHECK (date(marked_on) IS marked_on)
) STRICT;

-- What the close reported to the Oracle instead of estimating, once each.
CREATE TABLE close_reports (
  world_id TEXT NOT NULL REFERENCES worlds (id),
  day TEXT NOT NULL CHECK (date(day) IS day),
  reason TEXT NOT NULL CHECK (reason IN ('unmeasured', 'invalid_reading', 'unpriced')),
  account_id TEXT NOT NULL REFERENCES accounts (id),
  reported_on TEXT NOT NULL CHECK (date(reported_on) IS reported_on),
  PRIMARY KEY (world_id, day, reason)
) STRICT;

-- The seed version: the design's EXAMPLE figures (DBT-026) — 2 GB at 60 c a
-- day running and 5 c stopped; event boost 180 c; top-ups from 10 € (quick
-- 10, 20, 50, 100 €); 2 days' balance to create; 90 days kept at zero;
-- 30 days' notice before a rise; warn at 3 days left. Same as SEED_TARIFF.
INSERT INTO tariff_versions (id, starts_on, created_at, created_by, sizes, rules)
VALUES (
  1,
  '2026-10-13',
  '2026-10-13T00:00:00.000Z',
  'seed: example figures (DBT-026)',
  '{"2g":{"runningCentsPerDay":60,"stoppedCentsPerDay":5}}',
  '{"eventBoostCentsPerDay":180,"minTopupCents":1000,"quickTopupsCents":[1000,2000,5000,10000],"minBalanceDaysRunning":2,"keepDaysAtZero":90,"noticeDaysForRise":30,"lowBalanceDaysDefault":3}'
);
