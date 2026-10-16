-- A name and an avatar each person may publish (cut «Tu nombre y tu cara»,
-- 2026-10-16). numinia-archive STD-053: «Nobody is shown before choosing»
-- (GDPR art. 25(2)) and «Only fellow members see who it is». A row exists
-- only once the person saved a name themselves; the account desk shows it
-- to the people who share an organization with them and to the house's
-- staff where it enters (`roles`), and to nobody else.
--
-- Not append-only: publishing again replaces the row, and «Dejar de
-- mostrarlo» deletes it — no history of names is kept, here or in any log.
-- The avatar is the id of one of the Bazar's avatars (numinia.com checks it
-- against its list), never a picture: nothing anyone uploads is stored.
--
-- 0001 to 0005 are applied to the live database and never edited. The
-- Worker still running during the deploy never reads this table.
--
-- The name: 1 to 60 characters once trimmed, as people count them, and no
-- control character or direction override anywhere. The desk refuses them
-- first (src/lib/profiles.ts); here each is looked for on its own with
-- instr(), since D1 caps a GLOB pattern at 50 bytes. (Comments inside the
-- CREATE below are kept in the schema, which must name no such pattern.)

CREATE TABLE wallet_profiles (
  wallet TEXT NOT NULL PRIMARY KEY CHECK (
    length(wallet) = 42 AND substr(wallet, 1, 2) = '0x'
    AND length(trim(substr(wallet, 3), '0123456789abcdef')) = 0
  ),
  name TEXT NOT NULL CHECK (
    name = trim(name) AND length(name) BETWEEN 1 AND 60
    -- C0: U+0000 to U+001F.
    AND instr(name, char(0)) + instr(name, char(1)) + instr(name, char(2))
      + instr(name, char(3)) + instr(name, char(4)) + instr(name, char(5))
      + instr(name, char(6)) + instr(name, char(7)) + instr(name, char(8))
      + instr(name, char(9)) + instr(name, char(10)) + instr(name, char(11))
      + instr(name, char(12)) + instr(name, char(13)) + instr(name, char(14))
      + instr(name, char(15)) + instr(name, char(16)) + instr(name, char(17))
      + instr(name, char(18)) + instr(name, char(19)) + instr(name, char(20))
      + instr(name, char(21)) + instr(name, char(22)) + instr(name, char(23))
      + instr(name, char(24)) + instr(name, char(25)) + instr(name, char(26))
      + instr(name, char(27)) + instr(name, char(28)) + instr(name, char(29))
      + instr(name, char(30)) + instr(name, char(31)) = 0
    -- DEL and C1: U+007F to U+009F.
    AND instr(name, char(127)) + instr(name, char(128)) + instr(name, char(129))
      + instr(name, char(130)) + instr(name, char(131)) + instr(name, char(132))
      + instr(name, char(133)) + instr(name, char(134)) + instr(name, char(135))
      + instr(name, char(136)) + instr(name, char(137)) + instr(name, char(138))
      + instr(name, char(139)) + instr(name, char(140)) + instr(name, char(141))
      + instr(name, char(142)) + instr(name, char(143)) + instr(name, char(144))
      + instr(name, char(145)) + instr(name, char(146)) + instr(name, char(147))
      + instr(name, char(148)) + instr(name, char(149)) + instr(name, char(150))
      + instr(name, char(151)) + instr(name, char(152)) + instr(name, char(153))
      + instr(name, char(154)) + instr(name, char(155)) + instr(name, char(156))
      + instr(name, char(157)) + instr(name, char(158)) + instr(name, char(159)) = 0
    -- The direction embeddings and overrides (U+202A to U+202E) and isolates
    -- (U+2066 to U+2069), which can make a name read as another.
    AND instr(name, char(8234)) + instr(name, char(8235)) + instr(name, char(8236))
      + instr(name, char(8237)) + instr(name, char(8238)) + instr(name, char(8294))
      + instr(name, char(8295)) + instr(name, char(8296)) + instr(name, char(8297)) = 0
  ),
  -- An asset id as the Bazar writes them (`avatar-arla-mncdhz3l`,
  -- `ndg-<uuid>`): lowercase letters, digits and hyphens, not starting with a
  -- hyphen, 64 at most. Null: the person chose no avatar.
  avatar TEXT CHECK (
    avatar IS NULL OR (
      length(avatar) BETWEEN 1 AND 64 AND substr(avatar, 1, 1) <> '-'
      AND length(trim(avatar, '0123456789abcdefghijklmnopqrstuvwxyz-')) = 0
    )
  ),
  updated_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at)
) STRICT;
