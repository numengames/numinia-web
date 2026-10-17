/**
 * «El cerebro barato de cada comunidad» (Historia 1, kanban numinia-com
 * t_ec70b2e3, 2026-10-17): the defaults a new community's built-in AI agent
 * is born with — cheapest model, a starter trial budget — nothing else.
 * No real call, no engine wiring, no spend metering, no switch screen:
 * those are stories 2 to 4 of the same card.
 *
 * `DEFAULT_AI_MODEL` is a placeholder id for the cheapest tier the house
 * can name today; wiring it to a real provider call is a later story.
 * `DEFAULT_AI_TRIAL_CAP_CENTS` is USD cents (unlike the ledger, which is
 * EUR, net of VAT): 150 = $1.50, the middle of the card's requested $1-2
 * trial range. Migration 0016's backfill uses the same two literals —
 * written there as plain SQL, not imported, since a migration never
 * imports application code; keep them equal by hand if either changes.
 */

export const DEFAULT_AI_MODEL = 'gpt-5-nano';
export const DEFAULT_AI_TRIAL_CAP_CENTS = 150;
