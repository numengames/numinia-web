-- «Seguir» for real (cut «Seguir», 2026-10-17): who follows which community.
-- Until now the button on a community's page wrote the id into the
-- browser's localStorage and nobody else knew; now the city does, so a
-- community can say «N personas la siguen» and a person finds «Sigues» on
-- /belong/ from any browser.
--
-- Minimal by design, like 0012's `ritual_rsvps`: one row per (community,
-- wallet) with the instant it was said, and nothing else. «Dejar de seguir»
-- deletes the row — no history. The community id is the register's id on
-- numinia.com (`src/content/communities/<id>.md`, the same shape 0013 reads),
-- which the till does not know: it keeps whatever well-formed id numinia.com
-- sends, and the store drops the ids that no longer name a community.
--
-- 0001 to 0013 are applied to the live database and never edited. The
-- Worker still running during the deploy never reads this table.

CREATE TABLE community_follows (
  community_id TEXT NOT NULL CHECK (
    length(community_id) BETWEEN 1 AND 63
    AND length(trim(community_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    AND substr(community_id, 1, 1) <> '-'
  ),
  wallet TEXT NOT NULL CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  PRIMARY KEY (community_id, wallet)
) STRICT;

-- A person's «Sigues» reads by wallet.
CREATE INDEX community_follows_by_wallet ON community_follows (wallet);
