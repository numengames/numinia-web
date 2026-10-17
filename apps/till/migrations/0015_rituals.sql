-- «Crear → Un encuentro» for real (cut M, 2026-10-17): an encounter
-- («encuentro», code `ritual`) published from numinia.com by someone who
-- runs a community — the house, or an administrator of the community's
-- organization — instead of a markdown file in the register. The site
-- merges these rows with its files, so every list shows both.
--
-- `community_id` is the register's id (the organization's account id is
-- derived from it, apps/till/src/lib/community-teams.ts). `start` and `end`
-- are either both days (YYYY-MM-DD, `all_day` = 1, `ends` the inclusive
-- last day) or both instants in UTC (`all_day` = 0), as the register's
-- files give them. `mode` says how people meet; `world_id` names the
-- community's world when the mode is its world (`online` with a world).
-- `note` is the optional line, 600 characters at most. A cancelled
-- encounter keeps its row with `cancelled_at`: it leaves the lists, its
-- page says so, nothing is deleted.
--
-- The organization's log learns the two acts (`ritual-created`,
-- `ritual-cancelled`): a CHECK cannot be altered in SQLite, so the table
-- is rebuilt with the longer list, as 0005, 0010, 0011 and 0013 did, and
-- its lines are copied as they are; it stays append-only.
--
-- (Numbered 0015 because another cut holds 0014; renumber at merge if needed.)

CREATE TABLE rituals (
  id TEXT NOT NULL PRIMARY KEY CHECK (
    length(id) = 20 AND substr(id, 1, 4) = 'rit_'
    AND length(trim(substr(id, 5), '0123456789abcdef')) = 0
  ),
  community_id TEXT NOT NULL CHECK (
    length(community_id) BETWEEN 1 AND 63
    AND length(trim(community_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    AND substr(community_id, 1, 1) <> '-'
  ),
  title TEXT NOT NULL CHECK (title = trim(title) AND length(title) BETWEEN 1 AND 120),
  starts TEXT NOT NULL,
  ends TEXT NOT NULL,
  all_day INTEGER NOT NULL CHECK (all_day IN (0, 1)),
  mode TEXT NOT NULL CHECK (mode IN ('in-person', 'online', 'mixed')),
  where_text TEXT NOT NULL CHECK (
    where_text = trim(where_text) AND length(where_text) BETWEEN 1 AND 200
  ),
  note TEXT CHECK (note IS NULL OR (note = trim(note) AND length(note) BETWEEN 1 AND 600)),
  world_id TEXT CHECK (world_id IS NULL OR length(world_id) BETWEEN 1 AND 100),
  created_by TEXT NOT NULL CHECK (
    length(created_by) = 42 AND substr(created_by, 1, 2) = '0x'
    AND length(trim(substr(created_by, 3), '0123456789abcdef')) = 0
  ),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  cancelled_at TEXT CHECK (
    cancelled_at IS NULL OR strftime('%Y-%m-%dT%H:%M:%fZ', cancelled_at) IS cancelled_at
  ),
  CHECK (
    (all_day = 1 AND date(starts) IS starts AND date(ends) IS ends AND ends >= starts)
    OR (
      all_day = 0
      AND strftime('%Y-%m-%dT%H:%M:%fZ', starts) IS starts
      AND strftime('%Y-%m-%dT%H:%M:%fZ', ends) IS ends
      AND ends >= starts
    )
  )
) STRICT;

CREATE INDEX rituals_by_community ON rituals (community_id, starts);
CREATE INDEX rituals_open_by_start ON rituals (starts) WHERE cancelled_at IS NULL;

-- An encounter is published once and cancelled at most once: nothing else of it changes.
CREATE TRIGGER rituals_cancelled_once BEFORE UPDATE ON rituals
WHEN OLD.cancelled_at IS NOT NULL
  OR NEW.id <> OLD.id OR NEW.community_id <> OLD.community_id OR NEW.title <> OLD.title
  OR NEW.starts <> OLD.starts OR NEW.ends <> OLD.ends OR NEW.all_day <> OLD.all_day
  OR NEW.mode <> OLD.mode OR NEW.where_text <> OLD.where_text
  OR NEW.note IS NOT OLD.note OR NEW.world_id IS NOT OLD.world_id
  OR NEW.created_by <> OLD.created_by OR NEW.created_at <> OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'a published encounter only gets cancelled');
END;

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
    'role-created', 'role-edited', 'role-moved', 'role-deleted', 'settings-changed',
    'agent-created', 'agent-enabled', 'agent-disabled', 'agent-state', 'agent-removed',
    'agent-role-given', 'agent-role-taken', 'request-accepted', 'request-declined',
    'ritual-created', 'ritual-cancelled'
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
