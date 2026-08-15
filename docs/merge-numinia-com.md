# Merge plan — numinia-platform → numinia.com

> **For humans.** The adaptation checklist so that replacing numinia.com's current site with this platform breaks nothing important.
>
> **Epistemic value.** Resolves what runs at numinia.com today (repo, host, URLs) and exactly what must change here before the swap.
> **Pragmatic value.** Deploy-day work becomes a checklist, not archaeology; every risk has an owner line before it can bite.
> **In the system.** Observes: numengames/numinia-web (read-only), Cloudflare, D16/D18. Regulates: deploy-day execution. Coupled to: docs/remote-checklist.md, MISSION-007, key-rotation audit (NEXT #4).
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

## What runs at numinia.com today (surveyed 2026-08-15)

- **Repo**: `numengames/numinia-web` — Astro 5 + React 19 + Tailwind 4, a single
  chapter one-pager (I–IV), ES default (`/` = Spanish, `/en/` = English).
- **Host**: **Cloudflare Workers static assets** (`wrangler.jsonc`): `dist/`
  served with `404-page` handling, custom domains `numinia.com` + `www.numinia.com`.
- **Deploy**: manual — `astro build && wrangler deploy` from a workstation.
  No CI, no secrets in repo.
- Content and art from that repo are now CANON here (MISSION-007):
  `apps/store/src/i18n/city-landing.ts` + `public/images/{art,seals}`.

## Decisions

- **D18 (Oracle, 2026-08-15): EN becomes the root locale at numinia.com.**
  `/` serves English; Spanish lives at `/es/`. Accepted SEO cost, mitigated by
  the 301 map below.
- The platform replaces the one-pager entirely; its story survives as `/city/`
  (MISSION-007 already ships it, Khepri-dressed, content verbatim).

## Adaptation checklist (execute at merge, in order)

1. **Site URL**: `PUBLIC_SITE_URL=https://numinia.com` in the deploy env —
   canonicals, hreflang, sitemap, robots all derive from it (already true).
2. **Wrangler config**: add `wrangler.jsonc` here (assets = `apps/store/dist/client`,
   the two custom domains, `404-page`). Inert until deploy day — no deploy
   without the Oracle's order (standing).
3. **Redirect map** (old numinia.com URLs → platform), as static stubs or
   Workers-assets `_redirects` (verify support at merge; our stub pattern from
   MISSION-007 works on any static host):
   - `/en/` → `/` (301; EN moves to root per D18)
   - `/` anchors (`#semilla` `#ciudad` `#identidad` `#vida` `#juego`) — content
     now at `/city/#…`; anchors can't 301 server-side. Mitigation: `/` (platform
     landing) links La Ciudad above the fold; `/es/` likewise.
4. ~~**API routes**: not in the first merge~~ **RESOLVED 2026-08-15**: the
   `@astrojs/cloudflare` adapter is wired behind `DEPLOY_TARGET=cloudflare`
   (Node stays the default for local dev, CI and e2e), so `/api/auth/*` and
   `/api/admin/*` ship with the site. Three changes made it portable:
   committed content is now IMPORTED instead of read with `node:fs` (the
   prerender runs inside a Worker), `src/lib/env.ts` names its keys one by one
   so bundlers can replace them, and only NON-SECRET build vars are injected
   via `vite.define` — a secret there would be compiled into the bundle.
   Validated with `npx wrangler deploy --dry-run -c wrangler.jsonc`:
   2000 assets, 296 KB gzipped, both custom domains, correct vars.
   **Pending at deploy:** the adapter declares a `SESSION` KV binding (Astro
   sessions); we do not use them, but the deploy may ask for a KV namespace —
   create one or disable sessions. And the secrets go in with
   `wrangler secret put` (never in the config file).
5. **thirdweb allowed domains**: already include numinia.com/www — verified
   during MISSION-002 setup.
6. **CI deploy**: GitHub Action with `CLOUDFLARE_API_TOKEN` — token creation
   belongs to the key-rotation audit (NEXT #4); never a personal token.
7. **Host canonicalization**: keep both domains routed; pick apex as canonical
   and 301 `www` → apex at the Worker.
8. **After the swap**: archive `numengames/numinia-web` (read-only, README
   pointer to this repo), same treatment as D15's legacy remote.
9. **Watchlist for the first 48h**: Search Console coverage (ES URLs
   re-indexing under `/es/`), 404 log via Workers analytics, OG previews.

## Explicitly NOT broken by the merge

Asset catalog (R2/data-repo URLs are absolute), the store at numinia.store
(separate deployment decision, D3-bis), analytics (not yet deployed, D12),
fonts/licensing (self-hosted OFL), CC0 licensing of art (same house).
