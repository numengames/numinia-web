-- Organization roles, as a Discord server keeps them (numinia-archive ADR-071:
-- the rules are STD-051, what a role can carry is the register STD-052; the
-- four roles of MIS-179 become its Team template).
--
-- An organization keeps an ordered list of roles. Every member holds the base
-- role (position 0, which nobody is given by a row) and the roles given to
-- them; the higher a role, the more it may manage. Owners are a mark on the
-- member, not a role, and an organization always keeps one. What each person
-- may do is worked out by @numinia/domain on every request
-- (src/db/organizations.ts); the log keeps every change and every act of the
-- house's staff.
--
-- 0001 to 0003 are applied to the live database and never edited. The till
-- migrates and then deploys, so for a moment the Worker already running reads
-- these tables: `team_members.role` stays and is still written for it, and a
-- later migration drops it.

-- Owners (STD-051 ORG-002).
ALTER TABLE team_members ADD COLUMN owner INTEGER NOT NULL DEFAULT 0 CHECK (owner IN (0, 1));

-- How the house's staff may enter (STD-052): every organization during the alpha.
ALTER TABLE team_profiles ADD COLUMN house_access TEXT NOT NULL DEFAULT 'alpha'
  CHECK (house_access IN ('alpha', 'always', 'on-request', 'never'));

-- Raised by every change to an organization: the desk guards each write with
-- the value it read, so a change made meanwhile writes nothing.
ALTER TABLE team_profiles ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);

-- An organization's roles (STD-052): at most one at each position, the base
-- role at 0, never shown apart.
CREATE TABLE team_roles (
  account_id TEXT NOT NULL REFERENCES team_profiles (account_id),
  id TEXT NOT NULL CHECK (
    length(id) = 21 AND substr(id, 1, 5) = 'role_'
    AND length(trim(substr(id, 6), '0123456789abcdef')) = 0
  ),
  name TEXT NOT NULL CHECK (name = trim(name) AND length(name) BETWEEN 1 AND 100),
  color TEXT CHECK (
    color IS NULL OR (
      length(color) = 7 AND substr(color, 1, 1) = '#'
      AND length(trim(substr(color, 2), '0123456789abcdef')) = 0
    )
  ),
  position INTEGER NOT NULL CHECK (position >= 0),
  hoist INTEGER NOT NULL CHECK (hoist IN (0, 1) AND (hoist = 0 OR position > 0)),
  permissions TEXT NOT NULL CHECK (json_valid(permissions) AND json_type(permissions) = 'array'),
  PRIMARY KEY (account_id, id),
  UNIQUE (account_id, position)
) STRICT;

-- Who holds which role, besides the base role everyone holds. A member who
-- leaves and a role deleted take their rows with them.
CREATE TABLE team_member_roles (
  account_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (account_id, wallet, role_id),
  FOREIGN KEY (account_id, wallet) REFERENCES team_members (account_id, wallet) ON DELETE CASCADE,
  FOREIGN KEY (account_id, role_id) REFERENCES team_roles (account_id, id) ON DELETE CASCADE
) STRICT;
CREATE INDEX team_member_roles_by_role ON team_member_roles (account_id, role_id);

CREATE TRIGGER team_member_roles_never_the_base BEFORE INSERT ON team_member_roles
WHEN (SELECT position FROM team_roles WHERE account_id = NEW.account_id AND id = NEW.role_id) = 0
BEGIN
  SELECT RAISE(ABORT, 'everyone holds the base role: nobody is given it');
END;

-- The organization's log (STD-051 ORG-009): who, on whose behalf (their own
-- or the house's), what and when. Lines are only ever added.
CREATE TABLE team_log (
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
    'member-left', 'role-given', 'role-taken', 'topup-started', 'house-read'
  )),
  subject TEXT,
  detail TEXT CHECK (detail IS NULL OR json_valid(detail))
) STRICT;
CREATE INDEX team_log_by_account ON team_log (account_id, seq);

CREATE TRIGGER team_log_kept_on_update BEFORE UPDATE ON team_log
BEGIN
  SELECT RAISE(ABORT, 'the organization''s log is kept');
END;
CREATE TRIGGER team_log_kept_on_delete BEFORE DELETE ON team_log
BEGIN
  SELECT RAISE(ABORT, 'the organization''s log is kept');
END;

-- Every organization founded before roles was a team paying for worlds: it
-- gets the Team template of STD-052, named in English, the site's default.
INSERT INTO team_roles (account_id, id, name, color, position, hoist, permissions)
SELECT p.account_id, 'role_' || lower(hex(randomblob(8))), t.name, NULL, t.position, t.hoist,
       t.permissions
  FROM team_profiles AS p
 CROSS JOIN (
   SELECT 'Administration' AS name, 3 AS position, 1 AS hoist, '["administrator"]' AS permissions
   UNION ALL SELECT 'Finance', 2, 0, '["manage-balance"]'
   UNION ALL SELECT 'Member', 1, 0, '["enter-worlds","start-stop-worlds","build-in-worlds"]'
   UNION ALL SELECT '@everyone', 0, 0, '["view-balance","top-up"]'
 ) AS t;

-- Its admins hold Administration; its members hold Member.
INSERT INTO team_member_roles (account_id, wallet, role_id)
SELECT m.account_id, m.wallet, r.id
  FROM team_members AS m
  JOIN team_roles AS r
    ON r.account_id = m.account_id AND r.position = CASE m.role WHEN 'admin' THEN 3 ELSE 1 END;

-- Its founder owns it while still in it; where the founder has left, every
-- admin does, as every admin could do everything until now.
UPDATE team_members SET owner = 1
 WHERE wallet = (
   SELECT p.created_by FROM team_profiles AS p WHERE p.account_id = team_members.account_id
 );
UPDATE team_members SET owner = 1
 WHERE role = 'admin'
   AND account_id IN (
     SELECT p.account_id FROM team_profiles AS p
      WHERE NOT EXISTS (
        SELECT 1 FROM team_members AS o WHERE o.account_id = p.account_id AND o.owner = 1
      )
   );

-- An organization keeps an owner, where it kept an admin. The desk refuses
-- first (its guarded writes change nothing then); these are the backstop.
DROP TRIGGER team_members_keep_an_admin_on_update;
DROP TRIGGER team_members_keep_an_admin_on_delete;
CREATE TRIGGER team_members_keep_an_owner_on_update AFTER UPDATE OF owner ON team_members
WHEN OLD.owner = 1 AND NOT EXISTS (
  SELECT 1 FROM team_members WHERE account_id = OLD.account_id AND owner = 1
)
BEGIN
  SELECT RAISE(ABORT, 'an organization keeps at least one owner');
END;
CREATE TRIGGER team_members_keep_an_owner_on_delete AFTER DELETE ON team_members
WHEN OLD.owner = 1 AND NOT EXISTS (
  SELECT 1 FROM team_members WHERE account_id = OLD.account_id AND owner = 1
)
BEGIN
  SELECT RAISE(ABORT, 'an organization keeps at least one owner');
END;

-- Between this migration and the deploy that follows it, the Worker still
-- running founds organizations as before: its founder with no owner mark, and
-- no roles. This gives such an organization what the new desk gives one: its
-- founder owns it, it has the Team template, and its log says so. The new desk
-- founds with the owner mark, so this never fires for it. It goes with
-- team_members.role.
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
