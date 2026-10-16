-- Which organization each world belongs to (cut «Mundos ↔ organizaciones»,
-- 2026-10-16). Pablo: only the house (the Oracles) assigns a world to an
-- organization, and the organization that pays a world is the one that
-- administers it — one account per world, no field for anyone reselling.
--
-- Not the `worlds` table of 0001: nobody writes it and it carries billing
-- meaning (ledger lines and the close read it). A placement is a separate
-- fact; billing may read it later, and nothing reads it for money now.
--
-- `world_id` is the fleet's id (an order's slug), not a foreign key: worlds
-- live in the fleet, not in the till. `world_placement_log` keeps every
-- change append-only, as the organization's log does (STD-051 ORG-009).
--
-- 0001 to 0007 are applied to the live database and never edited. The
-- Worker still running during the deploy never reads these tables.

CREATE TABLE world_placements (
  world_id TEXT NOT NULL PRIMARY KEY CHECK (
    length(world_id) BETWEEN 1 AND 63
    AND length(trim(world_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    AND substr(world_id, 1, 1) <> '-' AND substr(world_id, -1, 1) <> '-'
    AND instr(world_id, '--') = 0
  ),
  account_id TEXT NOT NULL REFERENCES team_profiles (account_id),
  placed_by TEXT NOT NULL CHECK (
    length(placed_by) = 42 AND substr(placed_by, 1, 2) = '0x'
    AND length(trim(substr(placed_by, 3), '0123456789abcdef')) = 0
  ),
  placed_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', placed_at) IS placed_at)
) STRICT;

CREATE INDEX world_placements_by_account ON world_placements (account_id);

CREATE TABLE world_placement_log (
  seq INTEGER NOT NULL PRIMARY KEY,
  world_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES team_profiles (account_id),
  -- The organization the world left, when it was placed before.
  from_account_id TEXT REFERENCES team_profiles (account_id),
  placed_by TEXT NOT NULL CHECK (
    length(placed_by) = 42 AND substr(placed_by, 1, 2) = '0x'
    AND length(trim(substr(placed_by, 3), '0123456789abcdef')) = 0
  ),
  placed_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', placed_at) IS placed_at)
) STRICT;

CREATE INDEX world_placement_log_by_world ON world_placement_log (world_id, seq);

CREATE TRIGGER world_placement_log_kept_on_update BEFORE UPDATE ON world_placement_log
BEGIN
  SELECT RAISE(ABORT, 'the placement log is kept');
END;
CREATE TRIGGER world_placement_log_kept_on_delete BEFORE DELETE ON world_placement_log
BEGIN
  SELECT RAISE(ABORT, 'the placement log is kept');
END;
