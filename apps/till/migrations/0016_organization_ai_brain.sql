-- «El cerebro barato de cada comunidad» (Historia 1, kanban numinia-com
-- t_ec70b2e3, 2026-10-17): every community gets a default AI agent record
-- the moment the house opens its organization (`ensureCommunityTeam`), and
-- every organization already open gets the same default here, once, as
-- part of this very migration — no separate backfill script to remember to
-- run.
--
-- This cut is the data model and a read-only indicator ONLY (the panel's
-- Ajustes screen says «Agente IA: activo · <modelo> · tope $X»): no real
-- LLM call, no engine wiring, no spend metering, and no on/off switch
-- screen — those are stories 2 to 4 of the same card, deliberately left for
-- later. `enabled` exists already so a future switch has somewhere to
-- write, but nothing here flips it off; it is born on.
--
-- This is a DIFFERENT thing from `team_agents` (migration 0011): that table
-- is member-created 3D-world bots with their own Ed25519 key and world
-- pass. This one is the single built-in assistant every community/
-- organization is born with — no key, no pass, no world; just a model
-- choice and a trial budget.
--
-- `model` carries a placeholder id for the cheapest tier the house names
-- today (not yet wired to any real provider call): `gpt-5-nano`. One row
-- per organization, like `organization_settings` (0010).
--
-- `trial_cap_cents` is USD cents, unlike the ledger (EUR, net of VAT): 150
-- cents = $1.50, the middle of the card's requested $1-2 trial range.

CREATE TABLE organization_ai_brain (
  account_id TEXT NOT NULL PRIMARY KEY REFERENCES accounts (id),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  model TEXT NOT NULL CHECK (trim(model) = model AND length(model) BETWEEN 1 AND 64),
  trial_cap_cents INTEGER NOT NULL CHECK (trial_cap_cents > 0),
  created_at TEXT NOT NULL CHECK (strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- Backfill: every organization (`accounts.kind = 'team'`) already open —
-- community-born or founded by hand, Pablo's ruling makes them the same
-- thing — gets the identical default, once, right here. A community opened
-- from this moment on gets its row from `ensureCommunityTeam` itself
-- (apps/till/src/db/community-teams.ts); a generic organization founded by
-- hand (`createTeam`) is not wired to insert one yet (left for a later
-- cut, documented in the hand-off) — the till still shows the same default
-- to it on read (`db/settings.ts`'s `aiBrainRow` falls back to it when no
-- row is stored), so nothing on screen tells the two apart.
INSERT INTO organization_ai_brain (account_id, enabled, model, trial_cap_cents, created_at)
SELECT id, 1, 'gpt-5-nano', 150, '2026-10-17T00:00:00.000Z'
  FROM accounts
 WHERE kind = 'team';
