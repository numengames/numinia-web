-- «Ajustes de la comunidad» (cut 8, 2026-10-16): each organization turns the
-- pieces of its panel on and off and picks how the panel names things
-- (Sencillo / Mixto / Numinia: screen words only — the back stays standard
-- English, STD-052 ids included). One row per organization, written the
-- first time somebody changes a setting; no row means today's behaviour:
-- every piece that is built is on, the «mixed» words.
--
-- `pieces_off` holds the ids of the pieces switched OFF (a new piece is born
-- on). The organization's log learns the act `settings-changed`: a CHECK
-- cannot be altered in SQLite, so the table is rebuilt with the longer list,
-- exactly as 0005 did, and its lines are copied as they are; the log stays
-- append-only.
--
-- 0001 to 0008 are applied to the live database and never edited. (Numbered
-- 0010 because another cut holds 0009; renumber at merge if needed.)

CREATE TABLE organization_settings (
  account_id TEXT NOT NULL PRIMARY KEY REFERENCES team_profiles (account_id),
  pieces_off TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(pieces_off) AND json_type(pieces_off) = 'array'
  ),
  vocabulary TEXT NOT NULL DEFAULT 'mixed' CHECK (vocabulary IN ('simple', 'mixed', 'numinia')),
  updated_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at)
) STRICT;

DROP TRIGGER team_members_founded_as_before;

CREATE TABLE team_log_next (
  seq INTEGER NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES team_profiles (account_id),
  at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', at) IS at),
  actor TEXT NOT NULL CHECK (
    length(actor) = 42 AND substr(actor, 1, 2) = '0x'
    AND length(trim(substr(actor, 3), '0123456789abcdef')) = 0
  ),
  as_house INTEGER NOT NULL CHECK (as_house IN (0, 1)),
  act TEXT NOT NULL CHECK (act IN (
    'organization-created', 'organization-renamed', 'member-added', 'member-removed',
    'member-left', 'role-given', 'role-taken', 'topup-started', 'house-read',
    'role-created', 'role-edited', 'role-moved', 'role-deleted', 'settings-changed'
  )),
  subject TEXT,
  detail TEXT CHECK (detail IS NULL OR json_valid(detail))
) STRICT;

INSERT INTO team_log_next (seq, account_id, at, actor, as_house, act, subject, detail)
SELECT seq, account_id, at, actor, as_house, act, subject, detail FROM team_log;

DROP TABLE team_log;
ALTER TABLE team_log_next RENAME TO team_log;

CREATE INDEX team_log_by_account ON team_log (account_id, seq);

CREATE TRIGGER team_log_kept_on_update BEFORE UPDATE ON team_log
BEGIN
  SELECT RAISE(ABORT, 'the organization''s log is kept');
END;
CREATE TRIGGER team_log_kept_on_delete BEFORE DELETE ON team_log
BEGIN
  SELECT RAISE(ABORT, 'the organization''s log is kept');
END;

CREATE TRIGGER team_members_founded_as_before AFTER INSERT ON team_members
WHEN NEW.owner = 0
 AND NOT EXISTS (SELECT 1 FROM team_roles WHERE account_id = NEW.account_id)
 AND NEW.wallet = (SELECT created_by FROM team_profiles WHERE account_id = NEW.account_id)
BEGIN
  UPDATE team_members SET owner = 1 WHERE account_id = NEW.account_id AND wallet = NEW.wallet;
  INSERT INTO team_roles (account_id, id, name, color, position, hoist, permissions)
  SELECT NEW.account_id, 'role_' || lower(hex(randomblob(8))), t.name, NULL, t.position, t.hoist,
         t.permissions
    FROM (
      SELECT 'Administration' AS name, 3 AS position, 1 AS hoist, '["administrator"]' AS permissions
      UNION ALL SELECT 'Finance', 2, 0, '["manage-balance"]'
      UNION ALL SELECT 'Member', 1, 0, '["enter-worlds","start-stop-worlds","build-in-worlds"]'
      UNION ALL SELECT '@everyone', 0, 0, '["view-balance","top-up"]'
    ) AS t;
  INSERT INTO team_log (account_id, at, actor, as_house, act, subject, detail)
  SELECT NEW.account_id, NEW.added_at, NEW.wallet, 0, 'organization-created', NULL,
         json_object('name', p.name, 'template', 'team')
    FROM team_profiles AS p WHERE p.account_id = NEW.account_id;
END;
