-- «Me apunto» for real (cut «Tu agenda», 2026-10-17): who said they are
-- going to which encounter («encuentro», code `ritual`). Until now the
-- button only downloaded an `.ics` file and nobody remembered who was
-- coming; now the city does, so an encounter can say «N personas van» and
-- a person can see their own agenda.
--
-- Minimal by design: one row per (ritual, wallet) with the instant it was
-- said, and nothing else. Saying «ya no voy» deletes the row — no history.
-- The ritual id is the slug of the encounter's file on numinia.com
-- (`src/content/communities/rituals/<id>.md`), which the till does not know:
-- it keeps whatever lowercase slug numinia.com sends, and the store drops
-- the ids that no longer name a file.
--
-- 0001 to 0011 are applied to the live database and never edited. The
-- Worker still running during the deploy never reads this table.

CREATE TABLE ritual_rsvps (
  ritual_id TEXT NOT NULL CHECK (
    length(ritual_id) BETWEEN 1 AND 100
    AND length(trim(ritual_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
  ),
  wallet TEXT NOT NULL CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  PRIMARY KEY (ritual_id, wallet)
) STRICT;

-- A person's agenda reads by wallet.
CREATE INDEX ritual_rsvps_by_wallet ON ritual_rsvps (wallet);
