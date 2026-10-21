-- «La IA dentro del mundo», story S17 (2026-10-21): how an organization's AI
-- is present in its worlds, and which worlds it lives in. The pass that
-- numinia.com signs every few minutes will carry the first (S18); the
-- second decides which worlds an AI is given a pass for. The truth is
-- numinia.com's: the world only receives it. Decisions D-082 (it may stay in
-- a world with nobody using it, 1, 4 or 24 hours, off by default) and D-083
-- (what it hears) are in the settings; D-084 (who answers for it) is worked
-- out from the tables when the pass is made.
--
-- `presence_json` is the AI's presence settings, as @numinia/domain writes
-- them (`AgentPresence`, the names the engine's pass uses): `cuerpo`,
-- `burbuja`, `llamada`, `oye`, `quedarse_h`. NULL is the defaults — the
-- house's robot, a 4 m sphere seen when near, called by name, /name and
-- button from inside the bubble, no key phrase, leaves after 10 minutes,
-- hears only who calls it — so an AI made before this migration, and a new
-- one nobody has set up, need no row. The till reads it back through the same
-- validator and falls back to the defaults on a row that no longer passes it.
-- `oye` and the older `hears` column say the same thing about the last
-- rung of the ladder («everything nearby»): the desk writes them together.
--
-- `worlds_mode` says where the AI lives: 'todos' is every world placed in its
-- organization, now and later (what every AI did until now, so every AI made
-- before this migration is 'todos' and nothing breaks); 'elegidos' is only
-- the worlds in `team_agent_worlds`. Rows of that table whose world has left
-- the organization stay harmless — they are never read without the placement
-- — and the desk sweeps them when the house moves the world.
--
-- A world must belong to the organization of the AI: the trigger refuses a row
-- whose world is not placed there (`world_placements`, 0008). One table,
-- one column, added: no rebuild, and the organization's log keeps its acts
-- (the desk writes these changes under `agent-state`, as hearing did).

ALTER TABLE team_agents ADD COLUMN presence_json TEXT CHECK (
  presence_json IS NULL
  OR (json_valid(presence_json) AND json_type(presence_json) = 'object')
);

ALTER TABLE team_agents ADD COLUMN worlds_mode TEXT NOT NULL DEFAULT 'todos'
  CHECK (worlds_mode IN ('todos', 'elegidos'));

CREATE TABLE team_agent_worlds (
  account_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  world_id TEXT NOT NULL CHECK (
    length(world_id) BETWEEN 1 AND 63
    AND length(trim(world_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    AND substr(world_id, 1, 1) <> '-' AND substr(world_id, -1, 1) <> '-'
    AND instr(world_id, '--') = 0
  ),
  PRIMARY KEY (account_id, agent_id, world_id),
  FOREIGN KEY (account_id, agent_id) REFERENCES team_agents (account_id, agent_id) ON DELETE CASCADE
) STRICT, WITHOUT ROWID;

-- «Which AIs live in this world»: the world's tab (S24) and the sweep when the house moves it.
CREATE INDEX team_agent_worlds_by_world ON team_agent_worlds (world_id, account_id);

CREATE TRIGGER team_agent_worlds_of_its_organization BEFORE INSERT ON team_agent_worlds
WHEN NOT EXISTS (
  SELECT 1 FROM world_placements WHERE world_id = NEW.world_id AND account_id = NEW.account_id
)
BEGIN
  SELECT RAISE(ABORT, 'an AI lives only in the worlds of its own organization');
END;
