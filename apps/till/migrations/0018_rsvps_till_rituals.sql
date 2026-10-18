-- «Me apunto» on an encounter published from the city (cut O, 2026-10-18).
-- 0012's `ritual_rsvps` only accepted the slug of an encounter's file on
-- numinia.com (`[a-z0-9-]`); since cut M an encounter can also live in the
-- till's own `rituals` table (0015) with an id `rit_` + 16 hex, and its
-- underscore failed 0012's CHECK — so the button stayed hidden on them.
--
-- A CHECK cannot be altered in SQLite: the table is rebuilt (as 0005, 0010,
-- 0011, 0013 and 0015 did) with the id rule widened to «a file slug OR a
-- till id», and its rows are copied as they are. Nothing else changes: still
-- one row per (ritual, wallet), still keyed and indexed the same way. The
-- Worker checks that a `rit_` id names a live encounter before it writes —
-- a foreign key would delete nothing (cancelling keeps the row) and would
-- not apply to file slugs, so the rule lives in code.
--
-- (Numbered 0018 because 0017 is on main; renumber at merge if another cut
-- holds it.)

CREATE TABLE ritual_rsvps_next (
  ritual_id TEXT NOT NULL CHECK (
    (
      length(ritual_id) BETWEEN 1 AND 100
      AND length(trim(ritual_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    ) OR (
      length(ritual_id) = 20 AND substr(ritual_id, 1, 4) = 'rit_'
      AND length(trim(substr(ritual_id, 5), '0123456789abcdef')) = 0
    )
  ),
  wallet TEXT NOT NULL CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  PRIMARY KEY (ritual_id, wallet)
) STRICT;

INSERT INTO ritual_rsvps_next (ritual_id, wallet, created_at)
  SELECT ritual_id, wallet, created_at FROM ritual_rsvps;

DROP TABLE ritual_rsvps;
ALTER TABLE ritual_rsvps_next RENAME TO ritual_rsvps;

-- A person's agenda reads by wallet.
CREATE INDEX ritual_rsvps_by_wallet ON ritual_rsvps (wallet);
