# @numinia/store — numinia.store

The **spike/PoC track** ("does it work?"). Astro 7, SSG by default, React
islands only where interactivity demands it. Shared `packages/*` stay at
production (`com`) standard even when consumed here.

## Run

```bash
cp ../../.env.example .env   # fill GITHUB_REPO_OWNER / GITHUB_REPO_NAME
npm run dev                  # :4321 — a missing required var crashes the boot (by design)
npm run build && node dist/server/entry.mjs
```

## What lives here (Phase 0)

- `/`, `/es/`, `/ja/`, `/ko/`, `/pt-br/` — localized landing, each with its own `<html lang>`.
- `/spike/` — Phase 0.7 evidence: real data-repo catalog validated with Zod at
  build time + a VRM avatar rendering in a `client:visible` React island.
- `e2e/` — Playwright DECISION GATE test (`npx playwright test`): island
  hydration + real framebuffer pixels.
- Every page auto-emits `page_view`; interactive elements must carry
  `data-metric` (taxonomy in `packages/analytics/src/events.ts`).

## A community's public rules (condiciones/w3)

Anybody, with no session, reads the rules a community published for its worlds:

- Page: `/es/communities/<id>/normas/` (also `/communities/…`, `/ja/…`, `/ko/…`, `/pt-br/…`),
  linked from the community's page. Numinia's Terms of Use come first, then each point
  (title, text, mandatory or optional, rule or data), then the versions published with
  their dates. A community that published nothing says Numinia's rules are the only ones.
- JSON: `GET /api/community-terms?comunidad=<id>` (`lib/public-terms.ts`, schema
  `community-terms-public@1`): `current` is a `condiciones@1` layer (`capa`, `version`,
  `puntos`) plus `publishedAt`, and `history` lists `{ version, publishedAt }`. It is the
  reading for the AIs and for copying a community's rules into a world. Never who
  published, never the till account; cached 1 min in the browser, 5 at the edge.
- Only the register's published communities are public: any other id is a 404.
  The till answers `AccountDesk.publicTerms(communityId)`, derived from the id.

## The price room and the till's desk (MIS-184)

`/lap/admin/prices/` (Oracles only) reads the till's tariff, checks a draft
and schedules a dated version through the till's RPC entrypoint
`OracleDesk`, bound in the root `wrangler.jsonc` as `TILL_ORACLE` (service
`numinia-till`).

Trust model: an RPC entrypoint has no URL — only a Worker that declares a
binding to it can call it, so the desk stays unreachable from the internet
even if the till gets a route. `pages/api/admin/prices.ts` checks the
Oracle's session first (our own signed cookie, permission
`edit-system-config`, which only the Oracle rank holds) and passes the
session's wallet, lowercased, as `by`. The till trusts its one bound caller
and re-validates every field; neither side trusts a browser
(`lib/prices-source.ts` checks what the browser sends and what the till
answers). Under `DATA_SOURCE=fixture` (CI, acceptance, screenshots) the desk
is an in-memory fake seeded from `fixtures/prices/desk.json`
(`lib/prices-fixture.ts`); the till holds the real rules.
