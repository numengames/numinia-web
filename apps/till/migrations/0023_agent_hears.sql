-- «Conecta tu IA», story C1 (2026-10-20): whether an organization's AI may
-- hear what is said nearby in the worlds. Hearing is no longer a house-wide
-- switch: it is a setting of each AI, OFF by default, flipped by whoever may
-- edit that AI in the community (the same `mayEdit` that switches it on or
-- off and sets its state). The row says which: `hears` is 1 when the AI may
-- read nearby chat, 0 when not. A change is a line of the organization's
-- log under the act that already exists for an AI's state change
-- (`agent-state`, detail `hears`): no new act, so `team_log` and its act
-- list (0021) stay as they are.
--
-- One column, added: no rebuild. Every AI made before this migration keeps
-- hearing nothing (0).

ALTER TABLE team_agents ADD COLUMN hears INTEGER NOT NULL DEFAULT 0 CHECK (hears IN (0, 1));
