-- The organization's log learns the acts of managing roles (numinia-archive
-- STD-051 ORG-009: every change is written down). A CHECK cannot be altered
-- in SQLite, so the table is rebuilt with the longer list and its lines are
-- copied as they are; the log stays append-only.

-- A trigger of 0004 writes to team_log, and SQLite will not rename a table
-- while a trigger names the one dropped: it leaves for the rebuild and comes
-- back, as it was, below.
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
    'role-created', 'role-edited', 'role-moved', 'role-deleted'
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
