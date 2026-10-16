-- «La casa es administradora, y Numen Games tiene sus roles» (cut 7,
-- 2026-10-16). Pablo: the default roles come coloured — Administration
-- orange, Finance blue, Member green — and in Numen Games the Oracles are the
-- administrators.
--
-- Organizations born from now on get both from the Worker's code
-- (ensureCommunityTeam, createTeam). This brings along the one that is
-- already open: the Numen Games account, whose id is 'acc_t_' + the first 32
-- hex of SHA-256('numinia-till community numen-games') (lib/community-teams.ts
-- communityAccountId). The till names roles in its default language, English.
--
-- Idempotent and harmless where the account does not exist: every statement
-- is guarded by the account's id, and a name or colour somebody has already
-- chosen is kept — the rename only touches the template's own name, and a
-- colour is only set where there is none. 0001 to 0008 are never edited.

UPDATE team_roles
   SET name = 'Oracles'
 WHERE account_id = 'acc_t_2e2dd18c880ba974da1512dc7cde2431'
   AND name = 'Administration'
   AND position > 0
   AND permissions LIKE '%"administrator"%'
   AND NOT EXISTS (SELECT 1 FROM team_roles AS other
                    WHERE other.account_id = team_roles.account_id AND other.name = 'Oracles');

UPDATE team_roles
   SET color = CASE position WHEN 3 THEN '#d98324' WHEN 2 THEN '#2f7fa8' ELSE '#3d8b5f' END
 WHERE account_id = 'acc_t_2e2dd18c880ba974da1512dc7cde2431'
   AND color IS NULL
   AND position IN (1, 2, 3);
