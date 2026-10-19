-- «IAs de organización», cut 2 — «token de acceso» (2026-10-17). An AI may
-- now be connected with an access TOKEN instead of an Ed25519 key, for whoever
-- knows nothing of terminals or keys: a long secret `ntk_` + 43 base64url
-- characters (32 random bytes) that the panel shows ONCE and the person pastes
-- where the AI asks for it. The till never sees the secret: numinia.com draws
-- it, keeps nothing of it, and hands the till only SHA-256(token) in hex
-- (`token_hash`) and the first 8 characters after `ntk_` (`token_prefix`), to
-- tell tokens apart in a list. Neither the secret nor the hash is ever written
-- to the organization's log: it learns only «token created / renewed / revoked»
-- with the prefix.
--
-- An agent has a key OR a token, never both (`auth_kind`). `public_key` is
-- NULL only for `auth_kind = 'token'`. A token agent whose token was revoked
-- keeps `auth_kind = 'token'` with the three token columns NULL: it is also
-- switched off by the act, and a renewal gives it a token again.
--
-- SQLite cannot relax a NOT NULL or a CHECK, so `team_agents` is rebuilt as
-- 0011 did with `team_log`. Its child `team_agent_roles` cascades on delete and
-- foreign keys are enforced, so dropping the parent would erase the roles: they
-- are kept aside in a temporary table, the child is dropped first, and both are
-- recreated and filled back. Every row keeps its data, as `auth_kind = 'key'`.
-- (A CHECK that comes out NULL passes in SQLite, so every column the rule
-- needs is also tested IS NOT NULL.) The log is rebuilt with the three new acts, on top of the act list 0015 left.

CREATE TABLE team_agent_roles_keep AS
SELECT account_id, agent_id, role_id FROM team_agent_roles;

CREATE TABLE team_agents_keep AS SELECT * FROM team_agents;

DROP TABLE team_agent_roles;
DROP TABLE team_agents;

CREATE TABLE team_agents (
  account_id TEXT NOT NULL REFERENCES team_profiles (account_id),
  agent_id TEXT NOT NULL CHECK (
    length(agent_id) BETWEEN 1 AND 32
    AND length(trim(agent_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    AND substr(agent_id, 1, 1) <> '-' AND substr(agent_id, -1, 1) <> '-'
  ),
  name TEXT NOT NULL CHECK (name = trim(name) AND length(name) BETWEEN 1 AND 40),
  auth_kind TEXT NOT NULL DEFAULT 'key' CHECK (auth_kind IN ('key', 'token')),
  public_key TEXT,
  token_hash TEXT,
  token_prefix TEXT,
  token_created_at TEXT,
  responsible_wallet TEXT NOT NULL CHECK (
    length(responsible_wallet) = 42 AND substr(responsible_wallet, 1, 2) = '0x'
    AND length(trim(substr(responsible_wallet, 3), '0123456789abcdef')) = 0
  ),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  state TEXT NOT NULL DEFAULT 'activa' CHECK (state IN ('activa', 'dormida')),
  created_by TEXT NOT NULL CHECK (
    length(created_by) = 42 AND substr(created_by, 1, 2) = '0x'
    AND length(trim(substr(created_by, 3), '0123456789abcdef')) = 0
  ),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
  updated_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at),
  PRIMARY KEY (account_id, agent_id),
  UNIQUE (account_id, public_key),
  CHECK (
    (
      auth_kind = 'key'
      AND token_hash IS NULL AND token_prefix IS NULL AND token_created_at IS NULL
      AND public_key IS NOT NULL
      AND length(public_key) = 51 AND substr(public_key, 1, 8) = 'ed25519:'
      AND length(trim(
        substr(public_key, 9),
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
      )) = 0
    )
    OR (
      auth_kind = 'token'
      AND public_key IS NULL
      AND (
        (token_hash IS NULL AND token_prefix IS NULL AND token_created_at IS NULL)
        OR (
          token_hash IS NOT NULL AND token_prefix IS NOT NULL AND token_created_at IS NOT NULL
          AND length(token_hash) = 64
          AND length(trim(token_hash, '0123456789abcdef')) = 0 -- gitleaks:allow (the hex alphabet, not a key)
          AND length(token_prefix) = 8
          AND length(trim(
            token_prefix,
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
          )) = 0
          AND strftime('%Y-%m-%dT%H:%M:%fZ', token_created_at) IS token_created_at
        )
      )
    )
  )
) STRICT;

CREATE UNIQUE INDEX team_agents_by_token ON team_agents (token_hash) WHERE token_hash IS NOT NULL;

INSERT INTO team_agents
  (account_id, agent_id, name, auth_kind, public_key, responsible_wallet, enabled, state,
   created_by, created_at, updated_at)
SELECT account_id, agent_id, name, 'key', public_key, responsible_wallet, enabled, state,
       created_by, created_at, updated_at
  FROM team_agents_keep;

CREATE TABLE team_agent_roles (
  account_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (account_id, agent_id, role_id),
  FOREIGN KEY (account_id, agent_id) REFERENCES team_agents (account_id, agent_id) ON DELETE CASCADE,
  FOREIGN KEY (account_id, role_id) REFERENCES team_roles (account_id, id) ON DELETE CASCADE
) STRICT;
CREATE INDEX team_agent_roles_by_role ON team_agent_roles (account_id, role_id);

CREATE TRIGGER team_agent_roles_never_the_base BEFORE INSERT ON team_agent_roles
WHEN (SELECT position FROM team_roles WHERE account_id = NEW.account_id AND id = NEW.role_id) = 0
BEGIN
  SELECT RAISE(ABORT, 'everyone holds the base role: nobody is given it');
END;

INSERT INTO team_agent_roles (account_id, agent_id, role_id)
SELECT account_id, agent_id, role_id FROM team_agent_roles_keep;

DROP TABLE team_agents_keep;
DROP TABLE team_agent_roles_keep;

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
    'ritual-created', 'ritual-cancelled', 'agent-token-created', 'agent-token-renewed',
    'agent-token-revoked'
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
