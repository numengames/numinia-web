# @numinia/analytics

Typed funnel events, consent-gated, transport-pluggable, **zero runtime
dependencies** (ADR-016). Taxonomy and conventions: [docs/analytics.md](../../docs/analytics.md).

```ts
import {
  createAnalytics, createConsent, memoryTransport, bindMetricClicks, trackPageView,
} from '@numinia/analytics';

const analytics = createAnalytics({ transport: memoryTransport(), consent: createConsent('granted') });
const context = { path: location.pathname, locale: 'es', now: () => Date.now() };

trackPageView(analytics, context, document.referrer); // page_view (referrer → host only)
bindMetricClicks(document, analytics, context);       // every [data-metric] → cta_click
```

Guarantees:

- `track()` **never throws** — analytics can never break the app.
- Events before consent are **dropped, never buffered** (GDPR posture).
- Undeclared props are rejected: nothing untyped ever travels; no PII by design.
- Transports are pluggable (`memory`, `beacon`, `noop`) — the backend decision
  (open-questions D12) never touches call sites.
