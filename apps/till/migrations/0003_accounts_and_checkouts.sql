-- Accounts for people, and top-ups through Stripe (cut «Saldo»: MIS-179,
-- MIS-180, ADR-070).
--
-- The account desk (src/worker.ts, `AccountDesk`) shows each wallet its own
-- account and the organizations (teams) it belongs to, and opens Stripe
-- Managed Payments Checkout to top one up. Who is calling is numinia.com's
-- signed session; WHAT that wallet may do is decided here, from these tables.
--
-- The ledger does not change: a top-up is a `topup` line (0001) with the
-- payment intent as `stripe_payment_id`, so the keep-first trigger drops a
-- second credit of the same payment. Membership is not money: these tables
-- may be updated and deleted, except where noted.
--
-- 0001 and 0002 are applied to the live database and never edited. Wallets
-- are written as numinia.com's session holds them: 0x and 40 lowercase hex
-- digits, checked without GLOB (D1 caps a GLOB pattern at 50 bytes):
-- `length = 42`, the `0x` prefix, and nothing left once every hex digit is
-- removed.

-- A wallet's personal account, created the first time the desk sees it.
CREATE TABLE account_wallets (
  wallet TEXT NOT NULL PRIMARY KEY CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts (id)
) STRICT;

-- An organization's name and who founded it; only for accounts of kind 'team'.
CREATE TABLE team_profiles (
  account_id TEXT NOT NULL PRIMARY KEY REFERENCES accounts (id),
  name TEXT NOT NULL CHECK (name = trim(name) AND length(name) BETWEEN 1 AND 60),
  created_by TEXT NOT NULL CHECK (length(created_by) = 42 AND substr(created_by, 1, 2) = '0x'),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

CREATE TRIGGER team_profiles_only_teams BEFORE INSERT ON team_profiles
WHEN NOT EXISTS (SELECT 1 FROM accounts WHERE id = NEW.account_id AND kind = 'team')
BEGIN
  SELECT RAISE(ABORT, 'a profile is for a team account');
END;

-- Who belongs to an organization, and as what. Only two roles in this cut.
CREATE TABLE team_members (
  account_id TEXT NOT NULL REFERENCES team_profiles (account_id),
  wallet TEXT NOT NULL CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  added_by TEXT NOT NULL CHECK (length(added_by) = 42 AND substr(added_by, 1, 2) = '0x'),
  added_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', added_at) IS added_at),
  PRIMARY KEY (account_id, wallet)
) STRICT;

CREATE INDEX team_members_by_wallet ON team_members (wallet);

-- The desk refuses to leave an organization without an admin (its guarded
-- writes change nothing then); these triggers are the backstop.
CREATE TRIGGER team_members_keep_an_admin_on_update AFTER UPDATE OF role ON team_members
WHEN OLD.role = 'admin' AND NOT EXISTS (
  SELECT 1 FROM team_members WHERE account_id = OLD.account_id AND role = 'admin'
)
BEGIN
  SELECT RAISE(ABORT, 'an organization keeps at least one admin');
END;

CREATE TRIGGER team_members_keep_an_admin_on_delete AFTER DELETE ON team_members
WHEN OLD.role = 'admin' AND NOT EXISTS (
  SELECT 1 FROM team_members WHERE account_id = OLD.account_id AND role = 'admin'
)
BEGIN
  SELECT RAISE(ABORT, 'an organization keeps at least one admin');
END;

-- Who opened which Stripe Checkout Session for which account and amount:
-- what tells the desk a returning session is ours, and whose. Only `state`
-- changes, and a paid checkout stays paid.
CREATE TABLE checkouts (
  id TEXT NOT NULL PRIMARY KEY CHECK (substr(id, 1, 3) = 'cs_' AND length(id) <= 255),
  account_id TEXT NOT NULL REFERENCES accounts (id),
  wallet TEXT NOT NULL CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  amount_key TEXT NOT NULL CHECK (amount_key IN ('10', '50', '100')),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  state TEXT NOT NULL CHECK (state IN ('open', 'paid', 'expired'))
) STRICT;

CREATE INDEX checkouts_by_account ON checkouts (account_id, created_at);

CREATE TRIGGER checkouts_only_state_changes BEFORE UPDATE ON checkouts
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id
  OR NEW.wallet IS NOT OLD.wallet OR NEW.amount_key IS NOT OLD.amount_key
  OR NEW.created_at IS NOT OLD.created_at
  OR (OLD.state = 'paid' AND NEW.state <> 'paid')
BEGIN
  SELECT RAISE(ABORT, 'a checkout changes only its state, and a paid one stays paid');
END;

CREATE TRIGGER checkouts_no_delete BEFORE DELETE ON checkouts
BEGIN
  SELECT RAISE(ABORT, 'checkouts are kept');
END;

-- The minute poll's high-water mark: the newest `created` (unix seconds) of
-- the Stripe events it has read. One row.
CREATE TABLE stripe_cursor (
  id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
  last_created INTEGER NOT NULL CHECK (last_created >= 0)
) STRICT;
