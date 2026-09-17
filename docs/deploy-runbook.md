# Deploy Runbook — how numinia.com ships

> **For humans.** The single source on how the platform reaches numinia.com: what triggers a publish, what can stop it, how to verify from outside (including from a country that blocks Cloudflare on match days), how to roll back.
>
> **Epistemic value.** Resolves "how does publishing work and what do I do when it breaks" without archaeology through config files.
> **Pragmatic value.** Deploy is routine; this file keeps it routine. Any deviation starts here.
> **In the system.** Observes: Cloudflare Workers Builds state. Regulates: every publication. Coupled to: `wrangler.jsonc`, `scripts/build-cloudflare.mjs`, `.github/workflows/exports.yml`, docs/status.md.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

## The flow (2026-09-17, Oracle: "Cloudflare lo captura directamente")

```
push to main ──► Cloudflare Workers Builds ──► npm ci ──► npx wrangler deploy
                                                            │
                                    wrangler runs build.command first:
                                    scripts/build-cloudflare.mjs
                                      1 env (public values, in the script)
                                      2 fetch the lore from numinia-nwos
                                      3 turbo build @numinia/store
                                      4 seal /version.json with the SHA
```

- **Auto, no token, no button.** The Worker `numinia-web` is connected to
  this repository in the Cloudflare panel (Settings → Builds). Every push
  to `main` builds and publishes *inside Cloudflare*. GitHub holds no
  Cloudflare credential. Same model as numinia.org and numen.games.
- **The build lives in the repository**, in `wrangler.jsonc` →
  `build.command`. The panel's "Build command" field stays **empty** —
  on 2026-09-17 that field refused to save three times on numen.games and
  kept running `npm ci` on a pnpm repo; what is in the repo is versioned,
  what is in a panel is not.
- **CI (`ci.yml`) is a gate, not the deploy.** It builds hermetically
  (`DATA_SOURCE=fixture`, never the network) and runs the acceptance
  suites. Branch protection requires its `build` check before a merge, and
  Cloudflare only publishes `main`, so nothing red reaches production — but
  CI going green is not what publishes. The Workers Builds check on the
  merge commit is.
- **Branches build too.** Cloudflare builds every pushed branch; only
  `main` reaches the custom domains. A red Workers Builds check on a PR
  means the production build would fail: fix it before merging.

## What ships

- One Worker: **`numinia-web`** (name = repo name; the one-Worker policy).
  Custom domains `numinia.com` + `www.numinia.com` live on it.
- Build: `scripts/build-cloudflare.mjs` — the **real catalog** and the
  **real manual** (never fixtures), sealed with the commit.
- Deploy: `npx wrangler deploy` from the repo root (`wrangler.jsonc`).

## Credentials inventory

| Where | Name | What |
| --- | --- | --- |
| Worker build variable | `PUBLIC_THIRDWEB_CLIENT_ID` | The login island's public client id, per environment; ships in the HTML. Set once in Settings → Builds → *Build variables and secrets*. Empty ⇒ the build **refuses to run** rather than ship a broken login |
| Worker secret | `THIRDWEB_SECRET_KEY` | `wrangler secret put`, set 2026-08-15 |
| Worker secret | `AUTH_SESSION_SECRET` | idem |
| Worker secret | `ADMIN_WALLET_ADDRESSES` | idem — the Oracle allowlist |

Nothing in GitHub. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and
`LORE_TOKEN` were the retired workflow's; delete them from the repository
settings, nothing reads them.

## The free editions (PDF + EPUB)

The Workers Builds image has no Chromium, and the PDF needs one. The
editions are baked on a GitHub runner by `exports.yml` (weekly, or *Run
workflow*) and **committed** to `apps/store/public/descargas/`; the next
Cloudflare deploy serves them as statics. `exports.yml` opens a PR with the
two files, never pushes to `main`. When the manual changes in `numinia-nwos
lore/game/`, run it.

## Verify — from outside, always

```
curl -s https://numinia.com/version.json | jq -r .commit
gh api repos/numengames/numinia-web/commits/main --jq .sha
```

Equal → published. Different → find the Workers Builds check on the `main`
commit (`gh api repos/numengames/numinia-web/commits/<sha>/check-runs`) and
open its `details_url`: the log is in the Cloudflare panel, not in GitHub.
Known failure modes:

| Symptom | Cause | Fix |
|---|---|---|
| Build fails in 0 s, log says `npm ci` on a lockfile that is not npm's | the panel's Build command is set | empty it; the build is `wrangler.jsonc`'s |
| `parseEnv` stack trace in `@numinia/store#build` | a build variable is missing | `PUBLIC_THIRDWEB_CLIENT_ID` in the panel; everything else is in the script |
| `fetch-lore: … → HTTP 4xx` | the archive moved the lore or is unreachable | check `numinia-nwos lore/`; the script fails loud on purpose |
| No Workers Builds check on the commit at all | the Git connection dropped ("disconnected from your Git account" banner) | reconnect in Settings → Builds; nothing else warns |

## Rollback (instant, no build)

Cloudflare dashboard → Workers → `numinia-web` → Deployments → pick a
version → Rollback. (`rollback.yml` in Actions still exists; it needs the
retired Cloudflare token, so it will not run until that decision is
revisited — use the dashboard.)

⚠️ A rollback only buys time: `main` still holds the bad code, and the next
push ships it again. Revert or fix on `main` right after rolling back.

## Verifying from Spain on a match day

The Oracle's ISPs (fixed AND mobile) block Cloudflare edge IP ranges during
LaLiga hours. **Local curl/browser lies; never diagnose an outage from this
network.** Verify externally:

```
curl "https://api.hackertarget.com/httpheaders/?q=https://numinia.com"   # headers
curl -o shot.png "https://image.thum.io/get/width/1280/https://numinia.com"  # screenshot
```

(check-host.net is itself behind Cloudflare — useless during blocks.)

## Local build fallback (if Cloudflare Builds is down)

```
PUBLIC_THIRDWEB_CLIENT_ID=<the public id> npx wrangler deploy      # needs `npx wrangler login` first
```

`wrangler deploy` runs `build-cloudflare.mjs` itself; `/version.json` will
say `dev`, which is exactly what marks a hand deploy.

## History

- 2026-08-15 night: first deploy (manual button). Auto-deploy on green CI
  via `deploy.yml` adopted the same night.
- 2026-09-17: `deploy.yml` retired after failing for a day on a stale
  `LORE_TOKEN` (a public read that needed no token). Publication moves to
  Cloudflare Workers Builds, the build into the repository, the editions
  into `exports.yml`.
