-- A world's own display name, overriding its card's or its own page's title
-- (card t_a856c570, 2026-10-18). Pablo can rename a world from the Lab's
-- admin UI; the new name must survive a reload. The house alone writes it.
--
-- `world_id` is the fleet's id, as in 0008's `world_placements` — not a
-- foreign key, since worlds live in the fleet, not in the till. One row per
-- world: renaming again simply replaces it (no log; a name is not money and
-- not an organization's custody, so nothing here needs an append-only trail).

CREATE TABLE world_names (
  world_id TEXT NOT NULL PRIMARY KEY CHECK (
    length(world_id) BETWEEN 1 AND 63
    AND length(trim(world_id, 'abcdefghijklmnopqrstuvwxyz0123456789-')) = 0
    AND substr(world_id, 1, 1) <> '-' AND substr(world_id, -1, 1) <> '-'
    AND instr(world_id, '--') = 0
  ),
  name TEXT NOT NULL CHECK (
    length(name) BETWEEN 1 AND 80 AND trim(name) = name
  ),
  renamed_by TEXT NOT NULL CHECK (
    length(renamed_by) = 42 AND substr(renamed_by, 1, 2) = '0x'
    AND length(trim(substr(renamed_by, 3), '0123456789abcdef')) = 0
  ),
  renamed_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', renamed_at) IS renamed_at)
) STRICT;
