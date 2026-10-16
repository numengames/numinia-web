-- Who has signed in to numinia.com (cut «El censo», 2026-10-16), so the
-- house can add them to an organization. numinia-archive STD-053: «Only
-- fellow members see who it is» — the account desk answers this list to the
-- house alone (`citizens`), never to an organization's admin or member.
--
-- Minimal by design: per wallet, the first time and the last time it signed
-- in, and nothing else — no address, no browser, no count of visits, no
-- history rows. A new sign-in moves `last_seen_at`; `first_seen_at` stays.
-- People who signed in before this table existed are not in it until they
-- sign in again.
--
-- 0001 to 0006 are applied to the live database and never edited. The
-- Worker still running during the deploy never reads this table.

CREATE TABLE wallet_sign_ins (
  wallet TEXT NOT NULL PRIMARY KEY CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  first_seen_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', first_seen_at) IS first_seen_at),
  last_seen_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', last_seen_at) IS last_seen_at),
  CHECK (last_seen_at >= first_seen_at)
) STRICT;

-- The list reads newest last time first.
CREATE INDEX wallet_sign_ins_by_last_seen ON wallet_sign_ins (last_seen_at);
