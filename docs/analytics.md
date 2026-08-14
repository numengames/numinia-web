# Analytics & Funnels — conventions and taxonomy

> Authority for every analytics event name and prop (ADR-016). Changing anything
> here changes dashboards: update this file first, then `packages/analytics`.

## Principles

1. **Privacy first.** No PII ever: wallet addresses are never an event prop; referrers are reduced to their host; undeclared props are rejected at runtime.
2. **Consent-gated, drop-not-buffer.** Events before consent are dropped, never queued (GDPR posture). Phase 0 runs local-only (memory transport + granted consent); **before any public deploy** this switches to a consent banner + the chosen backend (open-questions D12).
3. **Typed catalog, frozen names.** Every event lives in `packages/analytics/src/events.ts` with a strict props spec. Funnels break silently when names drift — names only change through this document.
4. **Zero JS per button.** One delegated listener per page reads `data-metric`; buttons carry an attribute, not code. The whole bootstrap inlines into the HTML (~2 KB).
5. **Analytics never breaks the app.** `track()` returns results instead of throwing; transport failures are swallowed.

## The convention (binding for every future component)

> Every interactive element (button, link with intent, form submit) MUST carry
> `data-metric="<area>-<action>"`, kebab-case, stable across redesigns.

```html
<button data-metric="archive-download">Download</button>
<a href="/citizen" data-metric="nav-citizen">Citizen</a>
```

`cta_click { metricId }` is emitted automatically. Add a dedicated event only when a step needs richer props (e.g. `download_click`).

## Event catalog (v1)

| Event | Props | Phase | Purpose |
|---|---|---|---|
| `page_view` | `referrerHost?` | 0 | Traffic + acquisition source (host only) |
| `cta_click` | `metricId` | 0 | Generic interaction — the funnel glue |
| `download_click` | `assetId`, `format` | 1 | Gallery conversion |
| `wallet_connect_start` | — | 2 | Identity funnel entry (no address) |
| `wallet_connect_success` | — | 2 | Identity funnel conversion (no address) |
| `session_zero_start` | — | 3 | Citizenship funnel entry |
| `seal_earned` | `sealId` | 3 | Citizenship funnel progress |

Envelope on every event: `name`, `path`, `locale?`, `ts`.

## Planned funnels

1. **Visitor → Downloader** (Layer 0): `page_view` → `cta_click(archive-*)` → `download_click`.
2. **Visitor → Citizen** (Layers 2–3): `page_view` → `wallet_connect_start` → `wallet_connect_success` → `session_zero_start` → `seal_earned` ×4.
3. **Locale performance**: any funnel segmented by the envelope `locale`.

## Open

- **D12 — backend/vendor** (Plausible? self-hosted Umami? custom beacon endpoint?): Oracle decision before deploy. The `beaconTransport` is ready for any of them; no call site changes.
