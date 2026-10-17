-- «Hazla tuya» for real (cut G, 2026-10-17): a signed-in person asks for a
-- community of the register — to claim it (`claim`: «Es mi comunidad», they
-- run it and become its owner, «Titular») or to join it (`join`: «Quiero
-- entrar»). The house, or an administrator of the community's organization,
-- accepts or declines; nothing happens on its own. The claim rate is the
-- beta's metric, so every request is a row, kept after the decision.
--
-- `community_id` is the register's id (the organization's account id is
-- derived from it, apps/till/src/lib/community-teams.ts), not a foreign key:
-- a claim is asked before the organization is open. `note` is the optional
-- line «Cuéntanos quién eres», 280 characters at most. One OPEN request per
-- (community, wallet, kind): a second ask finds the first.
--
-- The organization's log learns the two decisions (`request-accepted`,
-- `request-declined`): a CHECK cannot be altered in SQLite, so the table is
-- rebuilt with the longer list, as 0005, 0010 and 0011 did, and its lines
-- are copied as they are; it stays append-only.
--
-- (Numbered 0013 because another cut holds 0012; renumber at merge if needed.)

CREATE TABLE community_requests (
  id TEXT NOT NULL PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 1, 4) = 'req_'
    AND length(trim(substr(id, 5), '0123456789abcdef')) = 0
  ),
  community_id TEXT NOT NULL CHECK (
    length(community_id) BETWEEN 1 AND 63
    AND length(trim(community_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    AND substr(community_id, 1, 1) <> '-'
  ),
  wallet TEXT NOT NULL CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  kind TEXT NOT NULL CHECK (kind IN ('claim', 'join')),
  note TEXT CHECK (note IS NULL OR (note = trim(note) AND length(note) BETWEEN 1 AND 280)),
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'accepted', 'declined')),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  decided_at TEXT CHECK (
    (decided_at IS NULL) = (state = 'open')
    AND (decided_at IS NULL OR strftime('%Y-%m-%dT%H:%M:%fZ', decided_at) IS decided_at)
  ),
  decided_by TEXT CHECK (
    (decided_by IS NULL) = (state = 'open')
    AND (decided_by IS NULL OR (
      length(decided_by) = 42 AND substr(decided_by, 1, 2) = '0x'
      AND length(trim(substr(decided_by, 3), '0123456789abcdef')) = 0
    ))
  )
) STRICT;

CREATE UNIQUE INDEX community_requests_one_open
  ON community_requests (community_id, wallet, kind) WHERE state = 'open';
CREATE INDEX community_requests_by_wallet ON community_requests (wallet, created_at);
CREATE INDEX community_requests_open_by_time
  ON community_requests (created_at) WHERE state = 'open';

-- A decided request is kept as it was decided: only an open one changes.
CREATE TRIGGER community_requests_decided_once BEFORE UPDATE ON community_requests
WHEN OLD.state <> 'open'
BEGIN
  SELECT RAISE(ABORT, 'a decided request is kept');
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
    'agent-role-given', 'agent-role-taken', 'request-accepted', 'request-declined'
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
