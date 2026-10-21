-- «La casa conecta IAs» (D-078, 2026-10-20): the house may connect an AI in
-- any community that lets the house in (ORG-007), and answers for it as the
-- house. The row says which: `responsible_house` is 1 when the person in
-- `responsible_wallet` is the house's Oracle acting as the house, not as a
-- member of the community; 0 for every AI made so far, whose responsible
-- person is a member (ORG-011). A house-answered AI is worked out against
-- the house's access, not a member's: it keeps getting its pass while the
-- community lets the house in, and stops (no responsible) when it does not.
-- Whoever made it is in the organization's log with the house's mark
-- (`team_log.as_house`, ORG-009) as every act of the house is.
--
-- One column, added: no rebuild.

ALTER TABLE team_agents ADD COLUMN responsible_house INTEGER NOT NULL DEFAULT 0 CHECK (responsible_house IN (0, 1));
