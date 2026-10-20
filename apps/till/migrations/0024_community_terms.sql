-- «Normas de vuestros espacios» (condiciones/w1, 2026-10-20): the terms a
-- community writes for its worlds, in the same format the world's own file
-- carries (`condiciones@1`, layer `comunidad`; @numinia/domain's
-- `CommunityTerms`). Each publication is a NEW row: the earlier versions
-- stay, so the public page can show the history and a person who accepted
-- 1.0 can be told what changed in 1.1. Nothing here is ever updated or
-- deleted (triggers below, like the organization's log).
--
-- One community = one organization account (Pablo: they are the same
-- thing), so `account_id` is the team account. `seq` counts the versions of
-- that account from 1; the one in force is the highest. `version` is the
-- free text the administrator chose (1 to 40 characters); two versions of
-- one account may not read the same without case (the unique index).
--
-- `points` is the JSON array of points as the domain validated and wrote
-- them: `{id, titulo, texto, obligatorio, tipo}`. The till reads it back
-- through the same validator and fails closed on a row that no longer
-- passes it. The database only checks that it is a JSON array of 1 to 20.
--
-- `published_by` is the wallet of the administrator; the house acts as its
-- own wallet. No money, no foreign person's data: the terms are public.

CREATE TABLE community_terms (
  account_id TEXT NOT NULL REFERENCES accounts (id),
  seq INTEGER NOT NULL CHECK (seq >= 1),
  version TEXT NOT NULL CHECK (length(version) BETWEEN 1 AND 40 AND trim(version) <> ''),
  points TEXT NOT NULL CHECK (
    json_valid(points) AND json_type(points) = 'array'
    AND json_array_length(points) BETWEEN 1 AND 20
  ),
  published_by TEXT NOT NULL CHECK (
    length(published_by) = 42 AND substr(published_by, 1, 2) = '0x'
    AND length(trim(substr(published_by, 3), '0123456789abcdef')) = 0
  ),
  published_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', published_at) IS published_at),
  PRIMARY KEY (account_id, seq)
) STRICT;

CREATE UNIQUE INDEX community_terms_version ON community_terms (account_id, lower(version));

CREATE TRIGGER community_terms_kept_on_update BEFORE UPDATE ON community_terms
BEGIN
  SELECT RAISE(ABORT, 'a published version of the terms is kept');
END;
CREATE TRIGGER community_terms_kept_on_delete BEFORE DELETE ON community_terms
BEGIN
  SELECT RAISE(ABORT, 'a published version of the terms is kept');
END;
