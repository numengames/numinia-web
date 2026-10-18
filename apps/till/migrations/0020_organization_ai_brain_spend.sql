-- «El cerebro barato de cada comunidad» (Historia 2 of 4, kanban numinia-com
-- t_ec70b2e3): spend metering for the trial cap. Historia 1 (migration 0016)
-- gave every organization a model and a trial cap; Historia 4 (#170) gave it
-- an on/off switch. This cut adds the one thing both needed to mean
-- anything: a running total of what the trial has spent so far.
--
-- `spent_cents` is USD cents, the same unit as `trial_cap_cents` (0016):
-- unlike the ledger (EUR, net of VAT). It only ever grows — `recordAiSpend`
-- (apps/till/src/db/settings.ts) adds to it and, the moment the new total
-- reaches the cap, turns `enabled` off in the very same write: the agent
-- stops itself, the community stays connected, and the till never has to
-- run a second query to notice.
--
-- Still out of scope here, by design: the real call to a model provider
-- (needs an API key and a provider choice — a money decision for Pablo, not
-- a code one) and the recharge screen (needs a prepaid top-up flow). Both
-- are flagged in PREGUNTAS-t_ec70b2e3.md for the same reason.
ALTER TABLE organization_ai_brain
  ADD COLUMN spent_cents INTEGER NOT NULL DEFAULT 0 CHECK (spent_cents >= 0);
