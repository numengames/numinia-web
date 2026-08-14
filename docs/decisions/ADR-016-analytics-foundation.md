# ADR-016: Analytics foundation — typed funnel events, consent-gated, transport-pluggable

**Status:** Accepted (autonomous, flagged for Oracle review)
**Date:** 2026-08-15

## Definition

`packages/analytics` provides the metrics foundation requested by the Oracle ("métricas en todos los botones para crear funnels"):

- A **frozen, typed event catalog** (7 events covering Phases 0–3 funnels) with strict prop specs; undeclared props are rejected — wallet addresses can never travel.
- **Consent gating** with a drop-not-buffer GDPR posture.
- **Pluggable transports** (memory for Phase 0 local-only, beacon-batching for the future backend, noop) so the vendor decision (open-questions D12) never touches call sites.
- The **`data-metric` convention**: one delegated listener per page; every interactive element carries `data-metric="<area>-<action>"` and ships zero extra JavaScript.
- Validation is **hand-rolled, not Zod**: events are internally produced (already compiler-typed), and bundling a schema library cost 60 KB in every page — measured, then removed. The package has **zero runtime dependencies**; external data keeps using Zod in `@numinia/domain`.

## Epistemic value

Funnels require stable event names from day one — retrofitting instrumentation produces unusable historical data. Declaring the Phase 1–3 events now (unused but frozen) makes future dashboards comparable from the first real click. The 60 KB → ~2 KB inline measurement validated the no-schema-library choice empirically.

## Pragmatic value

100% test coverage (20 tests), `track()` never throws (analytics can never break the app), and the store already emits `page_view` per page with the delegated listener armed — the first Phase 1 button gets funnel data by adding one attribute.

## Consequences

- docs/analytics.md is the naming authority; changes flow document-first.
- Before any deploy: consent banner + transport choice (D12) are mandatory gates.
